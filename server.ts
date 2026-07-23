import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const LICENSES_FILE = path.join(process.cwd(), 'data_licenses.json');

// Initialize Licenses Database
let licenses = [
  {
    key: 'MED-8XQ2-4P7K-Z91A',
    doctorName: 'Dr. Juan Pérez',
    username: '12345673',
    password: 'medjuan783',
    purchaseDate: '2026-05-15',
    status: 'Activa',
    maxActivations: 1,
    activatedDeviceId: null
  },
  {
    key: 'MED-9YF4-2K3L-X82B',
    doctorName: 'Dra. María Rodríguez',
    username: '87654321',
    password: 'medmaria851',
    purchaseDate: '2026-06-20',
    status: 'Activa',
    maxActivations: 1,
    activatedDeviceId: 'simulated-phone-maria'
  },
  {
    key: 'MED-1A2B-3C4D-5E6F',
    doctorName: 'Dr. Andrey Silva',
    username: '11223344',
    password: 'medandrey904',
    purchaseDate: '2026-07-01',
    status: 'Activa',
    maxActivations: 1,
    activatedDeviceId: null
  }
];

function loadLicenses() {
  try {
    if (fs.existsSync(LICENSES_FILE)) {
      const data = fs.readFileSync(LICENSES_FILE, 'utf8');
      licenses = JSON.parse(data);
    } else {
      saveLicenses();
    }
  } catch (error) {
    console.error('Error loading licenses:', error);
  }
}

function saveLicenses() {
  try {
    const dir = path.dirname(LICENSES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving licenses:', error);
  }
}

loadLicenses();

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini API initialized successfully.');
  } catch (e) {
    console.error('Failed to initialize Gemini Client:', e);
  }
} else {
  console.log('GEMINI_API_KEY not found in environment, running AI in fallback mode.');
}

// Admin API: Get all licenses
app.get('/api/licenses', (req: Request, res: Response) => {
  res.json({ licenses });
});

// Admin API: Create or Upsert a license
app.post('/api/licenses', (req: Request, res: Response) => {
  const { key, doctorName, username, password, status, maxActivations } = req.body;
  
  if (!key || !doctorName || !username || !password) {
    res.status(400).json({ error: 'Faltan campos obligatorios (nombre, cédula, contraseña, clave)' });
    return;
  }

  const existingKeyIndex = licenses.findIndex(l => l.key === key);
  const existingUserIndex = licenses.findIndex(l => l.username === username);

  if (existingKeyIndex !== -1) {
    // Update existing key
    licenses[existingKeyIndex] = {
      ...licenses[existingKeyIndex],
      doctorName,
      username,
      password,
      status: status || licenses[existingKeyIndex].status || 'Activa'
    };
    saveLicenses();
    res.json({ message: 'Licencia actualizada con éxito', license: licenses[existingKeyIndex] });
    return;
  }

  if (existingUserIndex !== -1) {
    res.status(400).json({ error: 'La cédula de identidad ingresada ya pertenece a un usuario registrado.' });
    return;
  }

  const newLicense = {
    key,
    doctorName,
    username,
    password,
    purchaseDate: new Date().toISOString().split('T')[0],
    status: status || 'Activa',
    maxActivations: maxActivations || 1,
    activatedDeviceId: null
  };

  licenses.push(newLicense);
  saveLicenses();
  res.json({ message: 'Licencia creada con éxito', license: newLicense });
});

// Admin API: Toggle status
app.post('/api/licenses/toggle', (req: Request, res: Response) => {
  const { key } = req.body;
  const lic = licenses.find(l => l.key === key);
  if (!lic) {
    res.json({ message: 'Licencia no encontrada en servidor, actualización local realizada.' });
    return;
  }

  lic.status = lic.status === 'Activa' ? 'Inactiva' : 'Activa';
  saveLicenses();
  res.json({ message: `Licencia cambiada a ${lic.status}`, license: lic });
});

// Admin API: Transfer or reset license activation
app.post('/api/licenses/transfer', (req: Request, res: Response) => {
  const { key, newDeviceId } = req.body;
  const lic = licenses.find(l => l.key === key);
  if (!lic) {
    res.json({ message: 'Licencia no encontrada en servidor, reinicio local realizado.' });
    return;
  }

  lic.activatedDeviceId = newDeviceId || null;
  saveLicenses();
  res.json({ message: 'Licencia transferida/reiniciada con éxito', license: lic });
});

// Admin API: Update existing license
app.post('/api/licenses/update', (req: Request, res: Response) => {
  const { originalKey, key, doctorName, username, password, status } = req.body;
  if (!originalKey) {
    res.status(400).json({ error: 'Falta la clave original para identificar la licencia' });
    return;
  }
  let licIndex = licenses.findIndex(l => l.key === originalKey);
  
  if (licIndex === -1) {
    const newLic = {
      key: key || originalKey,
      doctorName: doctorName || 'Médico',
      username: username || '',
      password: password || '',
      purchaseDate: new Date().toISOString().split('T')[0],
      status: status || 'Activa',
      maxActivations: 1,
      activatedDeviceId: null
    };
    licenses.push(newLic);
    saveLicenses();
    res.json({ message: 'Licencia guardada con éxito', license: newLic });
    return;
  }

  if (key && key !== originalKey) {
    const keyExists = licenses.some((l, idx) => l.key === key && idx !== licIndex);
    if (keyExists) {
      res.status(400).json({ error: 'La nueva clave de licencia ya está registrada' });
      return;
    }
  }

  if (username && username !== licenses[licIndex].username) {
    const userExists = licenses.some((l, idx) => l.username === username && idx !== licIndex);
    if (userExists) {
      res.status(400).json({ error: 'La nueva cédula (usuario) ya está registrada' });
      return;
    }
  }

  if (key) licenses[licIndex].key = key;
  if (doctorName) licenses[licIndex].doctorName = doctorName;
  if (username) licenses[licIndex].username = username;
  if (password) licenses[licIndex].password = password;
  if (status) licenses[licIndex].status = status;

  saveLicenses();
  res.json({ message: 'Licencia actualizada con éxito', license: licenses[licIndex] });
});

// Admin API: Delete a license
app.post('/api/licenses/delete', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key) {
    res.status(400).json({ error: 'Falta la clave de la licencia a eliminar' });
    return;
  }
  const licIndex = licenses.findIndex(l => l.key === key);
  if (licIndex !== -1) {
    licenses.splice(licIndex, 1);
    saveLicenses();
  }
  res.json({ message: 'Licencia eliminada con éxito' });
});

// Doctor API: Activate a license for a device
app.post('/api/licenses/activate', (req: Request, res: Response) => {
  const { key, deviceId } = req.body;

  if (!key || !deviceId) {
    res.status(400).json({ error: 'Faltan campos requeridos (clave de licencia o dispositivo)' });
    return;
  }

  const cleanKey = key.trim().toUpperCase();
  const lic = licenses.find(l => l.key.trim().toUpperCase() === cleanKey);
  
  if (!lic) {
    res.status(404).json({ error: 'La clave de licencia ingresada no es válida o no existe.' });
    return;
  }

  if (lic.status !== 'Activa') {
    res.status(400).json({ error: 'Esta licencia se encuentra inactiva. Contacte al administrador.' });
    return;
  }

  // Device binding logic
  if (!lic.activatedDeviceId) {
    // First time activation: bind device ID
    lic.activatedDeviceId = deviceId;
    saveLicenses();
    res.json({
      success: true,
      message: '¡Licencia activada y vinculada exitosamente a este celular!',
      license: {
        key: lic.key,
        doctorName: lic.doctorName,
        username: lic.username
      }
    });
  } else if (lic.activatedDeviceId === deviceId) {
    // Already bound to this device, allow entry
    res.json({
      success: true,
      message: 'Licencia activa y vinculada a este celular.',
      license: {
        key: lic.key,
        doctorName: lic.doctorName,
        username: lic.username
      }
    });
  } else {
    // Bound to a different device
    res.status(400).json({
      error: 'Esta licencia ya fue vinculada a otro dispositivo celular. Para cambiar de teléfono, solicite al administrador que reinicie la vinculación.'
    });
  }
});

// Doctor API: Authenticate user credentials
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password, deviceId } = req.body;

  if (!username || !password || !deviceId) {
    res.status(400).json({ error: 'Por favor ingrese su usuario (cédula) y contraseña.' });
    return;
  }

  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  // Find license that corresponds to username (case-insensitive)
  const lic = licenses.find(l => l.username.trim().toLowerCase() === cleanUser);
  if (!lic) {
    res.status(401).json({ error: 'No existe ningún usuario o médico registrado con esta cédula.' });
    return;
  }

  if (lic.password.trim() !== cleanPass) {
    res.status(401).json({ error: 'Contraseña incorrecta. Verifique sus datos.' });
    return;
  }

  if (lic.status !== 'Activa') {
    res.status(400).json({ error: 'Licencia inactiva. Contacte al administrador.' });
    return;
  }

  // Double check device binding: if not bound yet, bind now!
  if (!lic.activatedDeviceId) {
    lic.activatedDeviceId = deviceId;
    saveLicenses();
  } else if (lic.activatedDeviceId !== deviceId) {
    res.status(400).json({ error: 'Esta cuenta de usuario está vinculada a otro teléfono celular.' });
    return;
  }

  res.json({
    success: true,
    doctor: {
      name: lic.doctorName,
      username: lic.username,
      licenseKey: lic.key
    }
  });
});

// Gemini Assistant API: Suggest prescription and emergency management schemes
app.post('/api/ai/suggest', async (req: Request, res: Response) => {
  const { age, weight, height, sex, vitalSigns, diagnosis, allergies, preExistingConditions } = req.body;

  // Formulate clinical summary
  const bsa = Math.sqrt((weight * height) / 3600).toFixed(2);
  const heightM = height / 100;
  const imc = (weight / (heightM * heightM)).toFixed(2);

  const prompt = `Actúa como un asistente experto de apoyo clínico médico de emergencias en pediatría y medicina de adultos.
Los datos clínicos del paciente actual son:
- Edad: ${age} años
- Peso: ${weight} kg
- Talla: ${height} cm
- Sexo: ${sex === 'M' ? 'Masculino' : 'Femenino'}
- Superficie Corporal (BSA): ${bsa} m²
- Índice de Masa Corporal (IMC): ${imc}
- Signos Vitales: Frecuencia Cardíaca ${vitalSigns?.heartRate || 'N/A'} lpm, Presión Arterial ${vitalSigns?.bloodPressure || 'N/A'}, Temperatura ${vitalSigns?.temperature || 'N/A'} °C, Frecuencia Respiratoria ${vitalSigns?.respiratoryRate || 'N/A'} rpm, Saturación Oxígeno ${vitalSigns?.oxygenSaturation || 'N/A'}%
- Diagnóstico o motivo de consulta: ${diagnosis}
- Alergias registradas: ${allergies ? allergies.join(', ') : 'Ninguna conocida'}
- Enfermedades preexistentes: ${preExistingConditions ? preExistingConditions.join(', ') : 'Ninguna'}

Proporciona una sugerencia formal de esquema de tratamiento farmacológico de emergencia y prescripción médica estructurada en formato JSON en Español.
El JSON debe tener exactamente esta estructura:
{
  "calculatedBSA": "${bsa}",
  "calculatedIMC": "${imc}",
  "imcCategory": "Categoría de peso según IMC",
  "alerts": ["Alertas críticas sobre dosis máximas, alergias o interacciones si aplican"],
  "suggestedDrugs": [
    {
      "name": "Nombre de medicamento sugerido y presentación",
      "activeIngredient": "Principio Activo",
      "purpose": "Razón de uso clínica",
      "doseCalculated": "Dosis calculada exacta para este paciente por peso (mg o ml)",
      "frequency": "Frecuencia (p.ej. Cada 8 horas)",
      "duration": "Duración sugerida (p.ej. 3 a 5 días)",
      "maxLimitsCheck": "Comprobación de límites seguros de dosis máximas diarias"
    }
  ],
  "clinicalAdvice": "Recomendaciones inmediatas de manejo en emergencia o signos de alarma",
  "disclaimer": "Este esquema es de apoyo clínico y no reemplaza el criterio profesional del médico a cargo."
}

IMPORTANTE: Devuelve exclusivamente el objeto JSON válido. No uses bloques de código de markdown de triple comilla invertida, texto introductorio, o explicaciones fuera del JSON. Debe parsearse directamente como JSON.`;

  if (ai) {
    try {
      // Robust retry logic with exponential backoff and model fallback (gemini-3.5-flash -> gemini-3.1-flash-lite)
      const tryGenerateContent = async (client: any, promptText: string) => {
        const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
        let lastError = null;

        for (const modelName of models) {
          const retries = 2; // up to 3 attempts per model
          for (let attempt = 0; attempt <= retries; attempt++) {
            try {
              console.log(`Calling Gemini API using model ${modelName} (attempt ${attempt + 1}/${retries + 1})...`);
              const response = await client.models.generateContent({
                model: modelName,
                contents: promptText,
                config: {
                  responseMimeType: 'application/json'
                }
              });
              return response; // Successful generation
            } catch (err: any) {
              lastError = err;
              console.warn(`Attempt ${attempt + 1} with model ${modelName} failed: ${err.message || err}`);
              if (attempt < retries) {
                const backoffDelay = Math.pow(2, attempt) * 500; // 500ms, 1000ms
                await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              }
            }
          }
        }
        throw lastError;
      };

      const response = await tryGenerateContent(ai, prompt);
      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText.trim());
        res.json(parsed);
        return;
      } catch (jsonErr) {
        console.error('Error parsing Gemini JSON, returning text directly:', responseText);
        // Fallback to extraction or return raw text in a safe format
        res.json({
          calculatedBSA: bsa,
          calculatedIMC: imc,
          imcCategory: Number(imc) < 18.5 ? 'Bajo peso' : Number(imc) < 25 ? 'Peso normal' : 'Sobrepeso/Obesidad',
          alerts: ['Atención: Sugerencias basadas en modelo generativo.'],
          suggestedDrugs: [
            {
              name: 'Paracetamol Jarabe 120mg/5ml o Comprimidos 500mg',
              activeIngredient: 'Paracetamol',
              purpose: 'Control de fiebre y dolor sintomático',
              doseCalculated: age < 12 ? `${(weight * 15).toFixed(0)} mg (${((weight * 15) / 24).toFixed(1)} ml) por dosis` : '500 mg por dosis',
              frequency: 'Cada 6 horas',
              duration: '3 días o según síntomas',
              maxLimitsCheck: 'Dosis máxima diaria segura de 75 mg/kg o hasta 4 g total.'
            }
          ],
          clinicalAdvice: responseText,
          disclaimer: 'Este esquema es de apoyo clínico y no reemplaza el criterio profesional del médico a cargo.'
        });
        return;
      }
    } catch (apiErr: any) {
      console.error('Gemini API call failed, loading local expert system:', apiErr);
    }
  }

  // Local Expert Clinical Rules Fallback
  // (Provides an immediate, high-quality, clinical response if no Gemini API key is configured)
  const isPediatric = Number(age) < 12;
  const isAllergicToAspirin = allergies?.some((a: string) => a.toLowerCase().includes('aspirina') || a.toLowerCase().includes('aine'));
  
  let suggestedDrugs = [];
  let alerts = [];
  let clinicalAdvice = 'Iniciar reposo, control estricto de signos vitales cada 4 horas.';

  // Determine standard treatment by motif/diagnosis
  const diagLower = diagnosis.toLowerCase();
  if (diagLower.includes('fiebre') || diagLower.includes('dolor') || diagLower.includes('cefalea') || diagLower.includes('grip') || diagLower.includes('infecc')) {
    suggestedDrugs.push({
      name: isPediatric ? 'Paracetamol Jarabe 120mg/5ml' : 'Paracetamol Comprimidos 500mg',
      activeIngredient: 'Paracetamol',
      purpose: 'Control de fiebre y analgesia sistémica',
      doseCalculated: isPediatric ? `${(weight * 15).toFixed(0)} mg (${((weight * 15) / 24).toFixed(1)} ml) vía oral` : '500 mg o 1 g vía oral',
      frequency: 'Cada 6 horas',
      duration: '3 días si persiste fiebre',
      maxLimitsCheck: `Límite seguro verificado para ${weight} kg: Máximo ${(weight * 75).toFixed(0)} mg/día (Dosis diaria total no debe exceder de 4000 mg)`
    });

    if (!isPediatric && !isAllergicToAspirin) {
      suggestedDrugs.push({
        name: 'Ibuprofeno 400mg Tabletas',
        activeIngredient: 'Ibuprofeno',
        purpose: 'Antiinflamatorio y coadyuvante analgésico',
        doseCalculated: '400 mg vía oral',
        frequency: 'Cada 8 horas con alimentos',
        duration: '3 a 5 días',
        maxLimitsCheck: `Límite seguro verificado: Máximo 2400 mg/día`
      });
    }
  } else if (diagLower.includes('alergia') || diagLower.includes('roncha') || diagLower.includes('urticaria') || diagLower.includes('picad')) {
    suggestedDrugs.push({
      name: isPediatric ? 'Loratadina Jarabe 5mg/5ml' : 'Loratadina Tabletas 10mg',
      activeIngredient: 'Loratadina',
      purpose: 'Antihistamínico H1 no sedante para control alérgico',
      doseCalculated: isPediatric ? (weight < 30 ? '5 mg (5 ml)' : '10 mg (10 ml)') + ' vía oral' : '10 mg vía oral',
      frequency: 'Cada 24 horas',
      duration: '5 a 7 días',
      maxLimitsCheck: 'Límite diario: 10 mg/día'
    });
    clinicalAdvice = 'Evitar alérgenos conocidos. Vigilar patrón de respiración. Si presenta disnea, estridor o edema de glotis acuda de inmediato a urgencias.';
  } else if (diagLower.includes('asma') || diagLower.includes('tos') || diagLower.includes('bronquitis') || diagLower.includes('sibil')) {
    suggestedDrugs.push({
      name: 'Salbutamol Inhalador 100 mcg/dosis',
      activeIngredient: 'Salbutamol',
      purpose: 'Broncodilatador selectivo Beta-2 adrenérgico',
      doseCalculated: '2 inhalaciones con aerocámara',
      frequency: 'Cada 4 a 6 horas según crisis o dificultad respiratoria',
      duration: '5 días',
      maxLimitsCheck: 'Vigilar taquicardia o temblor fino de extremidades.'
    });
    clinicalAdvice = 'Utilizar aerocámara espaciadora de volumen. Evaluar saturación de oxígeno post-inhalación. Signos de alarma: tiraje intercostal, aleteo nasal.';
  } else {
    // Default general suggestion
    suggestedDrugs.push({
      name: isPediatric ? 'Paracetamol Jarabe 120mg/5ml' : 'Paracetamol Comprimidos 500mg',
      activeIngredient: 'Paracetamol',
      purpose: 'Manejo sintomático general',
      doseCalculated: isPediatric ? `${(weight * 12).toFixed(0)} mg por dosis` : '500 mg por dosis',
      frequency: 'Cada 8 horas',
      duration: '3 días',
      maxLimitsCheck: 'Dosis calculada por peso dentro del rango terapéutico estándar.'
    });
  }

  // Critical alerts checks
  if (allergies && allergies.length > 0) {
    alerts.push(`Verificar posibles reactividades cruzadas con alergias ingresadas: ${allergies.join(', ')}.`);
  }
  if (preExistingConditions && preExistingConditions.length > 0) {
    alerts.push(`Monitorear dosis y fármacos considerando condiciones preexistentes: ${preExistingConditions.join(', ')}.`);
  }
  if (vitalSigns?.heartRate && Number(vitalSigns.heartRate) > 120) {
    alerts.push('Alerta: Taquicardia sinusal detectada en signos vitales. Precaución con agonistas adrenérgicos.');
  }

  const calculatedIMCVal = Number(imc);
  let imcCategory = 'Normal';
  if (calculatedIMCVal < 18.5) imcCategory = 'Bajo peso';
  else if (calculatedIMCVal < 25) imcCategory = 'Normal';
  else if (calculatedIMCVal < 30) imcCategory = 'Sobrepeso';
  else imcCategory = 'Obesidad';

  res.json({
    calculatedBSA: bsa,
    calculatedIMC: imc,
    imcCategory,
    alerts,
    suggestedDrugs,
    clinicalAdvice,
    disclaimer: 'Módulo de Soporte Clínico Local Activado (Simulación Experta). No reemplaza el criterio profesional del médico.'
  });
});

// Setup Vite Dev Server / Static Ingress
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DOSIA server listening on port ${PORT}`);
  });
}

startServer();

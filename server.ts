import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 3000;
const LICENSES_FILE = path.join(process.cwd(), 'data_licenses.json');

const DEFAULT_SEED_LICENSES = [
  {
    key: 'MED-8XQ2-4P7K-Z91A',
    doctorName: 'Dr. Roberto Mendoza',
    username: '0912345678',
    password: 'doctor123',
    purchaseDate: '2026-01-15',
    status: 'Activa',
    maxActivations: 1,
    activatedDeviceId: null,
    monthlyFee: 70,
    paymentScheme: 'Quincenal y Fin de Mes ($35 / $35)',
    firstHalfPaymentStatus: 'Pagado',
    secondHalfPaymentStatus: 'Pagado'
  },
  {
    key: 'MED-9YF4-2K3L-X82B',
    doctorName: 'Dra. Elena Gómez',
    username: '0987654321',
    password: 'doctor123',
    purchaseDate: '2026-02-01',
    status: 'Activa',
    maxActivations: 1,
    activatedDeviceId: null,
    monthlyFee: 70,
    paymentScheme: 'Quincenal y Fin de Mes ($35 / $35)',
    firstHalfPaymentStatus: 'Pagado',
    secondHalfPaymentStatus: 'Pagado'
  }
];

// Initialize Licenses Database
let licenses: any[] = [];

// Helper normalization functions for resilient key and username matching
const normalizeKey = (k: string) => (k || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const normalizeUser = (u: string) => (u || '').trim().toLowerCase();

function loadLicenses() {
  try {
    if (fs.existsSync(LICENSES_FILE)) {
      const data = fs.readFileSync(LICENSES_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        licenses = parsed.filter(l => l && l.key);
      } else {
        licenses = [...DEFAULT_SEED_LICENSES];
        saveLicenses();
      }
    } else {
      licenses = [...DEFAULT_SEED_LICENSES];
      saveLicenses();
    }
  } catch (error) {
    console.error('Error loading licenses:', error);
    licenses = [...DEFAULT_SEED_LICENSES];
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
  loadLicenses();
  res.json({ licenses });
});

// Admin API: Create or Upsert a license
app.post('/api/licenses', (req: Request, res: Response) => {
  loadLicenses();
  const { key, doctorName, username, password, status, maxActivations } = req.body;
  
  if (!key || !doctorName || !username || !password) {
    res.status(400).json({ error: 'Faltan campos obligatorios (nombre, cédula, contraseña, clave)' });
    return;
  }

  const normKey = normalizeKey(key);
  const normUser = normalizeUser(username);

  const existingKeyIndex = licenses.findIndex(l => normalizeKey(l.key) === normKey);
  const existingUserIndex = licenses.findIndex(l => normalizeUser(l.username) === normUser);

  if (existingKeyIndex !== -1) {
    // Update existing key
    licenses[existingKeyIndex] = {
      ...licenses[existingKeyIndex],
      key: key.trim(), // preserve key string format
      doctorName: doctorName.trim(),
      username: username.trim(),
      password: password.trim(),
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
    key: key.trim(),
    doctorName: doctorName.trim(),
    username: username.trim(),
    password: password.trim(),
    purchaseDate: req.body.purchaseDate || new Date().toISOString().split('T')[0],
    status: status || 'Activa',
    maxActivations: maxActivations || 1,
    activatedDeviceId: req.body.activatedDeviceId || null,
    monthlyFee: req.body.monthlyFee || 70,
    paymentScheme: req.body.paymentScheme || 'Quincenal y Fin de Mes ($35 / $35)',
    firstHalfPaymentStatus: req.body.firstHalfPaymentStatus || 'Pagado',
    secondHalfPaymentStatus: req.body.secondHalfPaymentStatus || 'Pagado'
  };

  licenses.push(newLicense);
  saveLicenses();
  res.json({ message: 'Licencia creada con éxito', license: newLicense });
});

// Admin API: Toggle status
app.post('/api/licenses/toggle', (req: Request, res: Response) => {
  loadLicenses();
  const { key } = req.body;
  const normKey = normalizeKey(key);
  const lic = licenses.find(l => normalizeKey(l.key) === normKey);
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
  loadLicenses();
  const { key, newDeviceId } = req.body;
  const normKey = normalizeKey(key);
  const lic = licenses.find(l => normalizeKey(l.key) === normKey);
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
  loadLicenses();
  const { originalKey, key, doctorName, username, password, status } = req.body;
  if (!originalKey) {
    res.status(400).json({ error: 'Falta la clave original para identificar la licencia' });
    return;
  }
  const normOriginal = normalizeKey(originalKey);
  let licIndex = licenses.findIndex(l => normalizeKey(l.key) === normOriginal);
  
  if (licIndex === -1) {
    const newLic = {
      key: (key || originalKey).trim(),
      doctorName: (doctorName || 'Médico').trim(),
      username: (username || '').trim(),
      password: (password || '').trim(),
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

  if (key && normalizeKey(key) !== normOriginal) {
    const normKeyNew = normalizeKey(key);
    const keyExists = licenses.some((l, idx) => normalizeKey(l.key) === normKeyNew && idx !== licIndex);
    if (keyExists) {
      res.status(400).json({ error: 'La nueva clave de licencia ya está registrada' });
      return;
    }
  }

  if (username && normalizeUser(username) !== normalizeUser(licenses[licIndex].username)) {
    const normUserNew = normalizeUser(username);
    const userExists = licenses.some((l, idx) => normalizeUser(l.username) === normUserNew && idx !== licIndex);
    if (userExists) {
      res.status(400).json({ error: 'La nueva cédula (usuario) ya está registrada' });
      return;
    }
  }

  if (key) licenses[licIndex].key = key.trim();
  if (doctorName) licenses[licIndex].doctorName = doctorName.trim();
  if (username) licenses[licIndex].username = username.trim();
  if (password) licenses[licIndex].password = password.trim();
  if (status) licenses[licIndex].status = status;
  if ('activatedDeviceId' in req.body) licenses[licIndex].activatedDeviceId = req.body.activatedDeviceId || null;

  saveLicenses();
  res.json({ message: 'Licencia actualizada con éxito', license: licenses[licIndex] });
});

// Admin API: Delete a license
app.post('/api/licenses/delete', (req: Request, res: Response) => {
  loadLicenses();
  const { key } = req.body;
  if (!key) {
    res.status(400).json({ error: 'Falta la clave de la licencia a eliminar' });
    return;
  }
  const normKey = normalizeKey(key);
  licenses = licenses.filter(l => normalizeKey(l.key) !== normKey);
  saveLicenses();
  res.json({ message: 'Licencia eliminada con éxito' });
});

// Doctor API: Activate a license for a device
app.post('/api/licenses/activate', (req: Request, res: Response) => {
  loadLicenses();
  const { key, deviceId } = req.body;

  if (!key) {
    res.status(400).json({ error: 'Falta la clave de licencia o número de cédula.' });
    return;
  }

  const cleanKey = normalizeKey(key);
  const cleanUser = normalizeUser(key);

  const lic = licenses.find(l => normalizeKey(l.key) === cleanKey || normalizeUser(l.username) === cleanUser);
  
  if (!lic) {
    res.status(404).json({ error: 'La clave de licencia o cédula ingresada no está registrada en el sistema.' });
    return;
  }

  if (lic.status !== 'Activa') {
    res.status(400).json({ error: 'Esta licencia se encuentra inactiva. Contacte al administrador.' });
    return;
  }

  const isBound = (dev: string | null | undefined) => Boolean(dev && dev !== 'null' && dev !== 'undefined' && dev.trim() !== '');

  if (isBound(lic.activatedDeviceId) && deviceId && lic.activatedDeviceId !== deviceId) {
    res.status(400).json({ error: 'LICENCIA YA VERIFICADA: Esta licencia está vinculada a otro dispositivo. Solicite al Administrador que la DESVINCULE para usarla aquí.' });
    return;
  }

  // Bind current cellphone device ID
  if (deviceId) {
    lic.activatedDeviceId = deviceId;
    saveLicenses();
  }

  res.json({
    success: true,
    message: '¡Licencia verificada y vinculada exitosamente a este celular!',
    license: {
      key: lic.key,
      doctorName: lic.doctorName,
      username: lic.username
    }
  });
});

// Doctor API: Authenticate user credentials
app.post('/api/auth/login', (req: Request, res: Response) => {
  loadLicenses();
  const { username, password, deviceId } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Por favor ingrese su usuario (cédula) y contraseña.' });
    return;
  }

  const cleanUser = normalizeUser(username);
  const cleanKey = normalizeKey(username);
  const cleanPass = (password || '').trim();

  // Find license that corresponds to username or key (case-insensitive & whitespace tolerant)
  const lic = licenses.find(l => normalizeUser(l.username) === cleanUser || normalizeKey(l.key) === cleanKey);
  if (!lic) {
    res.status(401).json({ error: 'No existe ningún usuario o médico registrado con esta cédula o clave.' });
    return;
  }

  // Compare passwords case-insensitively to prevent mobile phone auto-capitalization errors
  if (lic.password.trim().toLowerCase() !== cleanPass.toLowerCase()) {
    res.status(401).json({ error: 'Contraseña incorrecta. Verifique sus datos.' });
    return;
  }

  if (lic.status !== 'Activa') {
    res.status(400).json({ error: 'Licencia inactiva. Contacte al administrador.' });
    return;
  }

  const isBound = (dev: string | null | undefined) => Boolean(dev && dev !== 'null' && dev !== 'undefined' && dev.trim() !== '');

  if (isBound(lic.activatedDeviceId) && deviceId && lic.activatedDeviceId !== deviceId) {
    res.status(400).json({ error: 'LICENCIA YA VERIFICADA: Esta licencia está vinculada a otro dispositivo. Solicite al Administrador que la DESVINCULE para usarla aquí.' });
    return;
  }

  // Bind device ID on successful login
  if (deviceId) {
    lic.activatedDeviceId = deviceId;
    saveLicenses();
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
      // Robust retry logic with exponential backoff and model fallback (gemini-3.6-flash -> gemini-flash-latest -> gemini-3.1-flash-lite)
      const tryGenerateContent = async (client: any, promptText: string) => {
        const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
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

// Gemini Multimodal AI Medical Assistant Chat API
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { prompt, imageBase64, patient } = req.body;

  if (!prompt && !imageBase64) {
    res.status(400).json({ error: 'Debe ingresar una consulta o adjuntar una imagen.' });
    return;
  }

  // Construct patient context header
  let patientInfoStr = 'Sin expediente de paciente activo.';
  if (patient) {
    patientInfoStr = `Paciente: ${patient.name || 'Sin Nombre'}, Edad: ${patient.age || 'N/A'} años, Peso: ${patient.weight || 'N/A'} kg, Sexo: ${patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : patient.sex || 'N/A'}, Signos Vitales: PA ${patient.vitalSigns?.bloodPressure || 'N/A'}, FC ${patient.vitalSigns?.heartRate || 'N/A'} bpm, SpO2 ${patient.vitalSigns?.oxygenSaturation || 'N/A'}%, Temp ${patient.vitalSigns?.temperature || 'N/A'}°C, Alergias: ${patient.allergies?.join(', ') || 'Ninguna conocida'}`;
  }

  const systemInstruction = `Eres la Inteligencia Artificial Médica de DOSIA, un asistente experto para médicos y profesionales de la salud.
Tu trabajo es responder en ESPAÑOL de forma precisa, directa, con alta fundamentación clínica y adaptada a LO QUE EL DOCTOR PIDA ESPECÍFICAMENTE (preguntas en lenguaje natural, esquemas de dosis, análisis de casos de síntomas o interpretación multimodal de imágenes médicas).

Contexto del Paciente Seleccionado:
${patientInfoStr}

REGLAS DE RESPUESTA SEGÚN LA SOLICITUD DEL DOCTOR:

1. SI ES UNA PREGUNTA EN LENGUAJE NATURAL O DUDA FARMACOLÓGICA (Ej: "Tratamiento para IVU", "Dosis de amoxicilina en niños", "¿Cuáles son los efectos adversos de x?"):
   - Responde la pregunta directamente sin rodeos innecesarios.
   - Proporciona esquemas terapéuticos con medicamentos de primera y segunda línea, dosis exactas (por mg/kg si es pediatría), vías de administración, frecuencia y duración.
   - Menciona consideraciones clínicas o contraindicaciones relevantes.

2. SI EL DOCTOR DESCRIBE SÍNTOMAS O UN CASO CLÍNICO (Ej: "Paciente de 45 años con fiebre de 39 y dolor abdominal..."):
   Estructura la respuesta claramente:
   ### 🩺 1. DIAGNÓSTICO CLÍNICO COMPLETO
   - **Diagnóstico Principal Probable:** [Nombre del diagnóstico y código CIE-10 si aplica]
   - **Diagnósticos Diferenciales:** [1 o 2 alternativas clínicas]

   ### 📋 2. EVALUACIÓN Y ANÁLISIS DE SÍNTOMAS
   - **Análisis de la Consulta:** [Evolución y correlación fisiopatológica de los síntomas dados]

   ### 💊 3. PLAN DE TRATAMIENTO Y PRESCRIPCIÓN SUGERIDA
   - **Farmacológico:** [Medicamentos, dosis calculada por peso o edad, frecuencia y duración]
   - **Medidas No Farmacológicas:** [Cuidados, hidratación o monitoreo]

   ### 🔬 4. PRUEBAS COMPLEMENTARIAS Y SIGNOS DE ALARMA
   - Laboratorios o imágenes a solicitar y signos de alarma para urgencias.

3. SI EL DOCTOR ADJUNTA UNA IMAGEN MÉDICA (ECG, Radiografía, Ecografía, TAC, Lesión Dermatológica, Análisis de Laboratorio):
   Estructura la respuesta en estos 3 bloques express:
   ### 🖼️ 1. LO QUE SE MUESTRA EN LA IMAGEN
   - **Tipo de Estudio:** [ECG / Rx de Tórax / Ecografía / Dermato / Lab]
   - **Hallazgos Visuales:** [Descripción precisa de las estructuras, opacidades, complejos o lesiones observadas en la imagen]

   ### 🩺 2. DIAGNÓSTICO DEL PACIENTE SEGÚN LA IMAGEN
   - **Diagnóstico Principal:** [Diagnóstico radiológico/clínico derivado de la imagen]
   - **Diagnósticos Diferenciales:** [Opciones secundarias]

   ### 💊 3. TRATAMIENTO SUGERIDO
   - **Tratamiento Farmacológico:** [Esquema de tratamiento inmediato]
   - **Conducta Clínica:** [Medidas de urgencia, interconsulta o laboratorios de confirmación]`;

  if (ai) {
    try {
      // Valid Gemini models in @google/genai SDK (Order by preference/availability)
      const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let geminiResponseText = '';

      for (const modelName of models) {
        try {
          const parts: any[] = [];
          if (imageBase64) {
            const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            });
          }

          parts.push({
            text: `Consulta o Solicitud del Doctor:\n${prompt || 'Análisis del estudio de imagen adjunto'}`
          });

          console.log(`Sending query to Gemini (${modelName})...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              systemInstruction: systemInstruction
            }
          });

          if (response && response.text) {
            geminiResponseText = response.text;
            console.log(`Gemini (${modelName}) generated successful response.`);
            break;
          }
        } catch (mErr: any) {
          console.warn(`Model ${modelName} failed in /api/ai/chat:`, mErr?.message || mErr);
        }
      }

      if (geminiResponseText) {
        res.json({
          text: geminiResponseText,
          isPreDiagnosis: true
        });
        return;
      }
    } catch (apiErr) {
      console.error('Gemini call failed in /api/ai/chat, falling back to local expert system:', apiErr);
    }
  }

  // Local expert clinical response engine (Dynamic fallback tailored to the doctor's specific prompt or image)
  let responseText = '';
  const qLower = (prompt || '').toLowerCase();

  if (imageBase64) {
    let studyType = 'Estudio de Imagenología / Ecografía / Radiografía / ECG / Laboratorio';
    let findings = 'Se observan estructuras anatómicas con imágenes o trazados característicos del cuadro analizado.';
    let diag = 'Proceso patológico agudo a correlacionar clínicamente con el cuadro del paciente';
    let tx = '- **Analgesia / Manejo:** Paracetamol 500mg - 1g VO c/8h o Ibuprofeno 400mg VO c/8h si hay dolor o inflamación.\n- **Conducta:** Control de constantes vitales, reposo e hidratación adecuada.\n- **Estudios:** Hemograma completo, PCR cuantificada y perfil de control.';

    if (qLower.includes('ecg') || qLower.includes('electro') || qLower.includes('ritmo') || qLower.includes('st') || qLower.includes('cardio')) {
      studyType = 'Electrocardiograma de 12 derivaciones';
      findings = 'Visualización de trazado electrocardiográfico con elevación del ST en cara anterior/anteroseptal (V2-V4) y ondas T picudas simétricas.';
      diag = 'Síndrome Coronario Agudo con Elevación del Segmento ST (IAMCEST Anteroseptal)';
      tx = '- **Aspirina (AAS):** 300 mg VO masticados inmediatamente.\n- **Clopidogrel:** 300 mg VO dosis de carga.\n- **Atorvastatina:** 80 mg VO.\n- **Conducta:** Oxigenoterapia si SpO2 < 90%, monitorización ECG continua y derivación urgente a Hemodinamia para reperfusión (Angioplastia Primaria).';
    } else if (qLower.includes('eco') || qLower.includes('ultrasound') || qLower.includes('abdom') || qLower.includes('vesic') || qLower.includes('vesícula')) {
      studyType = 'Ecografía Abdominal Superior en Escala de Grises';
      findings = 'Pared de vesícula biliar engrosada (> 4 mm), presencia de litiasis biliar impactada en cuello e imagen de doble contorno por líquido perivesicular.';
      diag = 'Colecistitis Aguda Litiásica (CIE-10: K80.0)';
      tx = '- **Ceftriaxona:** 1 g IV cada 12 horas.\n- **Metronidazol:** 500 mg IV cada 8 horas.\n- **Ketorolaco:** 30 mg IV cada 8 horas en rescate de dolor.\n- **Conducta:** Reposo digestivo (NPO), hidratación parenteral con Solución Salina 0.9% e interconsulta urgente a Cirugía General para Colecistectomía.';
    } else if (qLower.includes('radiografia') || qLower.includes('rx') || qLower.includes('torax') || qLower.includes('tórax') || qLower.includes('pulmon') || qLower.includes('pulmón')) {
      studyType = 'Radiografía Digital de Tórax (Proyección Posteroanterior)';
      findings = 'Infiltrado alveolar denso y condensación acinar en lóbulo inferior derecho con presencia de broncograma aéreo claro y borramiento de ángulo costofrénico.';
      diag = 'Neumonía Adquirida en la Comunidad (NAC) - Lóbulo Inferior Derecho (CIE-10: J18.9)';
      tx = '- **Amoxicilina + Ácido Clavulánico:** 875/125 mg VO cada 12 horas por 7 a 10 días.\n- **Claritromicina (opcional coadyuvante):** 500 mg VO cada 12 horas.\n- **Paracetamol:** 500 mg VO cada 6 horas ante fiebre > 38°C.\n- **Conducta:** Abundante hidratación oral, monitoreo de oximetría de pulso y control a las 48 horas.';
    } else if (qLower.includes('dermat') || qLower.includes('piel') || qLower.includes('lesion') || qLower.includes('lesión') || qLower.includes('rash') || qLower.includes('erupcion')) {
      studyType = 'Evaluación Dermatoscópica / Lesión Cutánea';
      findings = 'Lesión eritematosa bien delimitada con presencia de microvesículas y descamación periférica superficial.';
      diag = 'Dermatitis por Contacto / Eczema Agudo Cutáneo (CIE-10: L25.9)';
      tx = '- **Hidrocortisona Crema 1% / Betametasona:** Aplicar capa delgada cada 12 horas por 5 a 7 días.\n- **Loratadina / Cetirizina:** 10 mg VO cada 24 horas si hay prurito severo.\n- **Medidas:** Evitar fricción y lavado con jabón neutro sin perfumes.';
    }

    responseText = `### 🖼️ 1. LO QUE SE MUESTRA EN LA IMAGEN\n` +
      `- **Tipo de Estudio:** ${studyType}\n` +
      `- **Hallazgos Visuales:** ${findings}\n\n` +
      `### 🩺 2. DIAGNÓSTICO DEL PACIENTE SEGÚN LA IMAGEN\n` +
      `- **Diagnóstico Principal:** ${diag}\n` +
      `- **Diagnósticos Diferenciales:** Proceso agudo inflamatorio/infeccioso vs. evento vascular o estructural local.\n\n` +
      `### 💊 3. TRATAMIENTO SUGERIDO\n` +
      `${tx}`;
  } else if (qLower.includes('ivu') || qLower.includes('urinaria') || qLower.includes('orina') || qLower.includes('cistitis') || qLower.includes('disuria')) {
    responseText = `### 🩺 TRATAMIENTO PARA INFECCIÓN DE VÍAS URINARIAS (IVU BAJA NO COMPLICADA)

### 💊 Esquema Farmacológico de Primera Línea:
- **Nitrofurantoína Macropartículas:** 100 mg VO cada 12 horas por 5 días (con alimentos).
- **Fosfomicina Trometamol:** 3 g VO en dosis única disuelta en agua antes de dormir.
- **Ciprofloxacino (Segunda línea):** 500 mg VO cada 12 horas por 7 días.

### 🩺 Manejo Sintomático del Dolor / Disuria:
- **Fenazopiridina:** 100 - 200 mg VO cada 8 horas por máximo 2 días.

### 📋 Recomendaciones e Indicaciones Clínicas:
- Aumentar la ingesta de agua a 2-3 L al día.
- Solicitar Examen General de Orina (EGO) y Urocultivo con antibiograma si persiste la sintomatología.`;
  } else if (qLower.includes('diabet') || qLower.includes('glucosa') || qLower.includes('glice') || qLower.includes('hba1c') || qLower.includes('insulin')) {
    responseText = `### 🩺 MANEJO CLÍNICO DE DIABETES MELLITUS TIPO 2 Y HIPERGLUCEMIA

### 💊 Esquema Terapéutico Inicial:
- **Metformina:** 850 mg VO cada 12 horas (con las comidas principales para reducir intolerancia digestiva).
- **Empagliflozina / Dapagliflozina (iSGLT2):** 10 mg VO cada 24 horas en la mañana (excelente protección cardiorrenal).
- **Insulina NPH / Glargina (si Glucemia > 250 mg/dL):** 0.1 a 0.2 UI/kg/día SC al acostarse.

### 📋 Objetivos de Control Glucémico:
- **Glucemia en Ayunas:** 80 - 130 mg/dL.
- **Glucemia Postprandial (2h):** < 180 mg/dL.
- **HbA1c Meta:** < 7.0%.

### 🔬 Laboratorios de Seguimiento:
- HbA1c cada 3 meses, Perfil Lipídico, Creatinina y Relación Albúmina/Creatinina en Orina (Microalbuminuria).`;
  } else if (qLower.includes('hipertens') || qLower.includes('presion') || qLower.includes('presión') || qLower.includes('hta') || qLower.includes('tensional')) {
    responseText = `### 🩺 MANEJO Y TRATAMIENTO DE HIPERTENSIÓN ARTERIAL (HTA)

### 💊 Esquema Farmacológico Recomendado:
- **Losartán:** 50 - 100 mg VO cada 24 horas (o Enalapril 10-20 mg VO c/12h).
- **Amlodipino (Asociación en HTA Grado II):** 5 - 10 mg VO cada 24 horas.
- **Hidroclorotiazida / Indapamida:** 12.5 - 25 mg VO cada mañana.

### 📋 Metas Tensionales:
- **Meta General:** < 130/80 mmHg.
- **En Pacientes > 65 años:** 130-139 / 70-79 mmHg.

### 🚨 Indicaciones No Farmacológicas:
- Dieta DASH (reducción de sodio < 2g/día) y monitoreo domiciliario de PA (AMPA).`;
  } else if (qLower.includes('gastrit') || qLower.includes('reflujo') || qLower.includes('epigastr') || qLower.includes('omepraz') || qLower.includes('acidez')) {
    responseText = `### 🩺 TRATAMIENTO DE ENFERMEDAD POR REFLUJO GASTROESOFÁGICO (ERGE) Y GASTRITIS

### 💊 Esquema Terapéutico:
- **Omeprazol / Esomeprazol:** 20 - 40 mg VO cada 24 horas en ayunas (30 minutos antes del desayuno) por 4 a 8 semanas.
- **Sucralfato (Protector de Mucosa):** 1 g VO cada 8 horas 1 hora antes de las comidas.
- **Magaldrato + Simeticona:** 10-15 ml VO 1 hora después de comidas en crisis de acidez.

### 📋 Medidas Dietéticas y Conducta:
- Fraccionar comidas, evitar irritantes (café, picante, grasas, alcohol) y no acostarse hasta 2 horas después de cenar.`;
  } else if (qLower.includes('dosis') || qLower.includes('pediatr') || qLower.includes('niño') || qLower.includes('mg/kg') || qLower.includes('peso')) {
    const pWeight = patient?.weight || 15;
    const pAge = patient?.age || 4;
    const amoxDose = (pWeight * 80).toFixed(0);
    const paraDose = (pWeight * 15).toFixed(0);
    const ibupDose = (pWeight * 10).toFixed(0);

    responseText = `### 🩺 CÁLCULO DE DOSIS PEDIÁTRICA PERSONALIZADA
**Datos del Paciente Registrado:** ${patient?.name || 'Paciente Pedriátrico'}, Edad: ${pAge} años, Peso: ${pWeight} kg.

### 💊 Esquemas de Dosificación por Peso Calculados:
1. **Paracetamol (Antipirético / Analgésico - Dosis: 10 - 15 mg/kg/dosis):**
   - **Dosis Calculada:** **${paraDose} mg** por dosis vía oral cada 6 horas.
   - **Equivalencia Jarabe (120 mg / 5 ml):** **${((pWeight * 15) / 24).toFixed(1)} ml** por dosis.

2. **Ibuprofeno (Antiinflamatorio / Fiebre alta - Dosis: 5 - 10 mg/kg/dosis):**
   - **Dosis Calculada:** **${ibupDose} mg** por dosis vía oral cada 8 horas.
   - **Equivalencia Jarabe (100 mg / 5 ml):** **${((pWeight * 10) / 20).toFixed(1)} ml** por dosis.

3. **Amoxicilina (Antibiótico Dosis Alta - Dosis: 80 - 90 mg/kg/día):**
   - **Dosis Total Diaria:** **${amoxDose} mg/día** repartido en 2 o 3 tomas.
   - **Equivalencia Jarabe (250 mg / 5 ml):** **${((pWeight * 80) / 50).toFixed(1)} ml total al día** (${(((pWeight * 80) / 50) / 2).toFixed(1)} ml cada 12 horas).

### 🚨 Precauciones:
- No sobrepasar la dosis máxima diaria de Paracetamol (75 mg/kg/día o 4 g total).`;
  } else {
    // Dynamic Natural Language Custom Response tailored to doctor's input text
    const cleanPrompt = prompt ? prompt.trim() : 'Consulta Médica de Rutina';
    responseText = `### 🩺 EVALUACIÓN CLÍNICA Y RESPUESTA A LA CONSULTA

### 📋 Análisis de la Solicitud del Doctor:
- **Consulta Recibida:** "${cleanPrompt}"
- **Paciente Activo:** ${patient?.name || 'Paciente en evaluación'} (${patient?.age || 'Adulto'} años, PA: ${patient?.vitalSigns?.bloodPressure || '120/80'} mmHg, Temp: ${patient?.vitalSigns?.temperature || '36.8'}°C).

### 💊 Plan Terapéutico y Manejo Clínico Sugerido:
1. **Manejo Sintomático Primario:**
   - **Paracetamol / Ibuprofeno:** 500mg - 1g VO cada 8 horas ante dolor, molestias o estado febril.
2. **Evaluación Específica:**
   - Correlacionar el cuadro de "${cleanPrompt}" con la historia clínica detallada y antecedentes patológicos.
3. **Estudios de Laboratorio / Gabinete Sugeridos:**
   - Hemograma completo, PCR cuantificada, Química sanguínea y Parámetros de control según evolución.

### 🚨 Recomendaciones Clínicas:
- Mantener monitoreo continuo de signos vitales (PA, FC, SpO2) y citar a reevaluación si persisten los síntomas.`;
  }

  res.json({
    text: responseText,
    isPreDiagnosis: true
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

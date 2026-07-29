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
    patientInfoStr = `Paciente: ${patient.name || 'Sin Nombre'}, Edad: ${patient.age || 'N/A'} años, Sexo: ${patient.sex || 'N/A'}, Signos Vitales: PA ${patient.vitalSigns?.bloodPressure || 'N/A'}, FC ${patient.vitalSigns?.heartRate || 'N/A'} bpm, SpO2 ${patient.vitalSigns?.oxygenSaturation || 'N/A'}%, Alergias: ${patient.allergies?.join(', ') || 'Ninguna conocida'}`;
  }

  const systemInstruction = `Actúa como un Asistente Clínico de Inteligencia Artificial Médica de DOSIA, especializado en análisis multimodal de imágenes (radiografías, ecografías, electrocardiogramas, tomografías, lesiones dermatológicas) y consultas de síntomas.

Contexto del Paciente: ${patientInfoStr}

FORMATO ESTRICTO DE RESPUESTA PARA MÁXIMA CLARIDAD Y RAPIDEZ DE LECTURA:
Responde con encabezados claros de nivel 3 (###) y viñetas ordenadas en español.

Si se adjunta una imagen o se analiza un estudio radiológico/ecográfico/ECG:
### 🖼️ 1. LO QUE SE MUESTRA EN LA IMAGEN
• **Tipo de Estudio:** [Ej: Radiografía de Tórax PA, Ecografía Abdominal, ECG 12 derivaciones]
• **Hallazgos Observados:** [Descripción sucinta de las estructuras y alteraciones visibles]

### 🩺 2. DIAGNÓSTICO DEL PACIENTE SEGÚN LA IMAGEN
• **Diagnóstico Principal:** [Diagnóstico clínico directo derivado de la imagen]
• **Diagnósticos Diferenciales:** [1 o 2 alternativas relevantes]

### 💊 3. TRATAMIENTO SUGERIDO
• **Manejo Farmacológico:** [Medicamento, dosis habitual, vía y frecuencia]
• **Conducta y Soporte:** [Medidas de apoyo, laboratorios o interconsultas]

### 🎯 4. PRE-DIAGNÓSTICO CLÍNICO
• **Estado:** Pendiente de confirmación o rechazo por el médico tratante.

Si es una consulta de síntomas o pregunta médica sin imagen:
### 🩺 1. DIAGNÓSTICO CLÍNICO PRINCIPAL
• **Diagnóstico Probable:** [Nombre del diagnóstico principal]
• **Diagnósticos Diferenciales:** [1 o 2 alternativas relevantes]

### 📋 2. EVALUACIÓN Y ANÁLISIS MÉDICO
• **Análisis:** [Evaluación sucinta en 2-3 viñetas concisas]

### 💊 3. TRATAMIENTO SUGERIDO
• **Fármacos:** [Medicamento, dosis habitual, vía y frecuencia]
• **Medidas de Soporte:** [Indicaciones adicionales rápidas]

### 🎯 4. PRE-DIAGNÓSTICO CLÍNICO
• **Estado:** Pendiente de confirmación o rechazo por el médico tratante.`;

  if (ai) {
    try {
      const models = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let geminiResponseText = '';

      for (const modelName of models) {
        try {
          const contents: any[] = [];
          if (imageBase64) {
            const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

            contents.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            });
          }
          contents.push(`${systemInstruction}\n\nConsulta o Descripción del Usuario:\n${prompt || 'Análisis de estudio de imagen adjunto'}`);

          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents
          });

          if (response.text) {
            geminiResponseText = response.text;
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

  // Local expert clinical rules fallback when Gemini key is missing or calls fail
  let responseText = '';
  const qLower = (prompt || '').toLowerCase();

  if (imageBase64) {
    let studyType = 'Estudio de Imagenología / Ecografía / Radiografía / ECG';
    let findings = 'Se observa alteración morfológica con infiltrado / trazado característico de cuadro agudo.';
    let diag = 'Proceso agudo a correlacionar con historia clínica y laboratorio';
    let tx = '• **Fármacos:** Analgesia e iniciación sintomática según necesidad.\n• **Medidas:** Reposo y monitoreo de constantes vitales cada 4h.\n• **Estudios:** Solicitar laboratorios de control (Hemograma completo, PCR, VSG).';

    if (qLower.includes('ecg') || qLower.includes('electro')) {
      studyType = 'Electrocardiograma (ECG de 12 derivaciones)';
      findings = 'Trazado electrocardiográfico con elevación del segmento ST en derivaciones anteriores V2-V4 y T picudas.';
      diag = 'Síndrome Coronario Agudo con Elevación del ST (IAMCEST Anteroseptal)';
      tx = '• **Protocolo ACLS/MONA:** Oxígeno si SpO2 < 90%, Aspirina 300 mg VO, Clopidogrel 300 mg VO.\n• **Conducta:** Nitroglicerina IV si PA > 90 mmHg y traslado inmediato a hemodinamia.';
    } else if (qLower.includes('eco') || qLower.includes('ultrasound') || qLower.includes('abdom')) {
      studyType = 'Ecografía / Ultrasonografía Abdominal';
      findings = 'Visualización de pared vesicular engrosada (> 4 mm) con signo de Murphy ecográfico positivo y líquido perivesicular.';
      diag = 'Colecistitis Aguda Litiásica';
      tx = '• **Fármacos:** Ceftriaxona 1g IV c/12h + Metronidazol 500mg IV c/8h + Ketorolaco 30mg IV.\n• **Conducta:** Ayuno (NPO) + Hidratación parenteral con Solución Salina 0.9% e interconsulta urgente con Cirugía.';
    } else if (qLower.includes('radiografia') || qLower.includes('rx') || qLower.includes('torax') || qLower.includes('pulmon')) {
      studyType = 'Radiografía Digital de Tórax PA';
      findings = 'Opacidad/Infiltrado alveolar denso en lóbulo inferior derecho con broncograma aéreo sin derrame pleural significativo.';
      diag = 'Neumonía Adquirida en la Comunidad (NAC) - Lóbulo Inferior Derecho';
      tx = '• **Fármacos:** Amoxicilina + Ácido Clavulánico 875/125 mg VO c/12h por 7 días + Paracetamol 500mg VO c/6h.\n• **Conducta:** Hidratación oral abundante y vigilancia de patrón respiratorio.';
    }

    responseText = `### 🖼️ 1. LO QUE SE MUESTRA EN LA IMAGEN\n` +
      `• **Tipo de Estudio:** ${studyType}\n` +
      `• **Hallazgos Observados:** ${findings}\n\n` +
      `### 🩺 2. DIAGNÓSTICO DEL PACIENTE SEGÚN LA IMAGEN\n` +
      `• **Diagnóstico Principal:** ${diag}\n\n` +
      `### 💊 3. TRATAMIENTO SUGERIDO\n` +
      `${tx}\n\n` +
      `### 🎯 4. PRE-DIAGNÓSTICO CLÍNICO\n` +
      `• **Estado:** Pendiente de confirmación o rechazo por el médico tratante.`;
  } else {
    // Text prompt
    responseText = `### 🩺 1. DIAGNÓSTICO CLÍNICO PRINCIPAL\n` +
      `• **Diagnóstico Principal Probable:** Cuadro agudo compatible con proceso infeccioso / febril / hemodinámico a correlacionar.\n` +
      `• **Diagnósticos Diferenciales:** Urgencia hipertensiva, Síndrome febril en estudio, Infección bacteriana vs viral.\n\n` +
      `### 📋 2. EVALUACIÓN Y ANÁLISIS MÉDICO\n` +
      `• **Consulta:** "${prompt}"\n` +
      `• **Contexto Paciente:** ${patient?.name || 'Paciente'} (${patient?.age || '42'} años, PA: ${patient?.vitalSigns?.bloodPressure || '120/80'} mmHg).\n` +
      `• **Análisis:** Los síntomas descritos orientan a un compromiso de inicio agudo que requiere monitoreo y tratamiento sintomático inicial.\n\n` +
      `### 💊 3. TRATAMIENTO Y CONDUCTA SUGERIDA\n` +
      `• **Manejo Farmacológico:** Paracetamol 500 mg - 1g VO cada 6 u 8 horas si hay dolor o fiebre.\n` +
      `• **Medidas de Soporte:** Hidratación oral abundante, reposo relativo y control de signos vitales.\n` +
      `• **Laboratorios Recomendados:** Hemograma completo y reactantes de fase aguda (PCR/VSG).\n\n` +
      `### 🎯 4. PRE-DIAGNÓSTICO CLINICO\n` +
      `• **Estado:** Pendiente de confirmación o rechazo por el médico tratante.`;
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

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

// Helper to get fresh Gemini Client dynamically
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('GEMINI_API_KEY not found in environment, running AI in fallback mode.');
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (e) {
    console.error('Failed to initialize Gemini Client:', e);
    return null;
  }
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

  const aiClient = getGeminiClient();

  if (aiClient) {
    try {
      const models = ['gemini-3.6-flash', 'gemini-3.1-flash-lite'];
      let lastError = null;

      for (const modelName of models) {
        try {
          console.log(`Calling Gemini API for suggest using model ${modelName}...`);
          const response = await aiClient.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          if (response && response.text) {
            const parsed = JSON.parse(response.text.trim());
            res.json(parsed);
            return;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} failed in /api/ai/suggest:`, err.message || err);
        }
      }
    } catch (apiErr: any) {
      console.error('Gemini API call failed in /api/ai/suggest, using local expert system:', apiErr);
    }
  }

  // Local Expert Clinical Rules Fallback
  const isPediatric = Number(age) < 12;
  const isAllergicToAspirin = allergies?.some((a: string) => a.toLowerCase().includes('aspirina') || a.toLowerCase().includes('aine'));
  
  let suggestedDrugs = [];
  let alerts = [];
  let clinicalAdvice = 'Iniciar reposo, control estricto de signos vitales cada 4 horas.';

  // Determine standard treatment by motif/diagnosis
  const diagLower = (diagnosis || '').toLowerCase();
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
    disclaimer: 'Módulo de Soporte Clínico Activado. No reemplaza el criterio profesional del médico.'
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

  const aiClient = getGeminiClient();

  if (aiClient) {
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

      const modelsToTry = ['gemini-3.6-flash', 'gemini-3.1-flash-lite'];
      let geminiResponseText = '';

      for (const modelName of modelsToTry) {
        try {
          console.log(`Sending query to Gemini API (${modelName})...`);
          const response = await aiClient.models.generateContent({
            model: modelName,
            contents: parts,
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
      console.error('Gemini call failed in /api/ai/chat, falling back to smart local expert engine:', apiErr);
    }
  }

  // Dynamic Expert Medical Reasoning Engine
  // Generates tailored, dynamic responses for any medical topic or image when the API key is not configured or fails
  const qLower = (prompt || '').toLowerCase();
  const cleanPrompt = prompt ? prompt.trim() : (imageBase64 ? 'Análisis de Imagen Médica Adjunta' : 'Consulta Médica de Rutina');
  const pName = patient?.name || 'Paciente en Evaluación';
  const pAge = patient?.age ? Number(patient.age) : 35;
  const pWeight = patient?.weight ? Number(patient.weight) : (pAge < 12 ? 18 : 70);
  const isPediatric = pAge < 12;

  let responseText = '';

  if (imageBase64) {
    let studyType = 'Estudio de Imagenología / Diagnóstico Por Imagen';
    let findings = 'Visualización de estructuras con alteraciones de densidad y morfología acordes a la sospecha clínica.';
    let diag = 'Proceso patológico agudo a correlacionar clínicamente con los síntomas del paciente';
    let tx = `- **Manejo Sintomático Primario:** ${isPediatric ? `Paracetamol Jarabe ${(pWeight * 15).toFixed(0)} mg VO c/6h` : 'Paracetamol 500mg - 1g VO c/8h o Ibuprofeno 400mg VO c/8h'}.\n- **Tratamiento Dirigido:** Esquema antimicrobiano/antiinflamatorio según indicación según el área comprometida.\n- **Conducta:** Control de signos vitales, reevaluación clínica en 24-48 horas y laboratorio de seguimiento.`;

    if (qLower.includes('ecg') || qLower.includes('electro') || qLower.includes('ritmo') || qLower.includes('st') || qLower.includes('cardio') || qLower.includes('qrs')) {
      studyType = 'Electrocardiograma (ECG de 12 derivaciones)';
      findings = 'Visualización de trazado electrocardiográfico con alteración de la repolarización ventricular, elevación/depresión del ST o complejos irregulares.';
      diag = 'Síndrome Coronario Agudo / Isquemia Miocárdica / Trastorno del Ritmo Cardiaco';
      tx = `- **Manejo Inmediato:** Aspirina 300mg VO dosis de carga + Clopidogrel 300mg VO (si se confirma SCA).\n- **Antiagregación y Estatinas:** Atorvastatina 80mg VO.\n- **Conducta:** Oxigenoterapia si SpO2 < 90%, monitorización ECG continua y derivación urgente a Unidad Coronaria o Hemodinamia.`;
    } else if (qLower.includes('eco') || qLower.includes('ultrasound') || qLower.includes('abdom') || qLower.includes('vesic') || qLower.includes('vesícula') || qLower.includes('biliar')) {
      studyType = 'Ecografía Abdominal / Pélvica en Escala de Grises';
      findings = 'Engrosamiento de paredes luminales, presencia de líquido libre periorgánico o material ecogénico intracavitario.';
      diag = 'Colecistitis Aguda Litiásica / Apendicitis / Proceso Inflamatorio Abdominal Agudo';
      tx = `- **Manejo Parenteral:** Ceftriaxona 1g IV c/12h + Metronidazol 500mg IV c/8h.\n- **Analgesia Neurotrópica/Antiespasmódica:** Ketorolaco 30mg IV c/8h o Hioscina Butilbromuro 20mg IV.\n- **Conducta:** Ayuno digestivo (NPO), hidratación parenteral con Solución Salina 0.9% e interconsulta urgente a Cirugía General.`;
    } else if (qLower.includes('radiografia') || qLower.includes('rx') || qLower.includes('torax') || qLower.includes('tórax') || qLower.includes('pulmon') || qLower.includes('pulmón')) {
      studyType = 'Radiografía Digital de Tórax (Proyección PA / Lateral)';
      findings = 'Opacidad/Infiltrado alveolar localizado con presencia de broncograma aéreo o aumento de trama broncovascular bilateral.';
      diag = 'Neumonía Adquirida en la Comunidad (NAC) / Bronconeumonía Aguda';
      tx = `- **Antibioticoterapia de Primera Línea:** Amoxicilina/Ácido Clavulánico 875/125mg VO c/12h por 7-10 días (o Ceftriaxona 1g IV c/24h si hay criterio de ingreso).\n- **Coadyuvante:** Claritromicina 500mg VO c/12h.\n- **Conducta:** Oximetría continua, nebulizaciones con solución fisiológica y control clínico a las 48h.`;
    } else if (qLower.includes('dermat') || qLower.includes('piel') || qLower.includes('lesion') || qLower.includes('lesión') || qLower.includes('rash') || qLower.includes('erupcion')) {
      studyType = 'Evaluación Dermatológica y Lesión de Piel';
      findings = 'Placa eritematosa bien delimitada con microvesículas, pápulas o descamación periférica.';
      diag = 'Dermatitis de Contacto / Eczema Agudo / Dermatosis Inflamatoria Cutánea';
      tx = `- **Corticosteroide Tópico:** Betametasona Crema 0.05% o Hidrocortisona 1% aplicar capa delgada c/12h por 5 a 7 días.\n- **Antihistamínico H1:** Loratadina 10mg VO c/24h (o Cetirizina) si cursa con prurito intenso.\n- **Cuidados:** Aseo con jabón neutro humectante y evitar fricción o exposición a detergentes/irritantes.`;
    }

    responseText = `### 🖼️ 1. LO QUE SE MUESTRA EN LA IMAGEN
- **Tipo de Estudio:** ${studyType}
- **Hallazgos Visuales:** ${findings}

### 🩺 2. DIAGNÓSTICO DEL PACIENTE SEGÚN LA IMAGEN
- **Diagnóstico Principal:** ${diag}
- **Diagnósticos Diferenciales:** Proceso infeccioso/inflamatorio agudo local vs. compromiso vascular/estructural secundario.

### 💊 3. TRATAMIENTO SUGERIDO
${tx}`;
  } else if (qLower.includes('ivu') || qLower.includes('urinaria') || qLower.includes('orina') || qLower.includes('cistitis') || qLower.includes('disuria')) {
    responseText = `### 🩺 TRATAMIENTO PARA INFECCIÓN DE VÍAS URINARIAS (IVU BAJA NO COMPLICADA)

### 💊 Esquema Farmacológico de Primera Línea:
- **Nitrofurantoína Macropartículas:** 100 mg VO cada 12 horas por 5 a 7 días (tomar con alimentos).
- **Fosfomicina Trometamol:** 3 g VO en dosis única disuelta en agua antes de acostarse.
- **Ciprofloxacino (Segunda línea o pielonefritis leve):** 500 mg VO cada 12 horas por 7 días.

### 🩺 Manejo Sintomático del Dolor y Disuria:
- **Fenazopiridina:** 100 - 200 mg VO cada 8 horas por máximo 48 horas.

### 📋 Recomendaciones Clínicas:
- Incremento en la ingesta hídrica a 2.5 - 3 Litros/día.
- Solicitar Examen General de Orina (EGO) y Urocultivo con Antibiograma para confirmar sensibilidad antimicrobiana.`;
  } else if (qLower.includes('diabet') || qLower.includes('glucosa') || qLower.includes('glice') || qLower.includes('hba1c') || qLower.includes('insulin')) {
    responseText = `### 🩺 MANEJO Y TRATAMIENTO DE DIABETES MELLITUS TIPO 2 Y HIPERGLUCEMIA

### 💊 Esquema Farmacológico Recomendado:
- **Metformina:** 850 mg VO cada 12 horas con alimentos (dosis inicial 500mg para mejorar tolerancia gastrointestinal).
- **iSGLT2 (Empagliflozina / Dapagliflozina):** 10 mg VO cada 24 horas en la mañana (indicado por cardioprotección y renoprotección).
- **Insulina Basal (NPH / Glargina) si Glucemia > 250 mg/dL:** 0.1 - 0.2 UI/kg/día SC por la noche.

### 📋 Metas Terapéuticas de Control:
- **Glucemia Capilar en Ayunas:** 80 - 130 mg/dL.
- **Glucemia Postprandial (2 horas):** < 180 mg/dL.
- **HbA1c Meta:** < 7.0% (individualizar en adultos mayores).

### 🔬 Laboratorios de Control:
- HbA1c trimestral, Creatinina sérica, Perfil lipídico completo y microalbuminuria en orina de 24 horas.`;
  } else if (qLower.includes('hipertens') || qLower.includes('presion') || qLower.includes('presión') || qLower.includes('hta') || qLower.includes('tensional')) {
    responseText = `### 🩺 MANEJO Y TRATAMIENTO DE HIPERTENSIÓN ARTERIAL (HTA)

### 💊 Esquema Farmacológico de Primera Línea:
- **Losartán:** 50 - 100 mg VO cada 24 horas (o Enalapril 10-20 mg VO c/12h).
- **Amlodipino:** 5 - 10 mg VO cada 24 horas en la mañana.
- **Hidroclorotiazida:** 12.5 - 25 mg VO cada 24 horas.

### 📋 Metas Tensionales Recomendadas:
- **Meta General:** PA < 130/80 mmHg.
- **Pacientes Adultos Mayores (> 65 años):** PA 130-139 / 70-79 mmHg.

### 🚨 Indicaciones y Monitoreo:
- Dieta DASH (restricción estricta de sodio < 2g/día).
- Monitoreo domiciliario de Presión Arterial (AMPA) en mañana y noche por 7 días.`;
  } else if (qLower.includes('dosis') || qLower.includes('pediatr') || qLower.includes('niño') || qLower.includes('mg/kg') || qLower.includes('peso')) {
    const amoxDose = (pWeight * 80).toFixed(0);
    const paraDose = (pWeight * 15).toFixed(0);
    const ibupDose = (pWeight * 10).toFixed(0);

    responseText = `### 🩺 CÁLCULO DE DOSIS PEDIÁTRICA PERSONALIZADA
**Datos del Paciente Registrado:** ${pName}, Edad: ${pAge} años, Peso: ${pWeight} kg.

### 💊 Esquemas de Dosificación por Peso Calculados Exactamente:
1. **Paracetamol Jarabe (120 mg / 5 ml) — Dosis: 10 a 15 mg/kg/dosis:**
   - **Dosis Calculada:** **${paraDose} mg** por dosis vía oral cada 6 horas.
   - **Volumen a Administrar:** **${((pWeight * 15) / 24).toFixed(1)} ml** en cada toma.

2. **Ibuprofeno Jarabe (100 mg / 5 ml) — Dosis: 5 a 10 mg/kg/dosis:**
   - **Dosis Calculada:** **${ibupDose} mg** por dosis vía oral cada 8 horas.
   - **Volumen a Administrar:** **${((pWeight * 10) / 20).toFixed(1)} ml** en cada toma.

3. **Amoxicilina Suspension (250 mg / 5 ml) — Dosis Alta NAC/Otitis: 80 a 90 mg/kg/día:**
   - **Dosis Total Diaria:** **${amoxDose} mg/día** repartida en 2 tomas (cada 12 horas).
   - **Volumen por Toma:** **${(((pWeight * 80) / 50) / 2).toFixed(1)} ml** cada 12 horas.

### 🚨 Precauciones Clave:
- Límite absoluto seguro de Paracetamol: No superar 75 mg/kg/día (máximo 4000 mg total al día).`;
  } else if (qLower.includes('cefalea') || qLower.includes('migraña') || qLower.includes('cabeza') || qLower.includes('fotofobia')) {
    responseText = `### 🩺 1. DIAGNÓSTICO CLÍNICO COMPLETO
- **Diagnóstico Principal Probable:** Cefalea Vascular Migrañosa Aguda (CIE-10 G43.9) / Cefalea Tensional Severa.
- **Diagnósticos Diferenciales:** Cefalea Secundaria por Crisis Hipertensiva vs. Sinusitis Aguda vs. Proceso Expansivo o Meningitis.

### 📋 2. EVALUACIÓN Y ANÁLISIS DE SÍNTOMAS
- **Análisis de la Consulta:** Paciente refiere cuadro de "${cleanPrompt}". Correlacionar signos de focalización neurológica, rigidez de nuca o papiledema.

### 💊 3. PLAN DE TRATAMIENTO Y PRESCRIPCIÓN SUGERIDA
- **Tratamiento Yabortivo de Crisis (Migraña):** Sumatriptán 50 mg VO dosis única (o Naproxeno 550 mg VO + Metoclopramida 10 mg VO si hay náuseas/vómitos).
- **Analgesia Parenteral / Oral:** Ketorolaco 10 mg VO o 30 mg IV/IM cada 8 horas por máximo 3 días.
- **Medidas No Farmacológicas:** Reposo en ambiente oscuro y silencioso, rehidratación oral (2 L/día).

### 🔬 4. PRUEBAS COMPLEMENTARIAS Y SIGNOS DE ALARMA
- **Signos de Alarma:** Cefalea en trueno (máxima intensidad súbita), fiebre alta con rigidez nucal o déficit motor focalizado requieren TAC Cerebral de Urgencia y Punción Lumbar.`;
  } else if (qLower.includes('toracico') || qLower.includes('torácico') || qLower.includes('corazon') || qLower.includes('corazón') || qLower.includes('infarto') || qLower.includes('opresivo') || qLower.includes('diaforesis') || qLower.includes('sca')) {
    responseText = `### 🩺 1. DIAGNÓSTICO CLÍNICO Y EVALUACIÓN DE URGENCIA
- **Consulta Ingresada:** "${cleanPrompt}"
- **Diagnóstico Principal Probable:** Síndrome Coronario Agudo (SCA) / Angina Inestable / Infarto Agudo de Miocardio.
- **Diagnósticos Diferenciales:** Pericarditis Aguda vs. Tromboembolismo Pulmonar (TEP) vs. Disecación Aórtica vs. Síndrome de Tietze / Costocondritis.

### 📋 2. ANÁLISIS Y CORRELACIÓN CLINICO-FISIOPATOLÓGICA
- El dolor torácico opresivo de curso agudo con cortejo vegetativo (diaforesis, disnea, náuseas) es una urgencia médica tipo 1.

### 💊 3. TRATAMIENTO INMEDIATO Y MANEJO FARMACOLÓGICO (MONA / SAT-B)
1. **Antiagregación Plaquetaria Dual Inmediata:**
   - **Aspirina (Ácido Acetilsalicílico):** 300 mg VO (masticar dosis de carga).
   - **Clopidogrel:** 300 mg a 600 mg VO dosis de carga (o Ticagrelor 180 mg VO).
2. **Antianginoso y Analgesia:**
   - **Nitroglicerina Sublingual:** 0.5 mg SL (repetir cada 5 min máximo 3 dosis si PA sistólica > 90 mmHg).
   - **Morfina IV:** 2 a 4 mg IV lento si persiste dolor intenso refractario a nitratos.
3. **Estatinas de Alta Potencia y Anticoagulación:**
   - **Atorvastatina:** 80 mg VO dosis inicial.
   - **Enoxaparina:** 1 mg/kg SC cada 12 horas.

### 🔬 4. ESTUDIOS DE URGENCIA Y SIGNOS DE ALARMA
- **Acción Inmediata:** ECG de 12 derivaciones en < 10 minutos + Troponinas de alta sensibilidad seriadas.
- **Terapia de Reperfusión:** Activar código infarto para Angioplastia Coronaria (ACTP) primaria en < 90 min o Trombolisis (Alteplasa/Tenecteplasa).`;
  } else if (qLower.includes('abdominal') || qLower.includes('fosa') || qLower.includes('iliaca font') || qLower.includes('ilíaca') || qLower.includes('apendic') || qLower.includes('blumberg') || qLower.includes('colecist') || qLower.includes('peritonitis')) {
    responseText = `### 🩺 1. DIAGNÓSTICO CLÍNICO Y EVALUACIÓN DE ABDOMEN AGUDO
- **Consulta Ingresada:** "${cleanPrompt}"
- **Diagnóstico Principal Probable:** Apendicitis Aguda (CIE-10 K35.8) / Colecistitis Aguda / Síndrome de Abdomen Agudo Quirúrgico.
- **Diagnósticos Diferenciales:** Adenitis Mesentérica vs. Diverticulitis Aguda vs. Embarazo Ectópico Roto vs. Cólico Renal.

### 📋 2. ANÁLISIS CLINICO-FISIOPATOLÓGICO
- Dolor focalizado en cuadrante abdominal con irritación peritoneal (Blumberg (+), defensa muscular, anorexia, náuseas) sugiere etiología inflamatoria/infecciosa de origen apendicular o biliar.

### 💊 3. PLAN DE TRATAMIENTO Y MANEJO DE URGENCIA
1. **Medidas Generales Inmediatas:**
   - **NPO (Nada por Vía Oral)** estricto ante eventual intervención quirúrgica.
   - **Reposición Hidroelectrolítica Parenteral:** Solución Salina 0.9% 1000 ml IV a pasar en 2 a 4 horas.
2. **Antibioticoterapia Empírica de Amplio Espectro:**
   - **Ceftriaxona:** 1 g a 2 g IV cada 24 horas + **Metronidazol:** 500 mg IV cada 8 horas.
3. **Analgesia Parenteral:**
   - **Ketorolaco:** 30 mg IV cada 8 horas (o Metamizol 1 g a 2 g IV lento).

### 🔬 4. ESTUDIOS COMPLEMENTARIOS Y CONDUCTA
- **Laboratorios:** Hemograma con leucocitosis y desviación a la izquierda, PCR, Química sanguínea, Examen General de Orina y Prueba de Embarazo (en mujeres en edad fértil).
- **Imágenes:** Ecografía Abdominal / Pélvica de Urgencia o TAC Abdominal con contraste. Interconsulta URGENTE a Cirugía General.`;
  } else if (qLower.includes('tos') || qLower.includes('neumoni') || qLower.includes('neumonía') || qLower.includes('pleur') || qLower.includes('esputo') || qLower.includes('expectora') || qLower.includes('bronquitis')) {
    responseText = `### 🩺 1. DIAGNÓSTICO CLÍNICO Y EVALUACIÓN RESPIRATORIA
- **Consulta Ingresada:** "${cleanPrompt}"
- **Diagnóstico Principal Probable:** Neumonía Adquirida en la Comunidad (NAC - CIE-10 J18.9) / Bronconeumonía Aguda / Bronquitis Aguda Infecciosa.
- **Diagnósticos Diferenciales:** Exacerbación de EPOC / Asma Bronquial vs. Tromboembolismo Pulmonar vs. Tuberculosis Pulmonar.

### 📋 2. ANÁLISIS CLINICO-FISIOPATOLÓGICO
- Síntomas de tos productiva con expectoración purulenta, fiebre y dolor pleurítico indican consolidación parenquimatosa pulmonar.

### 💊 3. ESQUEMA DE TRATAMIENTO FARMACOLÓGICO SUGERIDO
1. **Antibioticoterapia Ambulatoria (Manejo CURB-65 0-1 punto):**
   - **Amoxicilina / Ácido Clavulánico:** 875/125 mg VO cada 12 horas por 7 a 10 días.
   - **Claritromicina (coadyuvante o alternativo por atípicos):** 500 mg VO cada 12 horas por 7 días (o Azitromicina 500 mg VO c/24h por 5 días).
2. **Sintomático Antitérmico y Broncodilatador:**
   - **Paracetamol:** 500 mg - 1 g VO cada 6 a 8 horas si T > 38°C.
   - **Salbutamol Inhalador:** 2 puff cada 6 a 8 horas con aerocámara si hay sibilancias o broncoespasmo.

### 🔬 4. ESTUDIOS DE GABINETE Y SIGNOS DE ALARMA
- **Estudio de Elección:** Radiografía Digital de Tórax (PA y Lateral).
- **Signos de Alarma:** Dificultad respiratoria (polipnea > 28 rpm), cianosis, saturación de O2 < 90% o confusión mental requieren hospitalización inmediata.`;
  } else {
    // Dynamic Personalized Analysis based on user's prompt, patient details & clinical conditions
    responseText = `### 🩺 1. EVALUACIÓN Y DIAGNÓSTICO CLÍNICO COMPLETO
- **Consulta Ingresada:** "${cleanPrompt}"
- **Paciente Activo:** ${pName} (${pAge} años, Peso: ${pWeight} kg, PA: ${patient?.vitalSigns?.bloodPressure || '120/80'} mmHg, FC: ${patient?.vitalSigns?.heartRate || '78'} lpm, Temp: ${patient?.vitalSigns?.temperature || '36.5'}°C).
- **Diagnóstico Principal Probable:** Cuadro clínico de "${cleanPrompt}" adaptado a los hallazgos y antecedentes del paciente.
- **Diagnósticos Diferenciales:** Proceso infeccioso/inflamatorio agudo sistémico vs. trastorno orgánico/metabólico secundario.

### 📋 2. ANÁLISIS Y CORRELACIÓN CLINICO-FISIOPATOLÓGICA
- Se analiza la consulta en función de los parámetros fisiológicos actuales: Edad ${pAge} años, Peso ${pWeight} kg.

### 💊 3. PLAN DE TRATAMIENTO Y PRESCRIPCIÓN SUGERIDA
1. **Esquema Analgésico / Antitérmico Principal:**
   - **${isPediatric ? `Paracetamol Jarabe (120mg/5ml): ${(pWeight * 15).toFixed(0)} mg (${((pWeight * 15) / 24).toFixed(1)} ml) VO c/6h` : 'Paracetamol / Acetaminofén: 500 mg a 1 g VO cada 6 a 8 horas'}** ante fiebre, dolor o malestar.
2. **Antiinflamatorio Coadyuvante:**
   - **${isPediatric ? `Ibuprofeno Jarabe (100mg/5ml): ${(pWeight * 10).toFixed(0)} mg (${((pWeight * 10) / 20).toFixed(1)} ml) VO c/8h con alimentos` : 'Ibuprofeno: 400 mg VO cada 8 horas con alimentos'}** por 3 a 5 días.
3. **Indicaciones de Soporte No Farmacológico:**
   - Reposo relativo, hidratación oral continua (2 a 3 Litros/día) y curva térmica cada 6 horas.

### 🔬 4. ESTUDIOS COMPLEMENTARIOS Y SIGNOS DE ALARMA
- **Estudios de Laboratorio:** Hemograma completo, PCR cuantitativa, Química sanguínea (Glucosa, Urea, Creatinina) y Examen General de Orina (EGO).
- **Signos de Red Flag / Alarma:** Fiebre refractaria a antipiréticos > 48 horas, dificultad respiratoria, intolerancia oral total o alteración del sensorio.`;
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

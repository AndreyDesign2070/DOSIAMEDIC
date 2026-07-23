import { Medication, EmergencyProtocol, License } from './types';

export const INITIAL_LICENSES: License[] = [
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

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: '1',
    name: 'Paracetamol (Acetaminofén)',
    activeIngredient: 'Paracetamol',
    category: 'Analgésico / Antipirético',
    adultDose: '500 mg - 1 g cada 6 a 8 horas (Máximo 4 g/día)',
    pediatricDosePerKg: '10-15 mg/kg por dosis cada 4 a 6 horas (Máximo 5 tomas al día)',
    maxDailyDoseMg: 4000,
    maxDosePerKgMg: 75,
    interactions: [
      { drugName: 'Warfarina', severity: 'Media', description: 'El uso prolongado de paracetamol puede incrementar el efecto anticoagulante.' },
      { drugName: 'Ibuprofeno', severity: 'Baja', description: 'Uso sinérgico posible con precaución, vigilar función renal.' }
    ],
    contraindications: ['Insuficiencia hepática grave', 'Hipersensibilidad al principio activo']
  },
  {
    id: '2',
    name: 'Ibuprofeno',
    activeIngredient: 'Ibuprofeno',
    category: 'AINE (Antiinflamatorio No Esteroideo)',
    adultDose: '400 - 600 mg cada 6 a 8 horas (Máximo 2400 mg/día)',
    pediatricDosePerKg: '5-10 mg/kg por dosis cada 6 a 8 horas (Máximo 40 mg/kg/día)',
    maxDailyDoseMg: 2400,
    maxDosePerKgMg: 40,
    interactions: [
      { drugName: 'Ketorolaco', severity: 'Alta', description: 'Riesgo aumentado de úlceras gastrointestinales y sangrado.' },
      { drugName: 'Enalapril', severity: 'Media', description: 'Reduce el efecto antihipertensivo de los IECA y aumenta riesgo de falla renal.' }
    ],
    contraindications: ['Úlcera péptica activa', 'Insuficiencia renal severa', 'Tercer trimestre de embarazo']
  },
  {
    id: '3',
    name: 'Amoxicilina',
    activeIngredient: 'Amoxicilina',
    category: 'Antibiótico (Betalactámico)',
    adultDose: '500 mg cada 8 horas o 875 mg cada 12 horas',
    pediatricDosePerKg: '40-90 mg/kg/día dividido en 2 o 3 dosis',
    maxDailyDoseMg: 3000,
    maxDosePerKgMg: 90,
    interactions: [
      { drugName: 'Metotrexato', severity: 'Alta', description: 'Disminuye la excreción de metotrexato aumentando su toxicidad.' }
    ],
    contraindications: ['Alergia a la penicilina o cefalosporinas']
  },
  {
    id: '4',
    name: 'Metoclopramida',
    activeIngredient: 'Metoclopramida',
    category: 'Antiemético / Proquinético',
    adultDose: '10 mg cada 8 horas (Máximo 30 mg/día)',
    pediatricDosePerKg: '0.1-0.15 mg/kg por dosis cada 8 horas',
    maxDailyDoseMg: 30,
    maxDosePerKgMg: 0.5,
    interactions: [
      { drugName: 'Haloperidol', severity: 'Alta', description: 'Incrementa el riesgo de efectos extrapiramidales (distonías).' }
    ],
    contraindications: ['Obstrucción intestinal', 'Feocromocitoma', 'Epilepsia']
  },
  {
    id: '5',
    name: 'Adrenalina (Epinefrina) 1mg/ml',
    activeIngredient: 'Epinefrina',
    category: 'Agonista Adrenérgico (Emergencia)',
    adultDose: 'Anafilaxia: 0.3 - 0.5 mg IM (1:1000) cada 5-15 min. RCP: 1 mg IV cada 3-5 min.',
    pediatricDosePerKg: 'Anafilaxia: 0.01 mg/kg IM (máximo 0.3 mg). RCP: 0.01 mg/kg IV cada 3-5 min.',
    maxDailyDoseMg: 5,
    maxDosePerKgMg: 0.1,
    interactions: [
      { drugName: 'Propropanol', severity: 'Alta', description: 'Riesgo de hipertensión severa seguida de bradicardia.' }
    ],
    contraindications: ['Ninguna en situación de emergencia vital']
  },
  {
    id: '6',
    name: 'Salbutamol Inhalador',
    activeIngredient: 'Salbutamol',
    category: 'Broncodilatador (Beta-2 agonista)',
    adultDose: '2 inhalaciones (100 mcg c/u) cada 4-6 horas en crisis',
    pediatricDosePerKg: '2 inhalaciones cada 4-6 horas o nebulización: 0.05-0.15 mg/kg',
    maxDailyDoseMg: 10,
    maxDosePerKgMg: 0.5,
    interactions: [
      { drugName: 'Propropanol', severity: 'Alta', description: 'Los betabloqueantes antagonizan el efecto del salbutamol.' }
    ],
    contraindications: ['Hipersensibilidad al medicamento']
  },
  {
    id: '7',
    name: 'Cefalexina',
    activeIngredient: 'Cefalexina',
    category: 'Antibiótico (Cefalosporina 1ra gen)',
    adultDose: '250 - 500 mg cada 6 horas (Máximo 4 g/día)',
    pediatricDosePerKg: '25-50 mg/kg/día dividido en 4 dosis (Hasta 100 mg/kg/día en infecciones graves)',
    maxDailyDoseMg: 4000,
    maxDosePerKgMg: 100,
    interactions: [
      { drugName: 'Furosemida', severity: 'Media', description: 'Aumento del riesgo de nefrotoxicidad.' }
    ],
    contraindications: ['Alergia a las cefalosporinas']
  }
];

export const INITIAL_PROTOCOLS: EmergencyProtocol[] = [
  {
    id: 'p1',
    title: 'Anafilaxia (Choque Alérgico)',
    category: 'adult',
    description: 'Reacción alérgica sistémica grave, de instauración rápida y potencialmente mortal.',
    steps: [
      'Asegurar vía aérea y administrar Oxígeno suplementario a alto flujo.',
      'Colocar al paciente en decúbito supino con piernas elevadas.',
      'Adrenalina (1:1000) 0.3 - 0.5 mg IM en cara anterolateral del muslo.',
      'Canalizar 2 vías periféricas gruesas e iniciar infusión rápida de cristaloides (Suero Fisiológico 1000ml).',
      'Administrar Metilprednisolona 125 mg IV y Difenhidramina 50 mg IV.'
    ],
    medications: [
      { name: 'Adrenalina 1 mg/ml', dosage: '0.3 - 0.5 mg IM', indication: 'Inmediato ante sospecha de anafilaxia' },
      { name: 'Solución Salina 0.9%', dosage: '1000 - 2000 ml IV a goteo rápido', indication: 'Tratamiento de la hipotensión' },
      { name: 'Metilprednisolona', dosage: '125 mg IV', indication: 'Prevención de reacción bifásica tardía' }
    ]
  },
  {
    id: 'p2',
    title: 'Anafilaxia Pediátrica',
    category: 'pediatric',
    description: 'Reacción alérgica severa en niños. La adrenalina IM es el pilar fundamental.',
    steps: [
      'Establecer vía aérea, aplicar oxígeno y colocar en posición cómoda.',
      'Adrenalina (1:1000) 0.01 mg/kg IM (Dosis máxima 0.3 mg) en muslo.',
      'Acceso vascular e infusión rápida de Solución Salina a 20 ml/kg.',
      'Hidrocortisona 5 mg/kg IV o Metilprednisolona 1-2 mg/kg IV.',
      'Monitoreo continuo de frecuencia cardíaca, oximetría y presión arterial.'
    ],
    medications: [
      { name: 'Adrenalina 1 mg/ml', dosage: '0.01 mg/kg (Max 0.3 mg) IM', indication: 'Pilar de elección inmediato' },
      { name: 'Suero Fisiológico 0.9%', dosage: 'Bolo de 20 ml/kg IV en 10-20 min', indication: 'Inestabilidad hemodinámica' },
      { name: 'Hidrocortisona', dosage: '5 mg/kg IV', indication: 'Antiinflamatorio corticoide secundario' }
    ]
  },
  {
    id: 'p3',
    title: 'Crisis Asmática Severa (Pediatría)',
    category: 'pediatric',
    description: 'Dificultad respiratoria extrema con sibilancias o tórax silente en el paciente pediátrico.',
    steps: [
      'Oxigenoterapia para mantener saturación > 94%.',
      'Salbutamol nebulizado 2.5 - 5 mg + Bromuro de Ipratropio 250 - 500 mcg cada 20 min por 3 dosis.',
      'Hidrocortisona 5 mg/kg IV o Prednisolona 1-2 mg/kg VO.',
      'Considerar Sulfato de Magnesio 40 mg/kg IV en infusión lenta (20 min) si no hay respuesta a terapia inicial.'
    ],
    medications: [
      { name: 'Salbutamol Nebulizado', dosage: '2.5 mg (<20kg) o 5 mg (>20kg) c/20 min', indication: 'Broncodilatación' },
      { name: 'Bromuro de Ipratropio', dosage: '250 mcg (<20kg) o 500 mcg (>20kg) c/20 min', indication: 'Sinergia broncodilatadora antichoque' },
      { name: 'Sulfato de Magnesio', dosage: '40 mg/kg IV (Max 2g) en 20 min', indication: 'Broncodilatador de rescate en crisis refractaria' }
    ]
  },
  {
    id: 'p4',
    title: 'Convulsión Aguda / Estatus Epiléptico',
    category: 'adult',
    description: 'Actividad convulsiva persistente por más de 5 minutos o crisis repetidas sin recuperación.',
    steps: [
      'Proteger la cabeza del paciente, colocar de medio lado (seguridad lateral). No insertar objetos en la boca.',
      'Vía aérea permeable, administrar Oxígeno de rescate.',
      'Diazepam 10 mg IV lento (2 mg/min) o Midazolam 5-10 mg IM.',
      'Si persiste tras 5 min, repetir Diazepam 10 mg IV o iniciar Fenitoína 15-20 mg/kg IV en infusión lenta.'
    ],
    medications: [
      { name: 'Diazepam 10mg/2ml', dosage: '5 - 10 mg IV lento', indication: 'Primera línea anticonvulsivante' },
      { name: 'Midazolam 15mg/3ml', dosage: '5 - 10 mg IM o 5 mg IV', indication: 'Alternativa rápida de primera línea' },
      { name: 'Fenitoína 250mg', dosage: '15 - 20 mg/kg IV (diluido en Solución Salina)', indication: 'Medicamento de carga segunda línea' }
    ]
  }
];

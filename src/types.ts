export interface License {
  key: string;
  doctorName: string;
  username: string; // cédula
  password: string; // e.g. medjuan783
  purchaseDate: string;
  status: 'Activa' | 'Inactiva';
  maxActivations: number;
  activatedDeviceId: string | null;
}

export interface VitalSigns {
  heartRate: number;      // lpm
  bloodPressure: string;  // e.g. "120/80"
  temperature: number;    // °C
  respiratoryRate: number; // rpm
  oxygenSaturation: number; // %
}

export interface Patient {
  id: string;
  name: string;
  cardId: string; // Cédula
  age: number;
  weight: number; // kg
  height: number; // cm
  sex: 'M' | 'F';
  allergies: string[];
  preExistingConditions: string[];
  vitalSigns: VitalSigns;
  photos: string[]; // Base64 data URLs for clinical photos
  studies: { name: string; type: string; size: string; dataUrl: string }[]; // clinical studies files
  createdAt: string;
}

export interface PrescriptionMedication {
  id: string;
  name: string;
  activeIngredient: string;
  dose: string;             // e.g. "150 mg"
  frequency: string;        // e.g. "Cada 8 horas"
  duration: string;         // e.g. "7 días"
  notes: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientCardId: string;
  patientAge: number;
  patientWeight: number;
  patientHeight: number;
  patientSex: 'M' | 'F';
  date: string;
  medications: PrescriptionMedication[];
  diagnosis: string;
  observations: string;
  signature: string; // Drawing data URL or text
  qrCode: string;    // Data URL SVG or canvas image
  doctorName: string;
  doctorCédula: string;
  doctorSpecialty: string;
  doctorSello: string; // customized stamp/seal text
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

export interface Medication {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  adultDose: string;
  pediatricDosePerKg: string; // e.g. "10-15 mg/kg/dose"
  maxDailyDoseMg: number;     // e.g. 4000 mg
  maxDosePerKgMg: number;     // e.g. 75 mg
  interactions: { drugName: string; severity: 'Alta' | 'Media' | 'Baja'; description: string }[];
  contraindications: string[];
}

export interface TemplateDocument {
  id: string;
  type: 'certificate' | 'lab_order' | 'reference';
  title: string;
  patientName: string;
  patientCardId: string;
  content: string; // Rich or plain text content
  date: string;
  doctorName: string;
  doctorSello: string;
}

export interface EmergencyProtocol {
  id: string;
  title: string;
  category: 'adult' | 'pediatric';
  description: string;
  steps: string[];
  medications: { name: string; dosage: string; indication: string }[];
}

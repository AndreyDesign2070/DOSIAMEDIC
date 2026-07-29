export interface License {
  key: string;
  doctorName: string;
  username: string; // cédula
  password: string; // e.g. medjuan783
  purchaseDate: string;
  status: 'Activa' | 'Inactiva';
  maxActivations: number;
  activatedDeviceId: string | null;
  monthlyFee?: number; // $70
  paymentScheme?: string; // "Quincenal y Fin de Mes ($35 / $35)"
  firstHalfPaymentStatus?: 'Pagado' | 'Pendiente';
  secondHalfPaymentStatus?: 'Pagado' | 'Pendiente';
}

export type BloodGroup = 'O+' | 'A+' | 'B+' | 'AB+' | 'O-' | 'A-' | 'B-' | 'AB-';
export type PatientStatus = 'Activo' | 'Hospitalizado' | 'Alta' | 'Estable';

export interface PatientAlerts {
  allergies: string[];
  chronicDiseases: string[];
  isPregnant?: boolean;
  isLactating?: boolean;
  hasRenalFailure?: boolean;
  hasHepaticFailure?: boolean;
  hasCardioRisk?: boolean;
  otherAlerts?: string[];
}

export interface VitalSigns {
  heartRate: number;            // lpm
  bloodPressure: string;        // e.g. "120/80"
  temperature: number;          // °C
  respiratoryRate: number;      // rpm
  oxygenSaturation: number;     // %
  painEva?: number;             // 0-10
  glycemia?: number;            // mg/dL
  abdominalCircumference?: number; // cm
  consciousnessAVPU?: 'A' | 'V' | 'P' | 'U'; // Alert, Verbal, Pain, Unresponsive
  diuresisMlHr?: number;        // mL/h
  glasgow?: {
    ocular: number;             // 1-4
    verbal: number;             // 1-5
    motor: number;              // 1-6
    total: number;              // 3-15
  };
  fluidBalanceMl?: number;      // mL
  chestPain?: boolean;
  abdominalPain?: boolean;
  respiratoryStatus?: 'Eupneico' | 'Taquipneico' | 'Disneico' | 'Distrés' | 'Silencio';
}

export interface ImageStudy {
  id?: string;
  name: string;
  type: 'Radiografía' | 'Tomografía' | 'Resonancia' | 'Ecografía' | 'Fotografía Clínica';
  size: string;
  dataUrl: string;
  date?: string;
  notes?: string;
}

export interface Patient {
  id: string;
  name: string;
  cardId: string;               // Cédula
  hcNumber: string;             // Número de Historia Clínica
  photoUrl?: string;            // Foto del paciente (deprecated)
  patientCategory?: 'ADULTO' | 'PEDIÁTRICO'; // Niño / Adulto
  age: number;
  weight: number;               // kg
  height: number;               // cm
  sex: 'M' | 'F';
  bloodGroup: BloodGroup;
  status: PatientStatus;
  lastConsultationDate: string;
  attendingDoctor: string;
  allergies: string[];
  preExistingConditions: string[];
  alerts: PatientAlerts;
  vitalSigns: VitalSigns;
  photos: string[];             // Base64 data URLs for clinical photos
  studies: ImageStudy[];
  createdAt: string;
}

export interface PrescriptionMedication {
  id: string;
  name: string;
  activeIngredient: string;
  dose: string;                 // e.g. "150 mg"
  frequency: string;            // e.g. "Cada 8 horas"
  duration: string;             // e.g. "7 días"
  notes?: string;
  pediatricMgPerKg?: number;
  presentationForm?: 'tabletas' | 'jarabe' | 'gotas' | 'ampollas' | 'inhalador';
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
  signature: string;           // Drawing data URL or text
  qrCode: string;              // Data URL SVG or canvas image
  doctorName: string;
  doctorCédula: string;
  doctorSpecialty: string;
  doctorSello: string;         // customized stamp/seal text
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

export interface DrugInteraction {
  drugName: string;
  severity: 'Sin interacción' | 'Moderada' | 'Grave';
  description: string;
}

export interface Medication {
  id: string;
  name: string;
  brandName?: string;
  genericName: string;
  activeIngredient: string;
  category: string;
  presentation?: string;
  concentration?: string;
  indications?: string[];
  contraindications: string[];
  interactions: DrugInteraction[];
  renalAdjustment?: string;
  hepaticAdjustment?: string;
  pregnancyCategory?: 'A' | 'B' | 'C' | 'D' | 'X' | string;
  lactationSafety?: 'Seguro' | 'Precaución' | 'Contraindicado' | string;
  adverseEffects?: string[];
  mechanismOfAction?: string;
  adultDose: string;
  pediatricDosePerKg: string;   // e.g. "10-15 mg/kg/dose"
  maxDailyDoseMg: number;       // e.g. 4000 mg
  maxDosePerKgMg: number;       // e.g. 75 mg
  adminRoute?: string;
  infusionRate?: string;
  dilution?: string;
  stability?: string;
  ivCompatibility?: string;
  approxCost?: string;
  availability?: 'Disponible' | 'Escaso' | 'Uso Hospitalario' | string;
}

export type DocumentType = 
  | 'certificate' 
  | 'lab_order' 
  | 'reference' 
  | 'contrareferencia'
  | 'indicaciones' 
  | 'evolucion' 
  | 'soap' 
  | 'reposo' 
  | 'consentimiento' 
  | 'informe' 
  | 'alta'
  | 'receta'
  | 'certificado'
  | 'orden';

export interface TemplateDocument {
  id: string;
  type: DocumentType;
  title: string;
  patientId?: string;
  patientName: string;
  patientCardId?: string;
  patientAge?: number;
  content: string;              // Rich or plain text content
  date: string;
  doctorName: string;
  doctorSello?: string;
  qrCodeUrl?: string;
  qrCodeData?: string;
}

export interface MedicalEvolutionNote {
  id: string;
  patientId: string;
  patientName: string;
  patientCardId: string;
  date: string;
  subjective: string;           // S
  objective: string;            // O
  assessment: string;           // A
  plan: string;                 // P
  vitalSignsAtTime?: VitalSigns;
  glasgowScore?: number;
  doctorName: string;
}

export interface EMREntry {
  id: string;
  patientId: string;
  date: string;
  time: string;
  doctorName: string;
  type: 'Consulta' | 'SOAP' | 'Receta' | 'Certificado' | 'Orden' | 'Examen' | 'Imagen' | 'Evolución' | 'Alta';
  diagnosis: string;
  summary: string;
  soapDetails?: { s: string; o: string; a: string; p: string };
  prescriptions?: PrescriptionMedication[];
  documentUrl?: string;
  imageUrl?: string;
  imageUrls?: string[];
  labResults?: string;
}

export interface EmergencyProtocol {
  id: string;
  title: string;
  category: 'adult' | 'pediatric' | 'acls' | 'trauma' | 'critico' | 'sepsis' | 'neuro' | 'cardio' | 'respiratorio' | 'toxicology';
  categoryLabel?: string;
  description: string;
  steps: string[];
  medications: { name: string; dosage: string; indication: string }[];
}

export interface MedicalScaleResult {
  scaleId: string;
  scaleName: string;
  score: number | string;
  interpretation: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  recommendations?: string;
}

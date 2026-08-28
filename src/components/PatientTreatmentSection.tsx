import React, { useState, useEffect, useRef } from 'react';
import { 
  Pill, Activity, ShieldAlert, HeartPulse, Stethoscope, CheckCircle2, 
  Sparkles, AlertCircle, FileText, ChevronDown, ChevronUp,
  Edit3, Share2, Download, FolderPlus, Plus, Trash2, Save, Undo, Calculator,
  Search, Check, RefreshCw, Info, AlertTriangle, ShieldCheck, User, Calendar,
  Droplet, Award, Zap, X
} from 'lucide-react';
import { Patient, Medication, EMREntry, PrescriptionMedication } from '../types';
import { INITIAL_MEDICATIONS } from '../data';
import { formatDoctorName, generateTreatmentPDF, MedicationItem } from '../utils';

export type { MedicationItem };

interface PatientTreatmentSectionProps {
  patient: Patient | null;
  onSaveToEMR?: (entry: EMREntry) => void;
  onUpdatePatient?: (updated: Patient) => void;
  onOpenNewPatientModal?: () => void;
}

interface ClinicalScaleOption {
  id: string;
  name: string;
  category: string;
  tag: string;
  badgeColor: string;
  description: string;
}

const CLINICAL_SCALES: ClinicalScaleOption[] = [
  { id: 'none', name: 'Ninguna (Esquema Clínico Estándar)', category: 'General', tag: 'Estándar', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700', description: 'Tratamiento base ajustado según edad, peso y constantes vitales.' },
  { id: 'qsofa', name: 'qSOFA / SOFA (Sepsis & Choque Séptico)', category: 'Sepsis', tag: 'Sepsis', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', description: 'Reanimación hídrica urgente + Ceftriaxona/Pip-Tazo + soporte hemodinámico.' },
  { id: 'sirs', name: 'SIRS (Respuesta Inflamatoria Sistémica)', category: 'Sepsis', tag: 'SIRS', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40', description: 'Hemocultivos tempranos + fluidoterapia guiada por metas + antibióticos dirigidos.' },
  { id: 'news2', name: 'NEWS2 (Deterioro Clínico Agudo)', category: 'Urgencias', tag: 'NEWS2', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40', description: 'Monitoreo continuo cada 30 min + escalonamiento a sala de reanimación/UCI.' },
  { id: 'centor', name: 'Criterios de Centor / McIsaac (Faringitis Estreptocócica)', category: 'Infeccioso', tag: 'Faringitis', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', description: 'Penicilina Benzatínica IM o Amoxi/Clavulánico + Antiinflamatorio + Aislamiento relativo.' },
  { id: 'heart', name: 'HEART Score (Dolor Torácico / Síndrome Coronario)', category: 'Cardiología', tag: 'SCA / IAM', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', description: 'AAS 300mg + Clopidogrel 300mg + Nitroglicerina + Enoxaparina + ECG seriado.' },
  { id: 'timi', name: 'TIMI Score (Riesgo Coronario Agudo)', category: 'Cardiología', tag: 'TIMI', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', description: 'Estratificación invasiva precoz + doble antiagregación + anticoagulación parenteral.' },
  { id: 'cha2ds2vasc', name: 'CHA2DS2-VASc (Fibrilación Auricular)', category: 'Cardiología', tag: 'FA / ACV', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40', description: 'Anticoagulación oral preventiva directa (DOAC) + control de frecuencia ventricular.' },
  { id: 'hasbled', name: 'HAS-BLED (Riesgo Hemorrágico)', category: 'Cardiología', tag: 'Hemorragia', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', description: 'Monitoreo de factores modificables de sangrado + ajuste cuidadoso de dosis anticoagulante.' },
  { id: 'nyha', name: 'NYHA (Insuficiencia Cardíaca Congestiva)', category: 'Cardiología', tag: 'ICC', badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40', description: 'Furosemida IV + Espironolactona + IECA/ARA-II + restricción hidrosalina estricta.' },
  { id: 'curb65', name: 'CURB-65 (Neumonía Adquirida en Comunidad)', category: 'Neumonía', tag: 'Neumonía', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40', description: 'Ceftriaxona + Azitromicina/Claritromicina + O2 humidificado + broncodilatadores.' },
  { id: 'wells', name: 'Criterios de Wells (Tromboembolismo Pulmonar / TVP)', category: 'Cardiovascular', tag: 'TEP / TVP', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40', description: 'Enoxaparina 1 mg/kg SC c/12h + AngioTAC de tórax urgente + monitorización continua.' },
  { id: 'geneva', name: 'Score de Ginebra (Probabilidad TEP)', category: 'Respiratorio', tag: 'Ginebra TEP', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40', description: 'Dímero D ultrasensible + AngioTAC + anticoagulación preventiva inmediata.' },
  { id: 'gina_asthma', name: 'GINA (Crisis Asmática Aguda Severa)', category: 'Respiratorio', tag: 'Crisis Asma', badgeColor: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40', description: 'Salbutamol + Ipratropio nebulizados + Hidrocortisona/Prednisona sistémica + O2.' },
  { id: 'gold_epoc', name: 'GOLD / Anthonisen (Exacerbación de EPOC)', category: 'Respiratorio', tag: 'EPOC', badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-600/40', description: 'Broncodilatadores duales + Corticoide sistémico corto + Amoxi/Clavulánico si esputo purulento.' },
  { id: 'glasgow', name: 'Escala de Coma de Glasgow (TCE & Conciencia)', category: 'Neurología', tag: 'GCS / TCE', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40', description: 'Protección de vía aérea si GCS ≤ 8 + Manitol/Salino hipertónico si HIC + TAC de cráneo.' },
  { id: 'nihss', name: 'NIHSS (Código Ictus / ACV Isquémico)', category: 'Neurología', tag: 'Código Ictus', badgeColor: 'bg-rose-600/20 text-rose-300 border-rose-600/40', description: 'TAC cerebral simple urgente sin contraste + ventana de trombolisis con rtPA (< 4.5h).' },
  { id: 'abcd2', name: 'Score ABCD2 (Riesgo ACV post-AIT)', category: 'Neurología', tag: 'AIT / ACV', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40', description: 'Doble antiagregación precoz (AAS + Clopidogrel x 21d) + Doppler carotídeo + Holter.' },
  { id: 'alvarado', name: 'Escala de Alvarado / MANTRELS (Apendicitis Aguda)', category: 'Cirugía', tag: 'Apendicitis', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40', description: 'NPO estricto + Ringer Lactato IV + Ciprofloxacino/Metronidazol + Valoración Quirúrgica.' },
  { id: 'air_score', name: 'AIR Score (Respuesta Inflamatoria Apendicular)', category: 'Cirugía', tag: 'AIR Score', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', description: 'Estratificación de riesgo apendicular + PCR seriada + ecografía/TAC abdominal.' },
  { id: 'childpugh', name: 'Child-Pugh (Cirrosis / Falla Hepática)', category: 'Hepatología', tag: 'Cirrosis', badgeColor: 'bg-amber-700/20 text-amber-300 border-amber-700/40', description: 'Lactulosa + Rifaximina + Espironolactona + restricción de sodio estricta.' },
  { id: 'meld', name: 'MELD Score (Hepatopatía Terminal)', category: 'Hepatología', tag: 'MELD', badgeColor: 'bg-orange-600/20 text-orange-300 border-orange-600/40', description: 'Optimización de función renal + profilaxis PBE + evaluación de trasplante hepático.' },
  { id: 'ranson', name: 'Criterios de Ranson / BISAP (Pancreatitis Aguda)', category: 'Gastroenterología', tag: 'Pancreatitis', badgeColor: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40', description: 'Hidratación parenteral intensiva con Ringer Lactato (200-250 mL/h) + analgesia + reposo gástrico.' },
  { id: 'rockall', name: 'Score de Rockall / Glasgow-Blatchford (HDA)', category: 'Gastroenterología', tag: 'HDA', badgeColor: 'bg-red-600/20 text-red-300 border-red-600/40', description: 'Omeprazol bolo 80mg + infusión 8mg/h + Endoscopía alta de urgencia (< 24h).' },
  { id: 'silverman', name: 'Silverman-Andersen (Distrés Respiratorio Infantil)', category: 'Pediatría', tag: 'Distrés Resp.', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', description: 'Oxigenoterapia en cánula/CPAP + posición semifowler + hidratación parenteral.' },
  { id: 'apgar', name: 'Score de APGAR (Reanimación Perinatal)', category: 'Pediatría', tag: 'APGAR', badgeColor: 'bg-teal-400/20 text-teal-300 border-teal-400/40', description: 'Secado, estimulación térmica, permeabilización y ventilación con presión positiva si APGAR < 7.' },
  { id: 'wood_downes', name: 'Wood-Downes-Ferrés (Bronquiolitis Aguda)', category: 'Pediatría', tag: 'Bronquiolitis', badgeColor: 'bg-blue-400/20 text-blue-300 border-blue-400/40', description: 'Solución Salina Hipertónica 3% nebulizada + lavado nasal + O2 humidificado.' },
  { id: 'westley', name: 'Score de Westley (Crup Laríngeo / Laringotraqueítis)', category: 'Pediatría', tag: 'Crup', badgeColor: 'bg-purple-400/20 text-purple-300 border-purple-400/40', description: 'Dexametasona 0.6 mg/kg VO/IM dosis única + Adrenalina nebulizada 1:1000.' },
  { id: 'kdigo', name: 'KDIGO / RIFLE (Lesión Renal Aguda / AKI)', category: 'Nefrología', tag: 'AKI / Renal', badgeColor: 'bg-lime-500/20 text-lime-300 border-lime-500/40', description: 'Suspensión de nefrotóxicos + balance hídrico estricto + ajuste renal de posología.' },
  { id: 'hyperkalemia', name: 'Protocolo de Hiperpotasemia Aguda con Cambios ECG', category: 'Nefrología', tag: 'Hiperkalemia', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', description: 'Gluconato de Calcio 10% IV (estabilizador de membrana) + Insulina rápida en Dextrosa 10% + Salbutamol nebulizado.' },
  { id: 'parkland', name: 'Fórmula de Parkland (Grandes Quemados)', category: 'Trauma', tag: 'Parkland', badgeColor: 'bg-orange-600/20 text-orange-300 border-orange-600/40', description: 'Ringer Lactato: 4 mL x kg x % SCTQ (50% en primeras 8h, 50% en siguientes 16h).' },
  { id: 'rts', name: 'Revised Trauma Score (RTS Politrauma)', category: 'Trauma', tag: 'RTS / Trauma', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40', description: 'Protocolo ATLS: A-B-C-D-E + collarín cervical + reposición de volumen y empaquetamiento.' }
];

const SCALE_CATEGORIES = [
  { id: 'TODOS', label: 'Todas' },
  { id: 'Urgencias & Sepsis', label: '🚨 Urgencias & Sepsis', categories: ['Sepsis', 'Urgencias', 'Infeccioso'] },
  { id: 'Cardiología', label: '❤️ Cardiología', categories: ['Cardiología', 'Cardiovascular'] },
  { id: 'Respiratorio', label: '🫁 Respiratorio', categories: ['Respiratorio', 'Neumonía'] },
  { id: 'Neurología', label: '🧠 Neurología', categories: ['Neurología'] },
  { id: 'Gastroenterología', label: '🩺 Digestivo & Cirugía', categories: ['Gastroenterología', 'Cirugía', 'Hepatología'] },
  { id: 'Pediatría', label: '👶 Pediatría', categories: ['Pediatría'] },
  { id: 'Nefrología & Trauma', label: '🧪 Renal & Trauma', categories: ['Nefrología', 'Trauma'] },
];

export default function PatientTreatmentSection({
  patient,
  onSaveToEMR,
  onUpdatePatient,
  onOpenNewPatientModal
}: PatientTreatmentSectionProps) {
  if (!patient) {
    return (
      <div className="bg-brand-navy-light/40 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-5 max-w-xl mx-auto my-6 backdrop-blur-md animate-fade-in shadow-2xl">
        <div className="w-16 h-16 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal rounded-full flex items-center justify-center mx-auto">
          <Pill className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white font-display">Ningún Paciente Seleccionado</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Seleccione un paciente de la lista o registre un nuevo paciente para diagnosticar el tratamiento, calcular dosis pediátricas/adulto y ajustar medicamentos.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          {onOpenNewPatientModal && (
            <button
              type="button"
              onClick={onOpenNewPatientModal}
              className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-5 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-teal/20"
            >
              <Plus className="w-4 h-4" /> Registrar Nuevo Paciente
            </button>
          )}
        </div>
      </div>
    );
  }

  const isPediatric = (patient.patientCategory || (patient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')) === 'PEDIÁTRICO';
  const weight = Number(patient.weight) || (isPediatric ? 15 : 70);
  const vitals = patient.vitalSigns;
  const temp = vitals?.temperature ?? 36.5;
  const pain = vitals?.painEva ?? 0;
  const spo2 = vitals?.oxygenSaturation ?? 98;
  const glycemia = vitals?.glycemia ?? 100;
  const hr = vitals?.heartRate ?? 80;
  const bp = vitals?.bloodPressure || '120/80';
  const rr = vitals?.respiratoryRate ?? 18;
  const glasgowTotal = vitals?.glasgow 
    ? (typeof vitals.glasgow === 'object' ? vitals.glasgow.total : vitals.glasgow) 
    : 15;
  const allergies = patient.allergies || patient.alerts?.allergies || [];
  const chronicDiseases = patient.preExistingConditions || patient.alerts?.chronicDiseases || [];

  // BMI Calculation
  const heightM = patient.height ? patient.height / 100 : 1.70;
  const bmiVal = (weight / (heightM * heightM)).toFixed(1);
  const bmiNum = parseFloat(bmiVal);
  let bmiCategory = 'Normal';
  let bmiColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (!isNaN(bmiNum)) {
    if (bmiNum < 18.5) {
      bmiCategory = 'Bajo peso';
      bmiColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    } else if (bmiNum >= 18.5 && bmiNum < 25) {
      bmiCategory = 'Normal';
      bmiColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    } else if (bmiNum >= 25 && bmiNum < 30) {
      bmiCategory = 'Sobrepeso';
      bmiColor = 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30';
    } else {
      bmiCategory = 'Obesidad';
      bmiColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }
  }

  // Active Tab within Treatment
  const [activeTab, setActiveTab] = useState<'farmacos' | 'conducta' | 'pruebas' | 'alarmas' | 'calculadora'>('farmacos');
  
  // Selected Medical Scale (Optional)
  const [selectedScale, setSelectedScale] = useState<string>('none');
  const [isScaleDropdownOpen, setIsScaleDropdownOpen] = useState(false);
  const [scaleSearchQuery, setScaleSearchQuery] = useState('');
  const [scaleCategoryFilter, setScaleCategoryFilter] = useState<string>('TODOS');
  const scaleDropdownRef = useRef<HTMLDivElement>(null);

  // Close scale dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (scaleDropdownRef.current && !scaleDropdownRef.current.contains(event.target as Node)) {
        setIsScaleDropdownOpen(false);
      }
    };
    if (isScaleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isScaleDropdownOpen]);

  // Treatment components
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [conductText, setConductText] = useState<string>('');
  const [testsText, setTestsText] = useState<string>('');
  const [alarmsText, setAlarmsText] = useState<string>('');
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToEmr, setSavedToEmr] = useState(false);

  // Vademecum Dropdown State
  const [isVademecumOpen, setIsVademecumOpen] = useState(false);
  const [vademecumSearch, setVademecumSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS');

  // Dose Calculator State
  const [calcWeight, setCalcWeight] = useState<number>(weight);
  const [calcMgPerKg, setCalcMgPerKg] = useState<number>(15);
  const [calcConcentrationMg, setCalcConcentrationMg] = useState<number>(120);
  const [calcConcentrationMl, setCalcConcentrationMl] = useState<number>(5);
  const [calcFrequency, setCalcFrequency] = useState<string>('Cada 8 horas');
  const [calcDrugName, setCalcDrugName] = useState<string>('Paracetamol Jarabe');

  // Sync weight when patient changes
  useEffect(() => {
    setCalcWeight(Number(patient.weight) || (isPediatric ? 15 : 70));
  }, [patient.id, patient.weight, isPediatric]);

  // Initial Calculation based on patient data & vital signs
  const generateInitialScheme = () => {
    setSelectedScale('none');
    const hasPenicillinAllergy = allergies.some(a => a.toLowerCase().includes('penicil') || a.toLowerCase().includes('amoxi'));
    const initialMeds: MedicationItem[] = [];

    if (isPediatric) {
      const paracetamolMg = Math.round(weight * 15);
      const paracetamolMl = ((paracetamolMg * 5) / 120).toFixed(1);
      const ibuprofenoMg = Math.round(weight * 10);
      const ibuprofenoMl = ((ibuprofenoMg * 5) / 100).toFixed(1);
      const amoxiMgPerDose = Math.round((weight * 45) / 3);
      const amoxiMlPerDose = ((amoxiMgPerDose * 5) / 250).toFixed(1);

      initialMeds.push({
        name: 'Paracetamol (Jarabe 120 mg / 5 mL)',
        indication: temp >= 37.8 ? 'Fiebre activa / Antipirético primera línea' : 'Analgésico / Antipirético sintomático',
        doseMg: `${paracetamolMg} mg`,
        volumeMl: `${paracetamolMl} mL`,
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 6 a 8 horas',
        duration: '3 a 5 días',
        notes: 'Administrar con T° > 37.5 °C o en caso de dolor.'
      });

      if (pain > 0 || temp >= 37.8) {
        initialMeds.push({
          name: 'Ibuprofeno (Suspensión 100 mg / 5 mL)',
          indication: 'Antiinflamatorio / Analgésico coadyuvante',
          doseMg: `${ibuprofenoMg} mg`,
          volumeMl: `${ibuprofenoMl} mL`,
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 8 horas con alimentos',
          duration: '3 días',
          notes: 'Alternar con paracetamol si persiste la fiebre.'
        });
      }

      if (!hasPenicillinAllergy) {
        initialMeds.push({
          name: 'Amoxicilina (Jarabe 250 mg / 5 mL)',
          indication: 'Antibiótico de amplio espectro (si hay foco infeccioso bacteriano)',
          doseMg: `${amoxiMgPerDose} mg`,
          volumeMl: `${amoxiMlPerDose} mL`,
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 8 horas',
          duration: '7 a 10 días',
          notes: 'Completar esquema completo según indicación del médico.'
        });
      } else {
        const azitroMg = Math.round(weight * 10);
        const azitroMl = ((azitroMg * 5) / 200).toFixed(1);
        initialMeds.push({
          name: 'Azitromicina (Suspensión 200 mg / 5 mL)',
          indication: 'Macrólido alternativo (Alergia a Penicilinas)',
          doseMg: `${azitroMg} mg`,
          volumeMl: `${azitroMl} mL`,
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 24 horas',
          duration: '3 a 5 días',
          notes: 'Tomar 1 hora antes o 2 horas después de comidas.'
        });
      }

      initialMeds.push({
        name: 'Sales de Rehidratación Oral (SRO)',
        indication: 'Mantenimiento hidroelectrolítico y prevención de deshidratación',
        doseMg: '50 - 100 mL / kg',
        volumeMl: 'A demanda',
        route: 'Vía Oral a sorbos pequeños',
        frequency: 'A libre demanda tras cada evacuación o episodio febril',
        duration: 'Durante el cuadro agudo',
        notes: 'Plan A de rehidratación oral.'
      });
    } else {
      // Adult
      initialMeds.push({
        name: 'Paracetamol Tabletas 500 mg - 1 g',
        indication: temp >= 37.8 ? 'Antipirético / Analgésico' : 'Analgésico de primera línea',
        doseMg: '500 mg a 1000 mg',
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 8 horas (Máx. 4g/día)',
        duration: '3 a 5 días',
        notes: 'Tomar con abundante agua.'
      });

      initialMeds.push({
        name: 'Ibuprofeno Tabletas 400 mg / Ketorolaco 10 mg',
        indication: 'Antiinflamatorio y analgésico sintomático',
        doseMg: '400 mg',
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 8 horas tras comidas',
        duration: '3 a 5 días',
        notes: 'Precaución en insuficiencia renal o úlcera gástrica.'
      });

      initialMeds.push({
        name: 'Omeprazol Cápsulas 20 mg',
        indication: 'Protector gástrico / Inhibidor de la bomba de protones',
        doseMg: '20 mg',
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 24 horas en ayunas',
        duration: '7 a 14 días',
        notes: 'Tomar 30 minutos antes del desayuno.'
      });

      if (!hasPenicillinAllergy) {
        initialMeds.push({
          name: 'Amoxicilina + Ácido Clavulánico 875/125 mg Tabletas',
          indication: 'Tratamiento antibiótico de cobertura amplia',
          doseMg: '1 Tableta (875/125 mg)',
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 12 horas',
          duration: '7 a 10 días',
          notes: 'Tomar al inicio de una comida principal.'
        });
      } else {
        initialMeds.push({
          name: 'Levofloxacino 500 mg / Azitromicina 500 mg',
          indication: 'Antibiótico alternativo para alérgicos a Penicilinas',
          doseMg: '500 mg',
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 24 horas',
          duration: '5 a 7 días',
          notes: 'Monitorear respuesta clínica.'
        });
      }
    }

    if (spo2 < 95) {
      initialMeds.unshift({
        name: 'Oxigenoterapia por Cánula Nasal',
        indication: 'Corrección de Hipoxemia (SpO2 < 95%)',
        doseMg: '2 a 4 Litros / minuto',
        route: 'Inhalatoria',
        frequency: 'Continua',
        duration: 'Hasta SpO2 ≥ 95%',
        notes: '🚨 Monitorear patrón respiratorio y pulsioximetría continua.'
      });
    }

    if (glycemia < 70) {
      initialMeds.unshift({
        name: 'Dextrosa al 10% / Solución Glucosada',
        indication: 'Corrección inmediata de Hipoglucemia (< 70 mg/dL)',
        doseMg: isPediatric ? `${(weight * 2).toFixed(0)} mL Dextrosa 10% IV bolus` : '50 mL Dextrosa 33% IV o oral',
        route: 'Intravenosa / Vía Oral',
        frequency: 'Inmediata',
        duration: 'Reevaluar en 15 minutos',
        notes: '🚨 Repetir glucometría capilar en 15 min.'
      });
    }

    setMedications(initialMeds);
    setConductText(
      `1. Mantener posición Semifowler (30°).\n` +
      `2. Monitorear signos vitales cada ${isPediatric ? '2' : '4'} horas.\n` +
      `3. Hidratación oral abundante (2.5L/día) o SRO a libre demanda.\n` +
      `4. Vigilancia de diuresis estricta (> ${isPediatric ? '1.5' : '0.5'} mL/kg/h).\n` +
      `5. Administrar antipiréticos/analgésicos si T° > 37.5°C o dolor EVA ≥ 3.`
    );
    setTestsText(
      `• Biometría Hemática Completa (BHC)\n` +
      `• Proteína C Reactiva (PCR) / VSG\n` +
      `• Química Sanguínea (Glucosa, Urea, Creatinina)\n` +
      `• Examen General de Orina (EGO)\n` +
      `• Radiografía de Tórax PA / Ecografía Abdominal (según criterio médico)`
    );
    setAlarmsText(
      `🚨 Dificultad Respiratoria (Tiraje intercostal, taquipnea o SpO2 < 92%)\n` +
      `🚨 Somnolencia marcada o alteración del estado mental (Glasgow < 14)\n` +
      `🚨 Fiebre persistente > 38.5°C resistente a antipiréticos por > 48h\n` +
      `🚨 Vómitos incoercibles o intolerancia completa a la vía oral\n` +
      `🚨 Convulsiones o rigidez de nuca`
    );
    setIsEditing(false);
    setSavedToEmr(false);
  };

  // Apply Medical Scale & Auto-Adjust Treatment (Prompt Mandate)
  const applyScaleAdaptation = (scaleId: string) => {
    setSelectedScale(scaleId);

    if (scaleId === 'none') {
      generateInitialScheme();
      return;
    }

    const hasPenicillinAllergy = allergies.some(a => a.toLowerCase().includes('penicil') || a.toLowerCase().includes('amoxi'));
    let adaptedMeds: MedicationItem[] = [];
    let conduct = '';
    let tests = '';
    let alarms = '';

    if (scaleId === 'qsofa') {
      // Sepsis / Choque Séptico
      adaptedMeds = [
        {
          name: 'Cristaloides (Solución Salina 0.9% o Ringer Lactato)',
          indication: 'Reanimación hídrica agresiva urgente (30 mL/kg en primeras 3 horas)',
          doseMg: `${Math.round(weight * 30)} mL IV`,
          volumeMl: `${Math.round(weight * 30)} mL`,
          route: 'Intravenosa (IV rápida)',
          frequency: 'En primeras 3 horas',
          duration: 'Reevaluación hemodinámica continua',
          notes: 'Meta: PAM ≥ 65 mmHg y diuresis > 0.5 mL/kg/h.'
        },
        {
          name: !hasPenicillinAllergy ? 'Ceftriaxona 2g IV + Ampicilina 2g IV' : 'Levofloxacino 750 mg IV / Vancomicina',
          indication: 'Antibioticoterapia de amplio espectro en la 1ra hora',
          doseMg: isPediatric ? `${Math.round(weight * 100)} mg/día IV` : '2 g IV QD',
          route: 'Intravenosa (IV)',
          frequency: isPediatric ? 'Cada 12 horas' : 'Cada 24 horas',
          duration: '7 a 14 días',
          notes: 'Tomar hemocultivos antes de iniciar 1ra dosis.'
        },
        {
          name: 'Paracetamol IV / V.O.',
          indication: 'Control térmico y respuesta inflamatoria',
          doseMg: isPediatric ? `${Math.round(weight * 15)} mg` : '1000 mg IV',
          route: 'Vía Intravenosa / Oral',
          frequency: 'Cada 6 horas',
          duration: 'Según curva térmica',
          notes: 'Evitar AINEs en contexto de hipotensión o fallo renal.'
        },
        {
          name: 'Omeprazol 40 mg IV',
          indication: 'Profilaxis de úlceras por estrés en paciente crítico',
          doseMg: isPediatric ? `${Math.round(weight * 1)} mg` : '40 mg IV',
          route: 'Intravenosa',
          frequency: 'Cada 24 horas',
          duration: 'Durante estancia crítica',
          notes: 'Diluir en 100 mL Solución Salina.'
        }
      ];

      conduct = 
        `1. INGRESO INMEDIATO A SALA DE REANIMACIÓN / SHOCK ROOM O UCI.\n` +
        `2. Colocar 2 vías periféricas de grueso calibre (16G o 18G) o CVC.\n` +
        `3. Sonda Vesical Foley con medición horaria estricta de diuresis (Meta > 0.5 mL/kg/h).\n` +
        `4. Monitoreo hemodinámico invasivo/no invasivo continuo: PA, FC, SpO2, FR, T°, Glasgow cada 15-30 min.\n` +
        `5. Iniciar Norepinefrina 0.05-0.5 mcg/kg/min si PAM < 65 mmHg tras carga inicial de fluidos.\n` +
        `6. Oxigenoterapia para mantener SpO2 ≥ 95%.`;

      tests = 
        `• Lactato sérico arterial o venoso (repetir en 2 a 4h)\n` +
        `• Hemocultivos x 2 tomas de sitios diferentes (previo a antibiótico)\n` +
        `• Urocultivo y cultivo de secreciones/esputo\n` +
        `• Biometría Hemática Completa con recuento plaquetario y fórmula leucocitaria\n` +
        `• Gasometría Arterial con cálculo de PaO2/FiO2\n` +
        `• Función Renal y Hepática (Urea, Creatinina, Bilirrubinas, TGO, TGP)\n` +
        `• Tiempos de Coagulación (TP, TTP, INR, Fibrinógeno)\n` +
        `• Procalcitonina (PCT) y Proteína C Reactiva (PCR)\n` +
        `• Radiografía de Tórax portátil y Ecografía FAST`;

      alarms = 
        `🚨 PAM < 65 mmHg persistente refractaria a volumen\n` +
        `🚨 Lactato sérico > 2 mmol/L o ascenso progresivo\n` +
        `🚨 Oliguria (< 0.5 mL/kg/h por > 2 horas consecutivas)\n` +
        `🚨 Deterioro del sensorio (Glasgow < 13)\n` +
        `🚨 Acidosis metabólica severa (pH < 7.20)`;

    } else if (scaleId === 'curb65') {
      // Neumonía Adquirida en Comunidad
      adaptedMeds = [
        {
          name: !hasPenicillinAllergy ? 'Ceftriaxona 2g IV + Claritromicina 500mg IV/VO' : 'Levofloxacino 750 mg IV / VO',
          indication: 'Terapia combinada para Neumonía Adquirida en Comunidad con criterios de gravedad',
          doseMg: isPediatric ? `Ceftriaxona ${Math.round(weight * 80)} mg/día + Azitromicina ${Math.round(weight * 10)} mg/día` : 'Ceftriaxona 2g IV QD + Claritromicina 500mg BID',
          route: 'Intravenosa / Vía Oral',
          frequency: 'Cada 12 a 24 horas',
          duration: '7 a 10 días',
          notes: 'Monitorear defervescencia y mejoría auscultatoria.'
        },
        {
          name: 'Salbutamol + Bromuro de Ipratropio (Nebulizaciones)',
          indication: 'Broncodilatación y aclaramiento mucociliar',
          doseMg: isPediatric ? '10 a 15 gotas en 3 mL Sol. Salina' : '2.5 mg / 0.5 mg en 3 mL SS 0.9%',
          route: 'Inhalatoria / Nebulizada',
          frequency: 'Cada 6 a 8 horas',
          duration: '5 días',
          notes: 'Nebulizar con flujo de O2 a 6-8 L/min.'
        },
        {
          name: 'Paracetamol 500mg - 1g',
          indication: 'Control de fiebre y dolor pleurítico',
          doseMg: isPediatric ? `${Math.round(weight * 15)} mg` : '1 g VO/IV',
          route: 'Oral / IV',
          frequency: 'Cada 8 horas',
          duration: '3 a 5 días',
          notes: 'Evitar sedantes o antitusígenos de acción central.'
        },
        {
          name: 'Oxigenoterapia con humidificación',
          indication: 'Soporte ventilatorio no invasivo para mantener SpO2 ≥ 94%',
          doseMg: '2 a 5 L/min',
          route: 'Cánula nasal o Mascarilla Venturi',
          frequency: 'Continua',
          duration: 'Hasta estabilidad gasométrica',
          notes: 'Titular FiO2 según oximetría continua.'
        }
      ];

      conduct = 
        `1. Hospitalización en sala de Medicina Interna / Neumología (o UCI si CURB-65 ≥ 3).\n` +
        `2. Posición Fowler a 45° con cambios posturales y fisioterapia respiratoria.\n` +
        `3. Hidratación parenteral normosalina 1500-2000 mL/24h adaptada a balance hídrico.\n` +
        `4. Monitoreo continuo de SpO2, FR, FC y mecánica ventilatoria.\n` +
        `5. Reevaluación clínica a las 48-72 horas para valorar cambio a vía oral.`;

      tests = 
        `• Radiografía de Tórax PA y Lateral (o TAC de tórax si duda diagnóstica)\n` +
        `• Biometría Hemática con leucograma completo\n` +
        `• PCR y Procalcitonina cuantitativa\n` +
        `• Baciloscopía seriada de esputo / Panel molecular respiratorio\n` +
        `• Antígeno urinario para Streptococcus pneumoniae y Legionella\n` +
        `• Gasometría arterial basal`;

      alarms = 
        `🚨 Frecuencia respiratoria > 30 rpm o taquipnea extrema\n` +
        `🚨 Caída de SpO2 < 90% con aporte suplementario de O2\n` +
        `🚨 Confusión mental de nuevo inicio o desorientación\n` +
        `🚨 Hipotensión sistólica < 90 mmHg o diastólica ≤ 60 mmHg\n` +
        `🚨 Cianosis peribucal o tiraje supraclavicular/intercostal`;

    } else if (scaleId === 'alvarado') {
      // Apendicitis Aguda
      adaptedMeds = [
        {
          name: 'Solución Ringer Lactato / Salina 0.9% IV',
          indication: 'Hidratación parenteral y reposición hidroelectrolítica de urgencia',
          doseMg: isPediatric ? `${Math.round(weight * 20)} mL/kg bolo y mantención` : '2000 a 2500 mL / 24 horas IV',
          volumeMl: isPediatric ? `${Math.round(weight * 20)} mL` : '2000 mL',
          route: 'Intravenosa',
          frequency: 'Infusión continua (100-120 mL/h)',
          duration: 'Hasta resolución quirúrgica',
          notes: 'Mantener diuresis clara.'
        },
        {
          name: !hasPenicillinAllergy ? 'Ampicilina/Sulbactam 1.5g - 3g IV (o Ciprofloxacino 400mg + Metronidazol 500mg IV)' : 'Ciprofloxacino 400mg IV + Metronidazol 500mg IV',
          indication: 'Profilaxis / Tratamiento antibiótico de flora colónica mixta',
          doseMg: isPediatric ? `Ampicilina/Sulbactam ${Math.round(weight * 50)} mg/dosis IV` : 'Ampicilina Sulbactam 1.5g IV c/8h',
          route: 'Intravenosa',
          frequency: 'Cada 8 horas',
          duration: 'Según hallazgo operatorio (1 a 5 días)',
          notes: 'Administrar primera dosis previa al ingreso a quirófano.'
        },
        {
          name: 'Ketorolaco 30 mg IV / Paracetamol 1g IV',
          indication: 'Analgesia intravenosa controlada (tras evaluación quirúrgica formal)',
          doseMg: isPediatric ? `${Math.round(weight * 0.5)} mg Ketorolaco o ${Math.round(weight * 15)} mg Paracetamol` : '30 mg IV Ketorolaco',
          route: 'Intravenosa',
          frequency: 'Cada 8 horas',
          duration: '1 a 3 días',
          notes: 'No administrar opioides mayores antes del examen por Cirugía.'
        },
        {
          name: 'Metoclopramida 10 mg IV / Ondansetrón 4-8 mg IV',
          indication: 'Control de náuseas, vómitos y prevención de broncoaspiración',
          doseMg: isPediatric ? `${(weight * 0.15).toFixed(1)} mg Ondansetrón` : '8 mg Ondansetrón IV',
          route: 'Intravenosa lenta',
          frequency: 'Cada 8 horas en caso de náusea',
          duration: 'SOS',
          notes: 'Administrar en bolo lento 3-5 minutos.'
        }
      ];

      conduct = 
        `1. NADA POR VÍA ORAL (NPO ESTRICTO) de inmediato.\n` +
        `2. Interconsulta urgente con especialista en CIRUGÍA GENERAL / PEDIÁTRICA para programación de Apendicectomía.\n` +
        `3. Reposo absoluto en cama con cabecera a 30°.\n` +
        `4. Canalizar 2 vías venosas periféricas de buen calibre.\n` +
        `5. NO aplicar calor local ni administrar laxantes o enemas.\n` +
        `6. Consentimiento informado quirúrgico y pruebas prequirúrgicas completas.`;

      tests = 
        `• Ecografía Abdomen Total / Fosa Ilíaca Derecha (o TAC abdominal contrastada si duda)\n` +
        `• Biometría Hemática con leucocitosis y desviación a la izquierda (neutrofilia > 75%)\n` +
        `• Tiempos de coagulación (TP, TTP, INR) y Grupo Sanguíneo + Factor Rh\n` +
        `• Química sanguínea (Glucosa, Urea, Creatinina, Electrolitos séricos)\n` +
        `• Examen General de Orina (descartar litiasis o ITU)\n` +
        `• Prueba de embarazo en orina o sangre (en mujeres en edad fértil)`;

      alarms = 
        `🚨 Dolor abdominal que se generaliza a todo el abdomen con abdomen en tabla (signos de peritonitis)\n` +
        `🚨 Fiebre en picos > 38.5°C con taquicardia persistente\n` +
        `🚨 Vómitos fecaloideos o distensión abdominal severa\n` +
        `🚨 Signos de choque hipovolémico / séptico (hipotensión, palidez, frialdad distal)`;

    } else if (scaleId === 'centor') {
      // Faringoamigdalitis estreptocócica
      adaptedMeds = [
        {
          name: !hasPenicillinAllergy ? 'Penicilina Benzatínica 1.200.000 UI IM (o Amoxicilina/Clavulánico 875/125 mg VO)' : 'Azitromicina 500 mg VO (o Claritromicina 500 mg)',
          indication: 'Erradicación de Streptococcus pyogenes (Prevención de Fiebre Reumática)',
          doseMg: isPediatric 
            ? (!hasPenicillinAllergy ? `${weight < 27 ? '600.000 UI IM dosis única' : '1.200.000 UI IM dosis única'}` : `${Math.round(weight * 10)} mg/día Azitromicina`)
            : (!hasPenicillinAllergy ? '1.200.000 UI IM Dosis Única' : '500 mg VO QD x 3 días'),
          route: !hasPenicillinAllergy ? 'Intramuscular profunda (IM) / Vía Oral' : 'Vía Oral (V.O.)',
          frequency: !hasPenicillinAllergy ? 'Dosis Única IM (o cada 12h si oral)' : 'Cada 24 horas',
          duration: !hasPenicillinAllergy ? 'Dosis Única (o 10 días vía oral)' : '3 a 5 días',
          notes: 'Realizar prueba de sensibilidad si antecedentes alérgicos dudosos.'
        },
        {
          name: 'Ibuprofeno 400 mg / Paracetamol 500 mg',
          indication: 'Alivio de odinofagia intensa, inflamación y fiebre',
          doseMg: isPediatric ? `${Math.round(weight * 10)} mg Ibuprofeno` : '400 a 600 mg VO',
          route: 'Vía Oral con alimentos',
          frequency: 'Cada 8 horas',
          duration: '3 a 5 días',
          notes: 'Alternar con paracetamol si persiste molestia.'
        },
        {
          name: 'Bencidamina / Clorhexidina Colutorios o Spray Bucofaríngeo',
          indication: 'Antiséptico y anestésico tópico orofaríngeo',
          doseMg: '1 a 2 pulverizaciones / enjuagues',
          route: 'Tópica orofaríngea',
          frequency: 'Cada 6 a 8 horas tras comidas',
          duration: '3 a 5 días',
          notes: 'No tragar el líquido. Mantener en contacto 1 minuto.'
        }
      ];

      conduct = 
        `1. Aislamiento respiratorio relativo las primeras 24 horas de iniciado el antibiótico.\n` +
        `2. Dieta blanda, fría o tibia, no irritante, con abundante ingesta hídrica.\n` +
        `3. Reposo relativo en domicilio.\n` +
        `4. Cambiar cepillo de dientes a las 48h de iniciado el tratamiento.\n` +
        `5. Completar el esquema antibiótico íntegro para evitar glomerulonefritis o fiebre reumática.`;

      tests = 
        `• Test Rápido de Detección Antigénica de Estreptococo (RADT) o Frotis Faríngeo con Cultivo\n` +
        `• Biometría Hemática con diferencial (en casos atípicos o sospecha de Mononucleosis)\n` +
        `• PCR / VSG (opcional si mala evolución)`;

      alarms = 
        `🚨 Dificultad para deglutir saliva o trismus (imposibilidad para abrir la boca)\n` +
        `🚨 Desviación de la úvula o asimetría periamigdalina (sospecha de flemón/absceso)\n` +
        `🚨 Estridor respiratorio o disnea aguda\n` +
        `🚨 Rash escarlatiniforme cutáneo o dolor articular intenso`;

    } else if (scaleId === 'silverman') {
      // Silverman-Andersen (Distrés Infantil)
      adaptedMeds = [
        {
          name: 'Oxigenoterapia con Humidificación / Cánula Nasal de Alto Flujo',
          indication: 'Corrección inmediata de distrés respiratorio (Meta SpO2 93-96%)',
          doseMg: '0.5 a 3 Litros / min (según peso y edad)',
          route: 'Inhalatoria continua',
          frequency: 'Continua',
          duration: 'Hasta estabilidad respiratoria',
          notes: '🚨 O2 tibio y humidificado para prevenir enfriamiento y resequedad.'
        },
        {
          name: 'Solución Salina 0.9% Gotas Nasales + Aspiración suave',
          indication: 'Permeabilización de vía aérea superior',
          doseMg: '2 a 3 gotas en cada fosa nasal',
          route: 'Intranasal',
          frequency: 'Cada 4 a 6 horas y antes de tomas/alimentación',
          duration: 'Según secreciones',
          notes: 'Aspiración suave con perilla de goma.'
        },
        {
          name: 'Líquidos Parenterales de Mantenimiento (Glucosa 5% + Electrolitos)',
          indication: 'Hidratación intravenosa segura si hay taquipnea > 60 rpm',
          doseMg: `${Math.round(weight * 80)} a ${Math.round(weight * 100)} mL/kg/día`,
          volumeMl: `${Math.round(weight * 80)} mL/día`,
          route: 'Intravenosa continua',
          frequency: 'Continua por bomba de infusión',
          duration: 'Hasta poder reiniciar vía enteral',
          notes: 'Fraccionar tomas o suspender vía oral si FR > 60 rpm por riesgo de broncoaspiración.'
        }
      ];

      conduct = 
        `1. Hospitalización inmediata en Neonatología / Pediatría con monitor multiparámetro.\n` +
        `2. Posición Semifowler con cuello en ligera extensión (posición de olfateo).\n` +
        `3. Suspender alimentación por succión si FR > 60 rpm o tiraje severo (colocar sonda orogástrica).\n` +
        `4. Termorregulación estricta en cuna térmica / incubadora.\n` +
        `5. Evaluación horaria de Score de Silverman-Andersen.`;

      tests = 
        `• Radiografía de Tórax AP y Lateral\n` +
        `• Gasometría capilar o arterial\n` +
        `• Biometría Hemática con reactantes de fase aguda (PCR / PCT)\n` +
        `• Panel viral respiratorio (VSR, Influenza, Adenovirus)\n` +
        `• Glucemia capilar horaria`;

      alarms = 
        `🚨 Silverman-Andersen ≥ 4 (Distrés moderado-severo) o quejido espiratorio audible sin estetoscopio\n` +
        `🚨 Episodios de apnea (> 20 segundos) o bradicardia\n` +
        `🚨 Cianosis central persistente a pesar de aporte de O2\n` +
        `🚨 Agotamiento respiratorio o hipotonía marcada`;

    } else if (scaleId === 'wells') {
      // Wells - TEP / TVP
      adaptedMeds = [
        {
          name: 'Enoxaparina Sódica (HBPM)',
          indication: 'Anticoagulación terapéutica inmediata',
          doseMg: `${Math.round(weight * 1)} mg SC (1 mg/kg)`,
          volumeMl: `${(weight * 0.01).toFixed(2)} mL`,
          route: 'Subcutánea profunda en abdomen',
          frequency: 'Cada 12 horas',
          duration: 'Mínimo 5 días o hasta anticoagulación oral efectiva',
          notes: 'Ajustar a 1 mg/kg cada 24h si Clearance de Creatinina < 30 mL/min.'
        },
        {
          name: 'Oxigenoterapia para mantener SpO2 ≥ 95%',
          indication: 'Soporte oxigenatorio ante hipoxemia y aumento de espacio muerto',
          doseMg: '2 a 6 Litros / min',
          route: 'Inhalatoria continua',
          frequency: 'Continua',
          duration: 'Según pulsioximetría',
          notes: 'Monitorear trabajo ventilatorio.'
        },
        {
          name: 'Paracetamol 1g IV / VO',
          indication: 'Alivio del dolor pleurítico torácico',
          doseMg: '1000 mg',
          route: 'Intravenosa o Vía Oral',
          frequency: 'Cada 8 horas',
          duration: '3 días',
          notes: 'Evitar AINEs por riesgo de sangrado asociado a anticoagulantes.'
        }
      ];

      conduct = 
        `1. Reposo absoluto en cama sin flexión excesiva de miembros inferiores.\n` +
        `2. Traslado a Unidad de Cuidados Intermedios / Monitorización continua.\n` +
        `3. AngioTAC Pulmonar urgente (estándar de oro) o Ecografía Doppler venosa de MMII.\n` +
        `4. Monitoreo continuo de PA, FC, SpO2 y ECG.\n` +
        `5. Valorar criterios de trombolisis si se presenta inestabilidad hemodinámica / shock obstructivo.`;

      tests = 
        `• AngioTAC de Tórax con contraste (Gold Standard)\n` +
        `• Dímero D cuantitativo de alta sensibilidad\n` +
        `• Troponina I / T y BNP / NT-proBNP (estratificación de disfunción de VD)\n` +
        `• Ecocardiograma Transtorácico (valoración de sobrecarga de ventrículo derecho / signo de McConnell)\n` +
        `• Eco-Doppler Venoso de Miembros Inferiores\n` +
        `• Gasometría Arterial (alcalosis respiratoria + hipoxemia típica)`;

      alarms = 
        `🚨 Hipotensión súbita (PAS < 90 mmHg) o síncope (TEP masivo)\n` +
        `🚨 Taquicardia extrema (> 120 lpm) o arritmias ventriculares\n` +
        `🚨 Hemoptisis masiva o dolor torácico intolerable\n` +
        `🚨 Signos de sangrado mayor activo (digestivo o retroperitoneal)`;

    } else if (scaleId === 'heart') {
      // HEART Score / SCA
      adaptedMeds = [
        {
          name: 'Ácido Acetilsalicílico (Aspirina) 300 mg Tabletas',
          indication: 'Antiagregación plaquetaria inmediata en Síndrome Coronario Agudo',
          doseMg: '300 mg (Dosis de carga)',
          route: 'Vía Oral (Masticada)',
          frequency: 'Dosis única inmediata (luego 100 mg/día)',
          duration: 'Indefinida',
          notes: 'Masticar inmediatamente para absorción rápida.'
        },
        {
          name: 'Clopidogrel 300 mg (o Ticagrelor 180 mg)',
          indication: 'Doble antiagregación plaquetaria sinérgica',
          doseMg: '300 mg VO dosis de carga (luego 75 mg/día)',
          route: 'Vía Oral',
          frequency: 'Dosis única de carga',
          duration: '12 meses según indicación cardiológica',
          notes: 'Co-administrar con protector gástrico.'
        },
        {
          name: 'Nitroglicerina Sublingual 0.5 mg / Dinitrato Isosorbida 5 mg',
          indication: 'Vasodilatación coronaria y alivio de dolor anginoso',
          doseMg: '1 tableta sublingual',
          route: 'Sublingual',
          frequency: 'Cada 5 minutos (Máx. 3 tomas si PAS > 100 mmHg)',
          duration: 'SOS ante dolor torácico',
          notes: '🚨 CONTRAINDICADO si PAS < 90 mmHg, infarto de VD o uso de inhibidores de PDE-5.'
        },
        {
          name: 'Enoxaparina Sódica 1 mg/kg SC',
          indication: 'Anticoagulación sistémica en SCA',
          doseMg: `${Math.round(weight * 1)} mg SC`,
          route: 'Subcutánea',
          frequency: 'Cada 12 horas',
          duration: 'Hasta coronariografía / alta',
          notes: 'Ajustar si insuficiencia renal.'
        },
        {
          name: 'Atorvastatina 80 mg Tabletas',
          indication: 'Estabilización de placa ateromatosa y pleiotropismo',
          doseMg: '80 mg VO',
          route: 'Vía Oral',
          frequency: 'Cada 24 horas por la noche',
          duration: 'Crónica',
          notes: 'Dosis de alta intensidad.'
        }
      ];

      conduct = 
        `1. REPOSO ABSOLUTO EN CAMA Y MONITORIZACIÓN CARDIACA CONTINUA.\n` +
        `2. Electrocardiograma de 12 derivaciones en menos de 10 minutos de arribo (repetir cada 15-30 min si dolor persiste).\n` +
        `3. Canalizar 2 vías venosas periféricas.\n` +
        `4. Oxígeno suplementario ÚNICAMENTE si SpO2 < 90%.\n` +
        `5. Interconsulta prioritaria con Cardiología / Hemodinamia para estratificación invasiva.`;

      tests = 
        `• Troponinas de alta sensibilidad (T0h, T1h o T3h seriadas)\n` +
        `• ECG seriado de 12 derivaciones + derivaciones derechas (V3R, V4R) y posteriores (V7, V8)\n` +
        `• Perfil Lipídico, Glucosa, Creatinina, Electrolitos séricos\n` +
        `• Biometría Hemática y Coagulación\n` +
        `• Ecocardiograma Transtorácico de Urgencia`;

      alarms = 
        `🚨 Elevación del segmento ST persistente en ≥ 2 derivaciones contiguas (código infarto urgente)\n` +
        `🚨 Inestabilidad hemodinámica (hipotensión, edema pulmonar agudo, Killip III-IV)\n` +
        `🚨 Arritmias ventriculares malignas (TV sostenida o FV)\n` +
        `🚨 Dolor refractario a nitratos y analgesia`;

    } else if (scaleId === 'cha2ds2vasc') {
      // Fibrilación Auricular
      adaptedMeds = [
        {
          name: 'Apixabán 5 mg VO (o Rivaroxabán 20 mg VO / Dabigatrán 150 mg)',
          indication: 'Anticoagulante oral directo (DOAC) para prevención de ACV isquémico en FA',
          doseMg: '5 mg VO BID (2.5 mg si ≥2 de: edad ≥80, peso ≤60kg, creatinina ≥1.5)',
          route: 'Vía Oral con o sin alimentos',
          frequency: 'Cada 12 horas',
          duration: 'Tratamiento continuo / crónico',
          notes: 'No requiere monitorización rutinaria de INR.'
        },
        {
          name: 'Bisoprolol 2.5 a 5 mg VO (o Metoprolol / Carvedilol)',
          indication: 'Control de frecuencia ventricular en Fibrilación Auricular (Meta FC 80-100 lpm)',
          doseMg: '2.5 mg a 5 mg VO QD',
          route: 'Vía Oral',
          frequency: 'Cada 24 horas por la mañana',
          duration: 'Continuo',
          notes: 'Monitorear FC y PA. Suspender si FC < 50 lpm o bloqueo AV.'
        }
      ];

      conduct = 
        `1. Control electrocardiográfico ambulatorio o Holter ECG de 24 horas.\n` +
        `2. Ecocardiograma Transtorácico / Transesofágico para descartar trombos en aurícula izquierda.\n` +
        `3. Evaluación periódica de función renal y hepática para ajuste de DOAC.\n` +
        `4. Educación al paciente sobre signos de alarma hemorrágica.`;

      tests = 
        `• Electrocardiograma de 12 derivaciones de control\n` +
        `• Ecocardiograma Transtorácico (tamaño AI, FEVI, valvulopatías)\n` +
        `• Perfil Tiroideo (TSH, T4 libre) para descartar hipertiroidismo como detonante\n` +
        `• Función Renal (Creatinina, Clearance de Creatinina por Cockcroft-Gault)\n` +
        `• Biometría Hemática y Pruebas de Función Hepática`;

      alarms = 
        `🚨 Déficit neurológico focal repentino (pérdida de fuerza, disartria, asimetría facial -> Código Ictus)\n` +
        `🚨 Sangrado digestivo alto o bajo, hematuria macroscópica o epistaxis incoercible\n` +
        `🚨 Palpitaciones extremas con FC > 140 lpm y mareo o síncope`;

    } else if (scaleId === 'childpugh') {
      // Cirrosis Hepática
      adaptedMeds = [
        {
          name: 'Lactulosa Jarabe 66.7 g / 100 mL',
          indication: 'Tratamiento y profilaxis de Encefalopatía Hepática (Meta: 2 a 3 deposiciones blandas/día)',
          doseMg: '20 a 30 mL VO',
          volumeMl: '20 a 30 mL',
          route: 'Vía Oral',
          frequency: 'Cada 8 horas (titular según deposiciones)',
          duration: 'Crónica / Continua',
          notes: 'Ajustar dosis para lograr 2-3 evacuaciones pastosas diarias.'
        },
        {
          name: 'Rifaximina 550 mg Tabletas',
          indication: 'Antibiótico no absorbible reductor de bacterias productoras de amonio',
          doseMg: '550 mg VO',
          route: 'Vía Oral',
          frequency: 'Cada 12 horas',
          duration: 'Mantenimiento continuo',
          notes: 'Disminuye recurrencias de encefalopatía hepática.'
        },
        {
          name: 'Espironolactona 100 mg + Furosemida 40 mg VO',
          indication: 'Manejo de ascitis y edema secundario a hipertensión portal',
          doseMg: '100 mg Espironolactona + 40 mg Furosemida (Relación 100:40)',
          route: 'Vía Oral matutina',
          frequency: 'Cada 24 horas',
          duration: 'Según balance y peso diario',
          notes: 'Monitorear electrolitos séricos (Potasio y Sodio) semanalmente.'
        },
        {
          name: 'Propranolol 20 a 40 mg VO (o Carvedilol 6.25 - 12.5 mg)',
          indication: 'Profilaxis primaria/secundaria de hemorragia por várices esofágicas',
          doseMg: '20 mg VO BID (titular para reducir FC en 25%)',
          route: 'Vía Oral',
          frequency: 'Cada 12 horas',
          duration: 'Continuo',
          notes: 'Meta: FC reposo entre 55 y 60 lpm.'
        }
      ];

      conduct = 
        `1. Restricción estricta de sodio en la dieta (< 2 g NaCl al día o 88 mmol/día).\n` +
        `2. Dieta normoproteica (1.2 a 1.5 g/kg/día) basada en proteínas vegetales y lácteas.\n` +
        `3. Control de peso diario matutino en ayunas (pérdida máxima recomendada: 0.5 kg/día sin edema o 1 kg/día con edema).\n` +
        `4. Prohibición absoluta de consumo de alcohol y fármacos hepatotóxicos o AINEs.\n` +
        `5. Endoscopía Digestiva Alta para pesquisa de várices esofágicas.`;

      tests = 
        `• Perfil Hepático Completo (Bilirrubina total y fraccionada, Albúmina, TGO, TGP, FA, GGT)\n` +
        `• Tiempos de coagulación (TP, INR)\n` +
        `• Electrolitos séricos (Sodio, Potasio) y Función Renal (Urea, Creatinina)\n` +
        `• Ecografía Doppler Hepática y de Vena Porta (con despistaje de hepatocarcinoma por Alfa-fetoproteína cada 6 meses)\n` +
        `• Paracentesis diagnóstica si ascitis de novo o sospecha de Peritonitis Bacteriana Espontánea (PBE)`;

      alarms = 
        `🚨 Desorientación témporo-espacial, asterixis (flapping tremor) o letargia (Encefalopatía Grado II-IV)\n` +
        `🚨 Hematemesis o deposiciones melénicas (Hemorragia Digestiva Alta por várices esofágicas)\n` +
        `🚨 Dolor abdominal difuso y fiebre > 37.8°C (Sospecha de Peritonitis Bacteriana Espontánea)\n` +
        `🚨 Oliguria progresiva con elevación rápida de creatinina (Síndrome Hepatorrenal)`;

    } else if (scaleId === 'sirs' || scaleId === 'news2') {
      // SIRS / NEWS2
      adaptedMeds = [
        {
          name: 'Cristaloides Isotónicos (Ringer Lactato o SS 0.9%)',
          indication: 'Estabilización hemodinámica y precarga',
          doseMg: `${Math.round(weight * 20)} mL IV`,
          route: 'Intravenosa',
          frequency: 'En 1 a 2 horas',
          duration: 'Reevaluación continua',
          notes: 'Monitorear PAM y frecuencia cardíaca.'
        },
        {
          name: !hasPenicillinAllergy ? 'Ceftriaxona 2g IV + Paracetamol 1g IV' : 'Levofloxacino 750mg IV + Paracetamol 1g IV',
          indication: 'Cobertura antibiótica empírica y control de fiebre',
          doseMg: isPediatric ? `Ceftriaxona ${Math.round(weight * 80)} mg/día IV` : '2 g IV QD',
          route: 'Intravenosa',
          frequency: 'Cada 24 horas',
          duration: '7 días',
          notes: 'Tomar hemocultivos previos.'
        }
      ];
      conduct = 
        `1. TRASLADO A SALA DE OBSERVACIÓN MONITORIZADA O REANIMACIÓN.\n` +
        `2. Monitorización multiparámetro continua de PA, FC, FR, SpO2 y T° cada 30 minutos.\n` +
        `3. Oxigenoterapia con cánula nasal si SpO2 < 94%.\n` +
        `4. Control estricto de diuresis horaria con bolsa colectora.`;
      tests = 
        `• Biometría Hemática con fórmula blanca y recuento plaquetario\n` +
        `• Lactato sérico arterial / venoso\n` +
        `• PCR cuantitativa y Procalcitonina\n` +
        `• Química sanguínea (Urea, Creatinina, Electrolitos, Glucemia)\n` +
        `• Gasometría arterial y Hemocultivos x 2`;
      alarms = 
        `🚨 Hipotensión persistente (PAS < 90 mmHg) a pesar de carga hídrica\n` +
        `🚨 Aumento de trabajo respiratorio con FR > 28 rpm o SpO2 < 92%\n` +
        `🚨 Deterioro del estado de alerta o agitación psicomotriz\n` +
        `🚨 Oliguria (< 0.5 mL/kg/h en 2 horas)`;

    } else if (scaleId === 'timi') {
      // TIMI Score
      adaptedMeds = [
        {
          name: 'Ácido Acetilsalicílico 300 mg (Masticada) + Ticagrelor 180 mg (o Clopidogrel 300 mg)',
          indication: 'Doble antiagregación plaquetaria intensiva en SCA',
          doseMg: 'AAS 300 mg + Ticagrelor 180 mg (Dosis de Carga)',
          route: 'Vía Oral',
          frequency: 'Inmediato',
          duration: 'Mantenimiento diario',
          notes: 'Indispensable en TIMI moderado/alto riesgo.'
        },
        {
          name: 'Enoxaparina Sódica 1 mg/kg SC',
          indication: 'Anticoagulación sistémica en SCA',
          doseMg: `${Math.round(weight * 1)} mg SC`,
          route: 'Subcutánea',
          frequency: 'Cada 12 horas',
          duration: 'Hasta coronariografía',
          notes: 'Ajustar dosis según función renal.'
        },
        {
          name: 'Atorvastatina 80 mg Tabletas',
          indication: 'Terapia con estatinas de alta potencia',
          doseMg: '80 mg VO',
          route: 'Vía Oral nocturna',
          frequency: 'Cada 24 horas',
          duration: 'Indefinida',
          notes: 'Efecto estabilizador de placa.'
        }
      ];
      conduct = 
        `1. INGRESO INMEDIATO A UNIDAD CORONARIA / UCI.\n` +
        `2. Monitorización electrocardiográfica continua y ECG de 12 derivaciones seriado.\n` +
        `3. Estratificación invasiva precoz (Coronariografía / Cateterismo cardíaco < 24h).\n` +
        `4. Reposo absoluto en cama y analgesia controlada.`;
      tests = 
        `• Troponina ultrasensible seriada a las 0h, 1h y 3h\n` +
        `• Electrocardiograma de 12 derivaciones seriado\n` +
        `• Ecocardiograma transtorácico de urgencia\n` +
        `• Perfil Lipídico, Glucemia, Creatinina y Hemograma completo`;
      alarms = 
        `🚨 Nueva elevación del segmento ST o angina refractaria\n` +
        `🚨 Inestabilidad hemodinámica o signos de insuficiencia cardíaca aguda (Killip III-IV)\n` +
        `🚨 Arritmias ventriculares complejas (TV / FV)`;

    } else if (scaleId === 'hasbled') {
      // HAS-BLED
      adaptedMeds = [
        {
          name: 'Apixabán 2.5 mg - 5 mg VO (o Anticoagulante ajustado)',
          indication: 'Anticoagulación con estricto control de riesgo de sangrado',
          doseMg: 'Dosis ajustada a edad, creatinina y peso',
          route: 'Vía Oral',
          frequency: 'Cada 12 horas',
          duration: 'Crónica',
          notes: 'Evitar asociación con AINEs o antiagregantes innecesarios.'
        },
        {
          name: 'Omeprazol 20 mg - 40 mg VO',
          indication: 'Gastroprotección para mitigar sangrado digestivo',
          doseMg: '20 mg VO QD',
          route: 'Vía Oral en ayunas',
          frequency: 'Cada 24 horas',
          duration: 'Continua',
          notes: 'Protección de mucosa gástrica.'
        }
      ];
      conduct = 
        `1. Corregir factores de riesgo modificables: control estricto de hipertensión (PA < 130/80 mmHg).\n` +
        `2. Prohibición estricta de automedicación con AINEs o aspirina no prescrita.\n` +
        `3. Control periódico de INR (meta 2.0-3.0 si usa Warfarina) o función renal para DOACs.\n` +
        `4. Advertir sobre signos de sangrado mucocutáneo o digestivo.`;
      tests = 
        `• Biometría Hemática con recuento de hemoglobina y plaquetas\n` +
        `• Tiempos de coagulación (TP, TTP, INR)\n` +
        `• Función Renal (Creatinina, Filtrado Glomerular) y Perfil Hepático`;
      alarms = 
        `🚨 Sangrado gastrointestinal (melenas, hematemesis o rectorragia)\n` +
        `🚨 Cefalea súbita e intensa con focalidad neurológica (sospecha de sangrado intracraneal)\n` +
        `🚨 Hematuria macroscópica franca o hematomas espontáneos extensos`;

    } else if (scaleId === 'nyha') {
      // NYHA Insuficiencia Cardíaca
      adaptedMeds = [
        {
          name: 'Furosemida 20 mg - 40 mg IV / VO',
          indication: 'Diurético de asa para descongestión pulmonar y periférica',
          doseMg: isPediatric ? `${Math.round(weight * 1)} mg IV` : '40 mg IV bolo (titular según respuesta)',
          route: 'Intravenosa / Vía Oral',
          frequency: 'Cada 12 a 24 horas',
          duration: 'Fase aguda descongestiva',
          notes: 'Monitorear diuresis y electrolitos séricos (Potasio).'
        },
        {
          name: 'Espironolactona 25 mg VO',
          indication: 'Antagonista de receptores de mineralocorticoides (reducción de mortalidad en IC)',
          doseMg: '25 mg VO',
          route: 'Vía Oral matutina',
          frequency: 'Cada 24 horas',
          duration: 'Mantenimiento crónico',
          notes: 'Suspender si Potasio sérico > 5.5 mEq/L.'
        },
        {
          name: 'Enalapril 2.5 mg - 5 mg VO (o Sacubitril/Valsartán 24/26 mg)',
          indication: 'Inhibición neurohormonal y remodelado inverso',
          doseMg: '2.5 mg VO BID (titular)',
          route: 'Vía Oral',
          frequency: 'Cada 12 horas',
          duration: 'Crónica',
          notes: 'Monitorear PA y función renal.'
        }
      ];
      conduct = 
        `1. Restricción hidrosalina estricta (< 1.5 - 2 Litros de líquidos/día y < 2g de sodio).\n` +
        `2. Posición Fowler a 45° - 90° con piernas declives.\n` +
        `3. Control de peso diario en ayunas y balance hídrico estricto.\n` +
        `4. Oxigenoterapia con cánula o VMNI si congestión pulmonar o SpO2 < 90%.`;
      tests = 
        `• BNP o NT-proBNP cuantitativo\n` +
        `• Radiografía de Tórax PA (congestión hiliar, líneas B de Kerley, cardiomegalia)\n` +
        `• Ecocardiograma Doppler transtorácico (fracción de eyección FEVI)\n` +
        `• Electrolitos séricos (Sodio, Potasio), Urea y Creatinina`;
      alarms = 
        `🚨 Ortopnea severa o disnea paroxística nocturna invalidante\n` +
        `🚨 Tos con expectoración rosada y espumosa (Edema Agudo de Pulmón)\n` +
        `🚨 Aumento súbito de peso > 2 kg en 48 horas\n` +
        `🚨 Hipotensión sistólica < 85 mmHg o síncope`;

    } else if (scaleId === 'geneva') {
      // Geneva TEP
      adaptedMeds = [
        {
          name: 'Enoxaparina Sódica 1 mg/kg SC (o Heparina no fraccionada)',
          indication: 'Anticoagulación de inicio ante sospecha clínica fundamentada',
          doseMg: `${Math.round(weight * 1)} mg SC`,
          route: 'Subcutánea',
          frequency: 'Cada 12 horas',
          duration: 'Hasta resultado de AngioTAC',
          notes: 'Ajustar si insuficiencia renal.'
        },
        {
          name: 'Oxigenoterapia suplementaria',
          indication: 'Mantenimiento de SpO2 ≥ 95%',
          doseMg: '2 a 4 L/min',
          route: 'Cánula nasal',
          frequency: 'Continua',
          duration: 'Según pulsioximetría',
          notes: 'Monitorear trabajo respiratorio.'
        }
      ];
      conduct = 
        `1. Realización urgente de AngioTAC de Tórax con contraste.\n` +
        `2. Reposo absoluto en cama con monitorización continua.\n` +
        `3. Descartar trombosis venosa profunda en extremidades inferiores.`;
      tests = 
        `• AngioTAC de Tórax con protocolo para TEP (o Gammagrafía V/Q)\n` +
        `• Dímero D cuantitativo de alta sensibilidad\n` +
        `• Troponina y Pro-BNP para estratificación de sobrecarga de VD\n` +
        `• Eco-Doppler Venoso de Miembros Inferiores`;
      alarms = 
        `🚨 Hipotensión súbita o shock obstructivo\n` +
        `🚨 Dolor torácico pleurítico fulminante con hemoptisis\n` +
        `🚨 Síncope o taquicardia severa > 130 lpm`;

    } else if (scaleId === 'gina_asthma') {
      // Crisis Asmática Aguda GINA
      adaptedMeds = [
        {
          name: 'Salbutamol + Bromuro de Ipratropio (Nebulización / Inhalador con cámara)',
          indication: 'Broncodilatación inmediata y alivio del broncoespasmo',
          doseMg: isPediatric ? '2.5 mg Salbutamol + 250 mcg Ipratropio' : '5 mg Salbutamol + 500 mcg Ipratropio',
          route: 'Inhalatoria / Nebulizada',
          frequency: 'Cada 20 min en la 1ra hora (3 ciclos), luego cada 4-6h',
          duration: 'Fase aguda',
          notes: 'Nebulizar con oxígeno a 6-8 L/min.'
        },
        {
          name: 'Hidrocortisona IV (o Metilprednisolona / Prednisona Oral)',
          indication: 'Corticoide sistémico precoz para resolver inflamación bronquial',
          doseMg: isPediatric ? `Metilprednisolona ${Math.round(weight * 1)} mg/kg IV` : 'Hidrocortisona 100-200 mg IV (o Prednisona 40-50 mg VO)',
          route: 'Intravenosa / Oral',
          frequency: 'Cada 6 a 8 horas (o dosis única diaria oral)',
          duration: '5 a 7 días',
          notes: 'No requiere pauta descendente si es ≤ 7 días.'
        },
        {
          name: 'Sulfato de Magnesio 2g IV en infusión (si crisis severa)',
          indication: 'Broncodilatador coadyuvante en crisis moderada-severa refractaria',
          doseMg: isPediatric ? `${Math.round(weight * 50)} mg/kg IV (Máx 2g)` : '2 g IV en 100 mL SS 0.9% en 20 min',
          route: 'Intravenosa en infusión lenta',
          frequency: 'Dosis única',
          duration: '20 minutos',
          notes: 'Monitorear reflejos osteotendinosos y presión arterial.'
        }
      ];
      conduct = 
        `1. Posición sentada erguida (Fowler alta).\n` +
        `2. Oxigenoterapia con meta SpO2 93% - 95% (94%-98% en niños).\n` +
        `3. Medición seriada del Flujo Espiratorio Máximo (Peak Flow / PEF) antes y después de nebulizar.\n` +
        `4. Reevaluación clínica a los 60 minutos de tratamiento intensivo.`;
      tests = 
        `• Flujometría / Peak Flow (PEF)\n` +
        `• Gasometría arterial (si PEF < 50% o deterioro clínico)\n` +
        `• Radiografía de Tórax (descartar neumotórax o neumomediastino si dolor súbito)`;
      alarms = 
        `🚨 Silencio auscultatorio ("tórax silente") sin sibilancias audibles\n` +
        `🚨 Incapacidad para pronunciar frases completas o hablar en monosílabos\n` +
        `🚨 Agotamiento ventilatorio, bradipnea o somnolencia (parada respiratoria inminente)\n` +
        `🚨 Pulso paradójico > 20 mmHg o SpO2 < 90% a pesar de oxígeno`;

    } else if (scaleId === 'gold_epoc') {
      // GOLD EPOC
      adaptedMeds = [
        {
          name: 'Salbutamol + Ipratropio (Nebulizaciones / MDI con aerocámara)',
          indication: 'Broncodilatación combinada de acción rápida',
          doseMg: '2.5 mg / 0.5 mg en 3 mL SS 0.9%',
          route: 'Inhalatoria',
          frequency: 'Cada 4 a 6 horas',
          duration: '5 a 7 días',
          notes: 'Utilizar aire comprimido para nebulizar si hay riesgo de hipercapnia.'
        },
        {
          name: 'Prednisona 40 mg VO Tabletas',
          indication: 'Corticoterapia sistémica de corta duración',
          doseMg: '40 mg VO QD',
          route: 'Vía Oral matutina',
          frequency: 'Cada 24 horas',
          duration: '5 días',
          notes: 'No prolongar más allá de 5 días.'
        },
        {
          name: !hasPenicillinAllergy ? 'Amoxicilina / Ácido Clavulánico 875/125 mg VO' : 'Azitromicina 500 mg VO',
          indication: 'Antibioticoterapia guiada por Criterios de Anthonisen (esputo purulento + disnea)',
          doseMg: '1 tableta VO BID',
          route: 'Vía Oral',
          frequency: 'Cada 12 horas',
          duration: '5 a 7 días',
          notes: 'Indicado si hay aumento de volumen y purulencia del esputo.'
        }
      ];
      conduct = 
        `1. Oxigenoterapia controlada con Venturi con meta SpO2 estricta de 88% a 92% para evitar narcosis por CO2.\n` +
        `2. Fisioterapia respiratoria y técnicas de desobstrucción bronquial.\n` +
        `3. Valorar ventilación mecánica no invasiva (VMNI / BiPAP) si acidosis respiratoria pH < 7.35 y PaCO2 > 45 mmHg.`;
      tests = 
        `• Gasometría Arterial basal\n` +
        `• Radiografía de Tórax PA\n` +
        `• Biometría Hemática con hematocrito\n` +
        `• Cultivo de esputo y antibiograma si exacerbaciones frecuentes`;
      alarms = 
        `🚨 Acidosis respiratoria descompensada (pH < 7.25)\n` +
        `🚨 Encefalopatía hipercápnica (asterixis, confusión, somnolencia marcada)\n` +
        `🚨 Cianosis central progresiva o inestabilidad hemodinámica`;

    } else if (scaleId === 'glasgow') {
      // Glasgow Coma Scale
      adaptedMeds = [
        {
          name: 'Solución Salina 0.9% IV (Evitar soluciones hipotónicas)',
          indication: 'Mantenimiento de volemia normotensiva (Meta PAM ≥ 80 mmHg)',
          doseMg: '1500 a 2000 mL / 24h',
          route: 'Intravenosa',
          frequency: 'Infusión continua',
          duration: 'Fase aguda',
          notes: 'CONTRAINDICADA Dextrosa 5% en agua pura o Ringer con lactato libre.'
        },
        {
          name: 'Manitol al 20% IV (o Solución Salina Hipertónica al 3%)',
          indication: 'Terapia osmótica urgente si signos de Herniación o Hipertensión Endocraneal',
          doseMg: isPediatric ? `${(weight * 0.5).toFixed(1)} g/kg IV` : '0.5 a 1 g/kg IV en 20 minutos',
          route: 'Intravenosa rápida',
          frequency: 'SOS ante signos de HIC',
          duration: 'Dosis rescate',
          notes: 'Monitorear osmolaridad sérica (< 320 mOsm/L).'
        },
        {
          name: 'Levetiracetam 1000 mg IV (o Fenitoína 18 mg/kg)',
          indication: 'Profilaxis de crisis epilépticas postraumáticas tempranas en TCE moderado/grave',
          doseMg: isPediatric ? `${Math.round(weight * 20)} mg IV` : '1000 mg IV bolo (luego 500mg BID)',
          route: 'Intravenosa',
          frequency: 'Cada 12 horas',
          duration: '7 días',
          notes: 'Administrar en 100 mL SS 0.9% en 15 min.'
        }
      ];
      conduct = 
        `1. SI GLASGOW ≤ 8: INTUBACIÓN OROTRAQUEAL INMEDIATA Y PROTECCIÓN DE VÍA AÉREA.\n` +
        `2. Cabecera elevada a 30° en posición neutra para facilitar retorno venoso yugular.\n` +
        `3. Evitar hipoxia (PaO2 < 60 mmHg) e hipotensión (PAS < 90 mmHg) — "Doctrina de las 2 H".\n` +
        `4. Realizar TAC de Cráneo simple urgente sin contraste.\n` +
        `5. Evaluación neurológica y pupilar cada 15 a 30 minutos.`;
      tests = 
        `• TAC Simple de Cráneo sin contraste (evaluación de hemorragia, desviación de línea media, cisternas basales)\n` +
        `• Radiografía / TAC de Columna Cervical completa\n` +
        `• Gasometría Arterial, Glucemia, Electrolitos séricos (Sodio estricto > 140 mEq/L)\n` +
        `• Perfil de Coagulación y Hemograma`;
      alarms = 
        `🚨 Caída de ≥ 2 puntos en la escala de Glasgow\n` +
        `🚨 Asimetría pupilar (anisocoria) o midriasis arreactiva unilateral\n` +
        `🚨 Tríada de Cushing: Bradicardia + Hipertensión arterial + Bradipnea irregular\n` +
        `🚨 Convulsiones o postura de descerebración/decorticación`;

    } else if (scaleId === 'nihss') {
      // NIHSS Código Ictus
      adaptedMeds = [
        {
          name: 'Solución Salina 0.9% IV',
          indication: 'Normovolemia estricta en ACV isquémico agudo',
          doseMg: '1000 a 1500 mL / 24h',
          route: 'Intravenosa continua',
          frequency: 'Continua',
          duration: 'Fase aguda',
          notes: 'No administrar glucosa a menos que haya hipoglucemia.'
        },
        {
          name: 'Ácido Acetilsalicílico 300 mg VO (si no candidato a trombolisis o tras 24h de rtPA)',
          indication: 'Antiagregación plaquetaria precoz en ACV isquémico',
          doseMg: '300 mg VO',
          route: 'Vía Oral o por SNG si disfagia',
          frequency: 'Cada 24 horas',
          duration: 'Crónica',
          notes: '🚨 Descartar hemorragia cerebral por TAC antes de dar aspirina.'
        },
        {
          name: 'Labetalol 10-20 mg IV (o Nicardipino)',
          indication: 'Control de PA si PAS > 185 mmHg o PAD > 110 mmHg para trombolisis',
          doseMg: '10 mg IV en bolo lento',
          route: 'Intravenosa',
          frequency: 'SOS según cifras de PA',
          duration: 'Fase aguda',
          notes: 'No descender PA de forma brusca para preservar penumbra isquémica.'
        }
      ];
      conduct = 
        `1. ACTIVACIÓN INMEDIATA DE CÓDIGO ICTUS.\n` +
        `2. TAC Craneal simple urgente en < 20 minutos para descartar hemorragia.\n` +
        `3. Valorar Criterios de Trombolisis Intravenosa con Alteplasa (rtPA 0.9 mg/kg) si tiempo de inicio < 4.5 horas.\n` +
        `4. Valorar Trombectomía Mecánica endovascular si oclusión de gran vaso en < 24 horas.\n` +
        `5. Test de deglución previo a cualquier ingesta oral (prevenir broncoaspiración).\n` +
        `6. Cabecera a 0°-30° y control estricto de temperatura (< 37.5°C) y glucemia (140-180 mg/dL).`;
      tests = 
        `• TAC Cerebral Simple + AngioTAC de Vasos Intra/Extracraneales\n` +
        `• Glucemia capilar urgente (descartar simulador por hipoglucemia)\n` +
        `• Biometría Hemática, Plaquetas y Tiempos de Coagulación (TP, TTP, INR)\n` +
        `• Electrocardiograma de 12 derivaciones (descartar Fibrilación Auricular)`;
      alarms = 
        `🚨 Empeoramiento de escala NIHSS en ≥ 4 puntos\n` +
        `🚨 Cefalea intensa con náuseas y vómitos o deterioro del nivel de conciencia (transformación hemorrágica)\n` +
        `🚨 Crisis convulsivas de nuevo inicio`;

    } else if (scaleId === 'abcd2') {
      // ABCD2 Score
      adaptedMeds = [
        {
          name: 'Ácido Acetilsalicílico 100 mg + Clopidogrel 75 mg (Doble Antiagregación DAPT)',
          indication: 'Doble antiagregación intensiva durante los primeros 21 días post-AIT de alto riesgo',
          doseMg: 'AAS 100 mg + Clopidogrel 75 mg VO QD',
          route: 'Vía Oral',
          frequency: 'Cada 24 horas tras el almuerzo',
          duration: '21 días (luego monoterapia)',
          notes: 'Reduce significativamente el riesgo de ACV recurrente precoz.'
        },
        {
          name: 'Atorvastatina 80 mg Tabletas',
          indication: 'Terapia con estatinas de alta intensidad',
          doseMg: '80 mg VO',
          route: 'Vía Oral nocturna',
          frequency: 'Cada 24 horas',
          duration: 'Crónica',
          notes: 'Estabilización de placa carotídea/intracraneal.'
        }
      ];
      conduct = 
        `1. Hospitalización en Unidad de Ictus / Telemetría para estudio urgente (primeras 24-48 horas).\n` +
        `2. Ecografía Doppler de Troncos Supraaórticos (Carotídeo y Vertebral) en < 24h.\n` +
        `3. Monitorización cardiaca continua / Holter ECG para descartar FA paroxística.\n` +
        `4. Control estricto de PA, glucemia y perfil lipídico.`;
      tests = 
        `• Resonancia Magnética Cerebral con secuencias de Difusión (DWI) / TAC Cerebral\n` +
        `• Eco-Doppler Carotídeo y Transcraneal\n` +
        `• ECG de 12 derivaciones y Holter de ritmo\n` +
        `• Perfil Lipídico y Hemoglobina Glicosilada (HbA1c)`;
      alarms = 
        `🚨 Reaparición de déficit motor, sensitivo o alteración del lenguaje (afasia/disartria)\n` +
        `🚨 Pérdida súbita de visión monocular (amaurosis fugaz)\n` +
        `🚨 Pérdida de equilibrio o marcha atáxica`;

    } else if (scaleId === 'air_score') {
      // AIR Score
      adaptedMeds = [
        {
          name: 'Solución Salina 0.9% / Ringer Lactato IV',
          indication: 'Hidratación parenteral activa',
          doseMg: '1500 a 2000 mL / 24h IV',
          route: 'Intravenosa',
          frequency: 'Continua',
          duration: 'Hasta definición quirúrgica',
          notes: 'Mantener diuresis clara.'
        },
        {
          name: !hasPenicillinAllergy ? 'Ceftriaxona 2g IV + Metronidazol 500mg IV' : 'Ciprofloxacino 400mg IV + Metronidazol 500mg IV',
          indication: 'Antibioticoterapia de amplio espectro para foco apendicular',
          doseMg: isPediatric ? `Ceftriaxona ${Math.round(weight * 80)} mg/dosis IV` : 'Ceftriaxona 2g IV + Metronidazol 500mg IV c/8h',
          route: 'Intravenosa',
          frequency: 'Cada 12 a 24 horas',
          duration: 'Según hallazgos quirúrgicos',
          notes: 'Tomar muestras previas si es posible.'
        }
      ];
      conduct = 
        `1. NADA POR VÍA ORAL (NPO) estricto.\n` +
        `2. Interconsulta urgente con Cirugía General.\n` +
        `3. Ecografía o TAC de abdomen con contraste endovenoso.\n` +
        `4. Reevaluación clínica abdominal seriada cada 2 a 4 horas.`;
      tests = 
        `• Biometría Hemática con leucograma y porcentaje de neutrófilos\n` +
        `• Proteína C Reactiva (PCR cuantitativa)\n` +
        `• Examen General de Orina y Ecografía Abdominal`;
      alarms = 
        `🚨 Aumento del dolor con defensa involuntaria o contractura abdominal\n` +
        `🚨 Fiebre en picos > 38.5°C\n` +
        `🚨 Taquicardia progresiva`;

    } else if (scaleId === 'meld') {
      // MELD Score
      adaptedMeds = [
        {
          name: 'Albúmina Humana al 20% IV',
          indication: 'Expansión oncótica en cirrosis descompensada y prevención de SHR',
          doseMg: '1 g/kg de peso IV',
          route: 'Intravenosa lenta',
          frequency: 'Según indicación de paracentesis o SHR',
          duration: 'Fase aguda',
          notes: 'Administrar 8g de albúmina por cada litro de ascitis extraído > 5L.'
        },
        {
          name: 'Lactulosa 20-30 mL VO + Rifaximina 550 mg VO',
          indication: 'Control estricto de amonio y prevención de encefalopatía',
          doseMg: 'Lactulosa 20 mL TID + Rifaximina 550 mg BID',
          route: 'Vía Oral',
          frequency: 'Cada 8 a 12 horas',
          duration: 'Crónica',
          notes: 'Meta: 2 a 3 evacuaciones blandas diarias.'
        }
      ];
      conduct = 
        `1. Monitorización de función renal (creatinina diaria) y balance hídrico estricto.\n` +
        `2. Evitar estrictamente nefrotóxicos (AINEs, aminoglucósidos, contrastes yodados).\n` +
        `3. Evaluación por Hepatología / Comité de Trasplante Hepático.\n` +
        `4. Paracentesis diagnóstica si ascitis para descartar PBE.`;
      tests = 
        `• Bilirrubina Total y Fraccionada, Creatinina sérica, Sodio sérico e INR\n` +
        `• Hemograma completo y Gasometría Venosa\n` +
        `• Ecografía Doppler hepática y portal`;
      alarms = 
        `🚨 Elevación aguda de creatinina > 0.3 mg/dL en 48h (Síndrome Hepatorrenal)\n` +
        `🚨 Confusión o somnolencia marcada (Encefalopatía Grado III-IV)\n` +
        `🚨 Sangrado digestivo alto activo`;

    } else if (scaleId === 'ranson') {
      // Pancreatitis Aguda Ranson / BISAP
      adaptedMeds = [
        {
          name: 'Solución Ringer Lactato IV (Fluidoterapia Dirigida por Metas)',
          indication: 'Reanimación hídrica agresiva temprana en pancreatitis aguda',
          doseMg: `${Math.round(weight * 20)} mL/kg en bolo, luego 200-250 mL/h`,
          route: 'Intravenosa en infusión continua',
          frequency: 'Primeras 24 horas',
          duration: '24 a 48 horas',
          notes: 'Monitorear hematocrito y nitrógeno ureico (BUN).'
        },
        {
          name: 'Tramadol 50-100 mg IV / Paracetamol 1g IV (Analgesia Escalonada)',
          indication: 'Alivio del dolor transfictivo en cinturón',
          doseMg: '50 a 100 mg IV diluido en 100 mL SS 0.9%',
          route: 'Intravenosa lenta en 20 min',
          frequency: 'Cada 8 horas',
          duration: '3 a 5 días',
          notes: 'No contraindicado el uso de opioides en dolor intenso.'
        },
        {
          name: 'Omeprazol 40 mg IV',
          indication: 'Protección mucosa gástrica',
          doseMg: '40 mg IV',
          route: 'Intravenosa',
          frequency: 'Cada 24 horas',
          duration: 'Fase aguda',
          notes: 'Diluir en SS 0.9%.'
        }
      ];
      conduct = 
        `1. Dieta enteral temprana tan pronto el dolor disminuya y no haya íleo (no mantener ayuno prolongado innecesario).\n` +
        `2. Monitoreo estricto de diuresis horaria con sonda vesical (Meta > 0.5 mL/kg/h).\n` +
        `3. NO usar antibióticos profilácticos de rutina salvo sospecha fundada de necrosis infectada o colangitis.\n` +
        `4. Ecografía Abdominal para descartar origen biliar (litiasis / coledocolitiasis).`;
      tests = 
        `• Amilasa y Lipasa sérica (Lipasa > 3 veces límite superior)\n` +
        `• BUN, Creatinina, Glucosa, Calcio sérico, Hematocrito, LDH, TGO y Bilirrubinas\n` +
        `• Gasometría Arterial (PaO2 / exceso de bases)\n` +
        `• Ecografía Abdominal y TAC de Abdomen con Contraste (a las 72-96h si no mejoría)`;
      alarms = 
        `🚨 BUN > 20 mg/dL o ascenso progresivo (predictor de fallo multiorgánico)\n` +
        `🚨 Oliguria (< 0.5 mL/kg/h) persistente a pesar de fluidoterapia\n` +
        `🚨 PaO2 < 60 mmHg o taquipnea severa (SDRA asociado a pancreatitis)\n` +
        `🚨 Signos de Cullen o Grey-Turner (pancreatitis necrohemorrágica)`;

    } else if (scaleId === 'rockall') {
      // Rockall / Glasgow-Blatchford HDA
      adaptedMeds = [
        {
          name: 'Omeprazol 80 mg IV en bolo, seguido de infusión 8 mg/hora',
          indication: 'Supresión ácida gástrica profunda para estabilización de coágulo en úlcera péptica',
          doseMg: '80 mg IV bolo inicial + 8 mg/h infusión continua por 72h',
          route: 'Intravenosa por bomba',
          frequency: 'Infusión continua',
          duration: '72 horas tras hemostasia endoscópica',
          notes: 'Mantener pH intragástrico > 6.0.'
        },
        {
          name: 'Cristaloides Isotónicos (Solución Salina 0.9% / Ringer Lactato)',
          indication: 'Reanimación volumétrica y restauración hemodinámica',
          doseMg: '1000 a 2000 mL IV rápido',
          route: 'Intravenosa por 2 vías 16G',
          frequency: 'Según estabilidad hemodinámica',
          duration: 'Fase aguda',
          notes: 'Meta PAS > 100 mmHg y FC < 100 lpm.'
        },
        {
          name: 'Concentrado de Hematíes (Transfusión restrictiva)',
          indication: 'Restauración de transporte de oxígeno si Hb < 7 g/dL (o < 8 g/dL con cardiopatía)',
          doseMg: '1 a 2 unidades de Glóbulos Rojos Empacados',
          route: 'Intravenosa',
          frequency: 'Según hematocrito y hemoglobina',
          duration: 'Fase aguda',
          notes: 'Estrategia transfusional restrictiva demostró menor mortalidad.'
        }
      ];
      conduct = 
        `1. NADA POR VÍA ORAL (NPO) Y REPOSO ABSOLUTO.\n` +
        `2. Endoscopía Digestiva Alta (EDA) de urgencia dentro de las primeras 24 horas (primeras 12h si inestabilidad).\n` +
        `3. Canalizar 2 vías venosas periféricas de grueso calibre (16G o 18G).\n` +
        `4. Sonda nasogástrica opcional para descompresión o lavado si sospecha de sangrado masivo activo.`;
      tests = 
        `• Biometría Hemática seriada cada 6-8 horas (Hemoglobina y Hematocrito)\n` +
        `• Tiempos de Coagulación (TP, TTP, INR) y Grupo Sanguíneo + Rh con pruebas cruzadas\n` +
        `• Química Sanguínea (BUN, Urea, Creatinina, Electrolitos séricos)\n` +
        `• Endoscopía Digestiva Alta diagnóstica y terapéutica`;
      alarms = 
        `🚨 Inestabilidad hemodinámica persistente (Hipotensión, taquicardia o síncope)\n` +
        `🚨 Hematemesis roja rutilante activa en pozos abundantes\n` +
        `🚨 Caída de hemoglobina > 2 g/dL en controles seriados\n` +
        `🚨 Rectorragia masiva con compromiso hemodinámico`;

    } else if (scaleId === 'apgar') {
      // APGAR Score
      adaptedMeds = [
        {
          name: 'Oxígeno a flujo libre / Ventilación con Presión Positiva (VPP)',
          indication: 'Soporte ventilatorio neonatal inmediato si FC < 100 lpm o apnea',
          doseMg: 'FiO2 21% en término (o 30% en prematuro)',
          route: 'Mascarilla facial con bolsa autoinflable / Neopuff',
          frequency: '40 a 60 ventilaciones / minuto',
          duration: 'Hasta FC > 100 lpm y respiración espontánea regular',
          notes: '🚨 Monitorear FC mediante pulsioximetría preductal en muñeca derecha.'
        }
      ];
      conduct = 
        `1. SECADO INMEDIATO Y RETIRADA DE CAMPOS HÚMEDOS PARA PREVENIR HIPOTERMIA.\n` +
        `2. Posición de olfateo de la cabeza para abrir la vía aérea.\n` +
        `3. Estimulación táctil frotando suavemente la espalda o plantas de los pies.\n` +
        `4. Evaluación del Score de APGAR al minuto 1 y al minuto 5 (y cada 5 min si APGAR < 7 hasta los 20 min).\n` +
        `5. Pinzamiento oportuno del cordón umbilical (1 a 3 min) si recién nacido vigoroso.`;
      tests = 
        `• Gasometría de sangre de cordón umbilical (pH, exceso de base)\n` +
        `• Glucemia capilar a los 30-60 minutos de vida\n` +
        `• Pulsioximetría preductal continua`;
      alarms = 
        `🚨 APGAR < 4 al minuto 1 o < 7 a los 5 minutos\n` +
        `🚨 Bradicardia neonatal FC < 100 lpm (iniciar VPP de inmediato) o FC < 60 lpm (iniciar compresiones torácicas + Adrenalina)\n` +
        `🚨 Apnea o respiración jadeante (gasping)\n` +
        `🚨 Palidez extrema o cianosis central persistente`;

    } else if (scaleId === 'wood_downes') {
      // Wood-Downes Bronquiolitis
      adaptedMeds = [
        {
          name: 'Solución Salina Hipertónica al 3% Nebulizada (o Salina 0.9%)',
          indication: 'Favorece aclaramiento mucociliar y reduce edema de submucosa bronquiolar',
          doseMg: '3 a 4 mL de SS al 3% por nebulización',
          route: 'Inhalatoria',
          frequency: 'Cada 6 a 8 horas',
          duration: '3 a 5 días',
          notes: 'Nebulizar con flujo de O2 a 6-8 L/min.'
        },
        {
          name: 'Solución Salina 0.9% Gotas Nasales + Aspiración suave',
          indication: 'Permeabilización nasofaríngea',
          doseMg: '2 a 3 gotas en cada fosa nasal',
          route: 'Nasal',
          frequency: 'Antes de cada toma o alimentación',
          duration: 'Durante el cuadro agudo',
          notes: 'Alivio de la resistencia de vía aérea superior.'
        },
        {
          name: 'Paracetamol Gotas / Jarabe 100-120 mg/5mL',
          indication: 'Control térmico y confort',
          doseMg: `${Math.round(weight * 15)} mg/dosis`,
          route: 'Vía Oral',
          frequency: 'Cada 6 a 8 horas con T° > 37.5°C',
          duration: '3 días',
          notes: 'No administrar antibióticos ni corticoides de rutina en bronquiolitis viral típica.'
        }
      ];
      conduct = 
        `1. Oxigenoterapia con cánula nasal para mantener SpO2 ≥ 92% (o ≥ 90% en sueño tranquilo).\n` +
        `2. Posición semifowler a 30° con ligera hiperextensión cervical.\n` +
        `3. Tomas fraccionadas de leche materna / fórmula en volúmenes pequeños para prevenir vómitos y broncoaspiración.\n` +
        `4. Suspender alimentación oral y colocar SNG o líquidos IV si FR > 60 rpm o distrés severo.`;
      tests = 
        `• Panel molecular o test rápido viral en exudado nasofaríngeo (VSR, Influenza, Rinovirus)\n` +
        `• Radiografía de Tórax AP (solo si sospecha de complicaciones como atelectasia o neumotórax)\n` +
        `• Pulsioximetría continua`;
      alarms = 
        `🚨 Score de Wood-Downes ≥ 4 (Distrés moderado a severo)\n` +
        `🚨 Pausas de apnea (> 20 segundos) o episodios de cianosis\n` +
        `🚨 Rechazo alimentario (> 50% de las tomas en 24 horas) o signos de deshidratación\n` +
        `🚨 Tiraje subcostal o intercostal marcado con aleteo nasal y quejido`;

    } else if (scaleId === 'westley') {
      // Westley Crup / Laringotraqueítis
      adaptedMeds = [
        {
          name: 'Dexametasona 0.6 mg/kg Vía Oral (o Intramuscular / Intravenosa)',
          indication: 'Reducción rápida y duradera del edema laríngeo subglótico',
          doseMg: `${(weight * 0.6).toFixed(1)} mg (Dosis única, Máx 16 mg)`,
          route: 'Vía Oral (o IM / IV)',
          frequency: 'Dosis Única',
          duration: 'Dosis única',
          notes: 'Eficaz en crup leve, moderado y severo. Inicio de acción en 1-2 horas.'
        },
        {
          name: 'Adrenalina / Epinefrina 1:1000 Nebulizada (L-Adrenalina)',
          indication: 'Vasoconstricción de mucosa subglótica en crup moderado a grave (Westley ≥ 3)',
          doseMg: isPediatric ? `${Math.min(5, Math.max(2, weight * 0.5))} mL de Adrenalina 1:1000 pura en 3 mL SS 0.9%` : '5 mL en 3 mL SS',
          route: 'Inhalatoria nebulizada con flujo O2 a 6-8 L/min',
          frequency: 'SOS (repetir a los 20 min si persiste estridor en reposo)',
          duration: 'Fase aguda',
          notes: '🚨 Observación mínima de 2 a 4 horas por posible efecto rebote tras 2h.'
        },
        {
          name: 'Oxígeno humidificado y frío',
          indication: 'Alivio sintomático y mantenimiento de SpO2 ≥ 95%',
          doseMg: '2 a 4 L/min',
          route: 'Cánula o mascarilla',
          frequency: 'Continua',
          duration: 'Hasta cese de estridor en reposo',
          notes: 'Mantener al niño en brazos de sus padres para evitar llanto y agitación.'
        }
      ];
      conduct = 
        `1. EVITAR PROCEDIMIENTOS QUE GENEREN ANSIEDAD O LLANTO EN EL NIÑO (no forzar examen orofaríngeo con bajalenguas).\n` +
        `2. Posición en brazos de la madre/padre en posición incorporada.\n` +
        `3. Observación clínica durante al menos 2 a 4 horas tras la administración de adrenalina nebulizada.\n` +
        `4. Criterios de alta: Ausencia de estridor en reposo, buen murmullo vesicular, coloración normal, ingesta oral tolerada.`;
      tests = 
        `• Radiografía de cuello en proyección AP (Signo de la aguja / campanario) — solo en caso de duda diagnóstica\n` +
        `• Pulsioximetría continua`;
      alarms = 
        `🚨 Estridor inspiratorio y espiratorio en reposo audible sin estetoscopio\n` +
        `🚨 Tiraje supraesternal, supraclavicular y aleteo nasal intenso\n` +
        `🚨 Letargia, somnolencia o agitación marcada por hipoxia\n` +
        `🚨 Palidez o cianosis central`;

    } else if (scaleId === 'kdigo') {
      // KDIGO / AKI
      adaptedMeds = [
        {
          name: 'Solución Salina 0.9% / Ringer Lactato IV (Optimización Hídrica)',
          indication: 'Corrección de volumen en lesión renal prerrenal',
          doseMg: '1000 a 1500 mL IV (titular según volemia)',
          route: 'Intravenosa',
          frequency: 'Continua',
          duration: 'Según balance',
          notes: 'Evitar sobrecarga hídrica en oliguria anúrica.'
        },
        {
          name: 'Suspensión estricta de Fármacos Nefrotóxicos',
          indication: 'Prevención de progresión del daño tubular renal',
          doseMg: 'N/A',
          route: 'Suspensión',
          frequency: 'Inmediata',
          duration: 'Hasta recuperación del Filtrado Glomerular',
          notes: 'Suspender AINEs, IECA/ARA-II, Aminoglucósidos, Vancomicina y contrastes yodados.'
        }
      ];
      conduct = 
        `1. Colocación de sonda vesical con medición horaria estricta de diuresis (Meta > 0.5 mL/kg/h).\n` +
        `2. Ajuste riguroso de posología de todos los medicamentos según aclaramiento de creatinina (Cockcroft-Gault / CKD-EPI).\n` +
        `3. Control diario de peso matutino y balance hídrico neutro.\n` +
        `4. Criterios de Terapia de Reemplazo Renal de Urgencia (AEIOU): Acidosis refractaria, Electrolitos (K > 6.5 mEq/L), Intoxicaciones, Overload (Edema pulmonar refractario), Uremia sintomática (pericarditis/encefalopatía).`;
      tests = 
        `• Creatinina sérica y Urea / BUN seriados diarios\n` +
        `• Electrolitos séricos (Potasio, Sodio, Calcio, Fósforo, Cloro)\n` +
        `• Gasometría Venosa o Arterial (evaluar acidosis metabólica)\n` +
        `• Examen General de Orina con sedimento urinario y Fracción de Excreción de Sodio (FeNa)\n` +
        `• Ecografía Renal y de Vías Urinarias (descartar uropatía obstructiva / AKI postrenal)`;
      alarms = 
        `🚨 Anuria completa (< 100 mL en 24 horas) u oliguria persistente\n` +
        `🚨 Potasio sérico > 6.0 mEq/L con cambios electrocardiográficos (ondas T picudas)\n` +
        `🚨 Signos de sobrecarga de volumen: crepitantes bibasales, ingurgitación yugular o disnea\n` +
        `🚨 Asterixis, frote pericárdico o somnolencia urémica`;

    } else if (scaleId === 'hyperkalemia') {
      // Hiperpotasemia Aguda Severa
      adaptedMeds = [
        {
          name: 'Gluconato de Calcio al 10% IV (Estabilizador de Membrana Cardíaca)',
          indication: 'Estabilización inmediata del potencial de membrana de miocardiocitos (antagonismo de toxicidad cardíaca)',
          doseMg: isPediatric ? `${(weight * 0.5).toFixed(1)} mL/kg IV` : '10 a 20 mL (1 a 2 ampollas al 10%) en 5-10 minutos IV',
          route: 'Intravenosa lenta en 5 a 10 minutos',
          frequency: 'Inmediata (repetir en 10 min si persisten cambios ECG)',
          duration: 'Inicio en 1-3 min, duración 30-60 min',
          notes: '🚨 NO desciende los niveles de potasio; solo protege el corazón de arritmias malignas (TV/FV).'
        },
        {
          name: 'Insulina Rápida (10 UI) + Solución Dextrosa al 10% (o al 33%) 50 mL IV',
          indication: 'Desplazamiento intracelular de potasio mediante activación de bomba Na+/K+ ATPasa',
          doseMg: isPediatric ? `0.1 UI/kg Insulina Rápida + 2 mL/kg Dextrosa 10%` : '10 UI Insulina Regular IV + 50 mL Dextrosa al 33% (o 250 mL Dextrosa 10%) en 30 min',
          route: 'Intravenosa en infusión',
          frequency: 'En 30 minutos',
          duration: 'Efecto inicia en 15-30 min, pico en 60 min',
          notes: 'Monitorear glucemia capilar horaria para prevenir hipoglucemia.'
        },
        {
          name: 'Salbutamol Nebulizado (10 a 20 mg)',
          indication: 'Estimulación beta-2 adrenérgica para redistribución intracelular de potasio',
          doseMg: isPediatric ? '2.5 a 5 mg nebulizado' : '10 a 20 mg (2 a 4 mL de solución 5 mg/mL en 3 mL SS 0.9%)',
          route: 'Inhalatoria nebulizada',
          frequency: 'Cada 2 horas si necesario',
          duration: '30 a 60 minutos',
          notes: 'Sinergia con insulina.'
        },
        {
          name: 'Furosemida 40-80 mg IV (o Resinas de Intercambio Catiónico / Diálisis)',
          indication: 'Eliminación corporal definitiva de potasio por vía renal',
          doseMg: '40 a 80 mg IV bolo',
          route: 'Intravenosa',
          frequency: 'Cada 12 horas si hay diuresis conservada',
          duration: 'Fase aguda',
          notes: 'Ineficaz si el paciente está anúrico; en anuria proceder a Hemodiálisis de urgencia.'
        }
      ];
      conduct = 
        `1. MONITORIZACIÓN ELECTROCARDIOGRÁFICA CONTINUA EN SALA DE REANIMACIÓN / SHOCK ROOM.\n` +
        `2. Realizar ECG de 12 derivaciones inmediato y tras cada intervención farmacológica.\n` +
        `3. Suspender todos los aportes exógenos de potasio (sueros con KCl, fármacos ahorradores de K como espironolactona, IECA/ARA-II).\n` +
        `4. Contactar con Nefrología para Hemodiálisis de Urgencia si hiperpotasemia refractaria (K > 6.5 mEq/L) o anuria.`;
      tests = 
        `• Potasio sérico urgente y Gasometría (repetir cada 1 a 2 horas)\n` +
        `• Electrocardiograma de 12 derivaciones seriado (ondas T picudas, ensanchamiento de QRS, pérdida de onda P, ritmo sinusal sinusoidal)\n` +
        `• Glucemia capilar horaria x 4 horas\n` +
        `• Función Renal (Creatinina, Urea)`;
      alarms = 
        `🚨 Ensanchamiento del complejo QRS (> 120 ms) o ritmo sinusoidal en ECG (riesgo inminente de parada cardíaca)\n` +
        `🚨 Bradicardia severa con bloqueo auriculoventricular avanzado\n` +
        `🚨 Debilidad muscular progresiva o parálisis flácida ascendente\n` +
        `🚨 Hipoglucemia tras administración de insulina`;

    } else if (scaleId === 'parkland') {
      // Parkland Grandes Quemados
      const scqTotal = 20; // 20% estimado estándar
      const totalFluidsParkland = Math.round(4 * weight * scqTotal);
      const first8h = Math.round(totalFluidsParkland / 2);
      const next16h = Math.round(totalFluidsParkland / 2);

      adaptedMeds = [
        {
          name: 'Solución Ringer Lactato IV (Fórmula de Parkland: 4 mL x kg x % SCTQ)',
          indication: 'Reposición masiva de volumen en shock por quemaduras térmicas/químicas',
          doseMg: `${totalFluidsParkland} mL en 24h (${first8h} mL en primeras 8h desde el accidente, ${next16h} mL en sigs 16h)`,
          volumeMl: `${totalFluidsParkland} mL / 24h`,
          route: 'Intravenosa por 2 vías periféricas de gran calibre en piel no quemada',
          frequency: 'Infusión guiada por diuresis horaria',
          duration: 'Primeras 24 horas',
          notes: 'Meta estricta: Diuresis 0.5 a 1.0 mL/kg/h en adultos (1.0 a 1.5 mL/kg/h en niños).'
        },
        {
          name: 'Sulfadiazina de Plata al 1% Crema / Apósitos estériles hidrocoloides',
          indication: 'Antisepsia tópica de lesiones dérmicas y prevención de infección local',
          doseMg: 'Capa de 2 a 3 mm',
          route: 'Tópica cutánea',
          frequency: 'Cada 12 a 24 horas tras curación estéril',
          duration: 'Hasta reepitelización / injerto',
          notes: 'No aplicar en cara ni en pacientes con alergia a sulfas.'
        },
        {
          name: 'Morfina 2-5 mg IV / Fentanilo (Analgesia Potente Escalonada)',
          indication: 'Control del dolor agudo severo por quemaduras',
          doseMg: isPediatric ? `${(weight * 0.05).toFixed(2)} mg Morfina IV` : '3 a 5 mg IV lento',
          route: 'Intravenosa',
          frequency: 'Cada 4 a 6 horas según EVA',
          duration: 'Fase aguda',
          notes: 'Monitorear patrón ventilatorio.'
        },
        {
          name: 'Omeprazol 40 mg IV',
          indication: 'Profilaxis de Úlcera de Curling (úlcera por estrés en grandes quemados)',
          doseMg: '40 mg IV',
          route: 'Intravenosa',
          frequency: 'Cada 24 horas',
          duration: 'Durante estancia crítica',
          notes: 'Previene sangrado digestivo alto.'
        }
      ];
      conduct = 
        `1. TRASLADO INMEDIATO A UNIDAD DE QUEMADOS CRÍTICOS / UCI.\n` +
        `2. Vía aérea: Intubación precoz si quemadura por inhalación (vibrisas nasales quemadas, esputo carbonáceo, quemaduras faciales, estridor).\n` +
        `3. Sonda vesical Foley con medición horaria estricta de diuresis.\n` +
        `4. Sonda nasogástrica para descompresión gástrica si SCTQ > 20%.\n` +
        `5. Profilaxis antitetánica según estado vacunal.\n` +
        `6. Termorregulación estricta en ambiente tibio (> 28°C) para evitar hipotermia.`;
      tests = 
        `• Gasometría Arterial con niveles de Carboxihemoglobina (COHb) si sospecha de inhalación de humo\n` +
        `• Biometría Hemática, Plaquetas y Tiempos de Coagulación\n` +
        `• Electrolitos séricos (Sodio, Potasio), Urea, Creatinina, Proteínas totales y Albúmina\n` +
        `• CPK total y Mioglobina en orina si quemaduras eléctricas (descartar rabdomiólisis)\n` +
        `• Radiografía de Tórax PA`;
      alarms = 
        `🚨 Oliguria (< 0.5 mL/kg/h en adultos o < 1 mL/kg/h en niños) a pesar de Parkland\n` +
        `🚨 Orina color coñac / oscura con mioglobinuria franca (riesgo de NTA)\n` +
        `🚨 Síndrome compartimental en quemaduras circunferenciales de extremidades o tórax (requiere escarotomía descompresiva urgente)\n` +
        `🚨 Estridor laríngeo progresivo o disfonía (cierre inminente de vía aérea)`;

    } else if (scaleId === 'rts') {
      // Revised Trauma Score (RTS Politrauma)
      adaptedMeds = [
        {
          name: 'Cristaloides Isotónicos Tibios (Ringer Lactato o SS 0.9%)',
          indication: 'Reanimación inicial restrictiva (Hipotensión permisiva: Meta PAS 80-90 mmHg en trauma no craneal)',
          doseMg: '1000 mL IV en 10-15 min',
          route: 'Intravenosa por 2 vías 14G o 16G',
          frequency: 'En bolo tibio',
          duration: 'Reevaluación de respuesta hemodinámica',
          notes: 'Evitar sobrehidratación dilucional y coagulopatía de consumo.'
        },
        {
          name: 'Ácido Tranexámico 1 g IV en 100 mL SS 0.9% en 10 min (Protocolo CRASH-2)',
          indication: 'Antifibrinolítico precoz para control de hemorragia traumática masiva',
          doseMg: '1 g IV bolo en 10 min, seguido de infusión de 1 g en 8 horas',
          route: 'Intravenosa',
          frequency: 'En primeras 3 horas del trauma',
          duration: '8 horas',
          notes: '🚨 Administrar obligatoriamente dentro de las primeras 3 horas del evento.'
        },
        {
          name: 'Protocolo de Transfusión Masiva (Relación 1:1:1)',
          indication: 'Concentrado de Hematíes + Plasma Fresco Congelado + Plaquetas',
          doseMg: '1 Unidad GR + 1 Unidad PFC + 1 Pool Plaquetas',
          route: 'Intravenosa por infundidor rápido con calentador',
          frequency: 'Según shock hemorrágico y pérdida estimada',
          duration: 'Fase de reanimación',
          notes: 'Prevención de la Tríada Mortal: Hipotermia + Acidosis + Coagulopatía.'
        }
      ];
      conduct = 
        `1. APLICACIÓN PROTOCOLO ATLS (A - B - C - D - E).\n` +
        `2. A: Control estricto de vía aérea con inmovilización bimanual de columna cervical y colocación de collarín rígido.\n` +
        `3. B: Ventilación y oxigenación (descartar neumotórax a tensión -> descompresión torácica con aguja/catéter 14G en 2do espacio intercostal).\n` +
        `4. C: Control de hemorragias externas exanguinantes con torniquete o empaquetamiento hemostático + 2 accesos venosos periféricos.\n` +
        `5. D: Examen neurológico con Glasgow y reactividad pupilar.\n` +
        `6. E: Exposición completa del paciente y prevención activa de hipotermia con mantas térmicas.\n` +
        `7. Ecografía FAST (Focused Assessment with Sonography in Trauma) inmediata.`;
      tests = 
        `• Ecografía e-FAST (espacio hepatorrenal de Morrison, esplenorrenal, pélvico, pericárdico y pleural bilateral)\n` +
        `• Serie Radiológica de Trauma: Tórax AP, Pelvis AP y Columna Cervical lateral (o Pan-TAC corporal total si estabilidad)\n` +
        `• Biometría Hemática, Grupo Sanguíneo y Factor Rh con pruebas cruzadas urgentes\n` +
        `• Tiempos de Coagulación (TP, TTP, Fibrinógeno), Lactato y Gasometría Arterial`;
      alarms = 
        `🚨 Inestabilidad hemodinámica persistente refractaria a transfusión inicial (indicación de Laparotomía exploradora de control de daños)\n` +
        `🚨 Hipoventilación unilateral con timpanismo y choque (Neumotórax a Tensión)\n` +
        `🚨 Disminución de 2 o más puntos en el Glasgow o anisocoria de novo\n` +
        `🚨 Inestabilidad del anillo pélvico con sangrado retroperitoneal masivo`;
    }

    setMedications(adaptedMeds);
    setConductText(conduct);
    setTestsText(tests);
    setAlarmsText(alarms);
    setIsEditing(false);
    setSavedToEmr(false);
  };

  useEffect(() => {
    generateInitialScheme();
  }, [patient.id]);

  // Handler to add drug from Vademecum dropdown
  const handleSelectVademecumDrug = (med: Medication) => {
    let doseMg = med.adultDose;
    let volumeMl = '';
    const notes = med.mechanismOfAction ? `Mecanismo: ${med.mechanismOfAction.substring(0, 70)}...` : '';

    if (isPediatric && med.pediatricDosePerKg) {
      const match = med.pediatricDosePerKg.match(/(\d+)/);
      const doseNum = match ? parseInt(match[0]) : 15;
      const totalMg = Math.round(weight * doseNum);
      doseMg = `${totalMg} mg (${doseNum} mg/kg/dosis)`;
      
      // Auto estimate mL if suspension
      if (med.presentation?.toLowerCase().includes('120 mg') || med.presentation?.toLowerCase().includes('120mg')) {
        volumeMl = `${((totalMg * 5) / 120).toFixed(1)} mL`;
      } else if (med.presentation?.toLowerCase().includes('250 mg') || med.presentation?.toLowerCase().includes('250mg')) {
        volumeMl = `${((totalMg * 5) / 250).toFixed(1)} mL`;
      } else if (med.presentation?.toLowerCase().includes('100 mg') || med.presentation?.toLowerCase().includes('100mg')) {
        volumeMl = `${((totalMg * 5) / 100).toFixed(1)} mL`;
      } else if (med.presentation?.toLowerCase().includes('200 mg') || med.presentation?.toLowerCase().includes('200mg')) {
        volumeMl = `${((totalMg * 5) / 200).toFixed(1)} mL`;
      }
    }

    const newItem: MedicationItem = {
      name: `${med.name} (${med.presentation || 'Fármaco'})`,
      indication: med.indications?.[0] || 'Indicación terapéutica',
      doseMg: doseMg,
      volumeMl: volumeMl,
      route: med.adminRoute || 'Vía Oral',
      frequency: isPediatric ? 'Cada 8 horas' : 'Cada 8 a 12 horas',
      duration: '5 a 7 días',
      notes: notes
    };

    setMedications(prev => [newItem, ...prev]);
    setIsVademecumOpen(false);
  };

  // Add calculated dose from Calculator
  const handleInsertCalculatedDose = () => {
    const singleDoseMg = Math.round(calcWeight * calcMgPerKg);
    const volumePerDoseMl = calcConcentrationMg > 0 ? ((singleDoseMg * calcConcentrationMl) / calcConcentrationMg).toFixed(1) : '0';

    const newItem: MedicationItem = {
      name: `${calcDrugName} (${calcConcentrationMg}mg/${calcConcentrationMl}mL)`,
      indication: 'Dosificación calculada por peso exacto',
      doseMg: `${singleDoseMg} mg por toma (${calcMgPerKg} mg/kg)`,
      volumeMl: `${volumePerDoseMl} mL por toma`,
      route: 'Vía Oral',
      frequency: calcFrequency,
      duration: '3 a 5 días',
      notes: `Peso base: ${calcWeight} kg. Dosis total calculada.`
    };

    setMedications(prev => [newItem, ...prev]);
    setActiveTab('farmacos');
  };

  // Filtered Vademecum list
  const filteredVademecum = INITIAL_MEDICATIONS.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(vademecumSearch.toLowerCase()) ||
      med.genericName.toLowerCase().includes(vademecumSearch.toLowerCase()) ||
      (med.indications && med.indications.some(i => i.toLowerCase().includes(vademecumSearch.toLowerCase()))) ||
      med.category.toLowerCase().includes(vademecumSearch.toLowerCase());
    
    const matchesCategory = selectedCategoryFilter === 'TODOS' || med.category.toLowerCase().includes(selectedCategoryFilter.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // Plain Text Builder for WhatsApp & EMR
  const buildPlainTextTreatment = () => {
    const selectedScaleObj = CLINICAL_SCALES.find(s => s.id === selectedScale);
    const doctorDisplay = formatDoctorName(patient.attendingDoctor);
    let text = `📋 *PRESCRIPCIÓN Y ESQUEMA TERAPÉUTICO DOSIA*\n`;
    text += `=====================================\n`;
    text += `👤 *PACIENTE:* ${patient.name} (${patient.age} años, ${isPediatric ? 'Pediátrico' : 'Adulto'})\n`;
    text += `⚖️ *PESO:* ${patient.weight} kg  |  📏 *TALLA:* ${patient.height || 170} cm  |  📊 *IMC:* ${bmiVal} (${bmiCategory})\n`;
    text += `🩸 *GRUPO SANGUÍNEO:* ${patient.bloodGroup || 'O+'}  |  ❤️ *ESTADO:* ${patient.status || 'Estable'}\n`;
    text += `👨‍⚕️ *MÉDICO TRATANTE:* ${doctorDisplay}\n`;
    text += `📅 *FECHA / ÚLTIMA CONSULTA:* ${patient.lastConsultationDate || new Date().toLocaleDateString()}\n`;
    if (allergies.length > 0) {
      text += `⚠️ *ALERGIAS:* ${allergies.join(', ')}\n`;
    }
    if (chronicDiseases.length > 0) {
      text += `🩺 *ENFERMEDADES CRÓNICAS:* ${chronicDiseases.join(', ')}\n`;
    }
    text += `💓 *SIGNOS VITALES:* PA: ${bp} | FC: ${hr} lpm | FR: ${rr} rpm | T°: ${temp}°C | SpO2: ${spo2}% | Glasgow: ${glasgowTotal}/15 | EVA: ${pain}/10\n`;
    if (selectedScale !== 'none' && selectedScaleObj) {
      text += `⚡ *ESCALA MÉDICA APLICADA:* ${selectedScaleObj.name}\n`;
    }
    text += `\n💊 *PLAN FARMACOLÓGICO / MEDICAMENTOS:*\n`;
    medications.forEach((m, idx) => {
      text += `${idx + 1}. *${m.name}*\n`;
      text += `   • Dosis: ${m.doseMg} ${m.volumeMl ? `(${m.volumeMl})` : ''} - Vía: ${m.route}\n`;
      text += `   • Frecuencia: ${m.frequency}  |  Duración: ${m.duration}\n`;
      if (m.indication) text += `   • Indicación: ${m.indication}\n`;
      if (m.notes) text += `   • Nota: ${m.notes}\n`;
      text += `\n`;
    });

    text += `🩺 *CONDUCTA Y MEDIDAS GENERALES:*\n${conductText}\n\n`;
    text += `🔬 *EXÁMENES DE LABORATORIO Y GABINETE:*\n${testsText}\n\n`;
    text += `🚨 *SIGNOS DE ALARMA (ACUDIR A URGENCIAS SI):*\n${alarmsText}\n`;
    text += `=====================================\n`;
    text += `📄 *PDF adjunto generado automáticamente desde DOSIA.*\n`;
    text += `Generado por DOSIA - Asistente Clínico de Tratamientos Médicos`;
    return text;
  };

  // Action Handler: Share via WhatsApp (Downloads PDF and opens WhatsApp with summary)
  const handleShareWhatsApp = () => {
    const selectedScaleObj = CLINICAL_SCALES.find(s => s.id === selectedScale);
    
    // 1. Generate & download complete PDF for patient or doctor to attach
    generateTreatmentPDF(
      patient,
      medications,
      conductText,
      testsText,
      alarmsText,
      selectedScale,
      selectedScaleObj?.name,
      patient.attendingDoctor
    );

    // 2. Open WhatsApp Web / App with formatted text
    const text = encodeURIComponent(buildPlainTextTreatment());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Action Handler: Download PDF directly
  const handleDownloadPDF = () => {
    const selectedScaleObj = CLINICAL_SCALES.find(s => s.id === selectedScale);
    generateTreatmentPDF(
      patient,
      medications,
      conductText,
      testsText,
      alarmsText,
      selectedScale,
      selectedScaleObj?.name,
      patient.attendingDoctor
    );
  };

  // Action Handler: Save full consultation/treatment to Patient EMR for future visit comparisons
  const handleSaveToEMR = () => {
    const selectedScaleObj = CLINICAL_SCALES.find(s => s.id === selectedScale);
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const doctorDisplay = formatDoctorName(patient.attendingDoctor);
    
    const prescriptionItems: PrescriptionMedication[] = medications.map((m, i) => ({
      id: `med-${Date.now()}-${i}`,
      name: m.name,
      activeIngredient: m.name,
      dose: m.doseMg,
      frequency: m.frequency,
      duration: m.duration,
      notes: m.notes || m.indication || ''
    }));

    const newEntry: EMREntry = {
      id: `emr-${Date.now()}`,
      patientId: patient.id,
      date: currentDate,
      time: currentTime,
      doctorName: doctorDisplay,
      type: 'Receta',
      diagnosis: selectedScale !== 'none' && selectedScaleObj 
        ? `Protocolo Clínico (${selectedScaleObj.tag}) - ${selectedScaleObj.name}` 
        : 'Prescripción Terapéutica General',
      summary: `Tratamiento con ${medications.length} medicamentos prescritos. ${selectedScale !== 'none' && selectedScaleObj ? `Ajustado por: ${selectedScaleObj.name}.` : 'Esquema general.'} Registrado para seguimiento y comparativa clínica.`,
      prescriptions: prescriptionItems,
      soapDetails: {
        s: `Paciente acude a consulta / control terapéutico. Alergias: ${allergies.join(', ') || 'Ninguna documentada'}.`,
        o: `PA: ${bp}, FC: ${hr} lpm, SpO2: ${spo2}%, T°: ${temp}°C, FR: ${rr} rpm, Peso: ${weight} kg, Talla: ${patient.height || 170} cm, IMC: ${bmiVal} (${bmiCategory}).`,
        a: `Diagnóstico y esquema terapéutico individualizado (${selectedScale !== 'none' && selectedScaleObj ? selectedScaleObj.name : 'Estándar'}).`,
        p: `Farmacoterapia (${medications.map(m => m.name).join('; ')}).\nConducta: ${conductText.slice(0, 150)}...`
      }
    };

    if (onSaveToEMR) {
      onSaveToEMR(newEntry);
    }

    if (onUpdatePatient) {
      onUpdatePatient({
        ...patient,
        lastConsultationDate: currentDate,
        attendingDoctor: doctorDisplay
      });
    }

    setSavedToEmr(true);
    setTimeout(() => setSavedToEmr(false), 3500);
  };

  const activeScaleObj = CLINICAL_SCALES.find(s => s.id === selectedScale);

  const filteredClinicalScales = CLINICAL_SCALES.filter(scale => {
    if (scale.id === 'none') {
      if (scaleSearchQuery.trim()) {
        const q = scaleSearchQuery.toLowerCase().trim();
        return scale.name.toLowerCase().includes(q) || 'estandar'.includes(q) || 'ninguna'.includes(q) || 'base'.includes(q);
      }
      return scaleCategoryFilter === 'TODOS';
    }

    // Category filter
    if (scaleCategoryFilter !== 'TODOS') {
      const activeCatObj = SCALE_CATEGORIES.find(c => c.id === scaleCategoryFilter);
      if (activeCatObj?.categories && !activeCatObj.categories.includes(scale.category)) {
        return false;
      }
    }

    // Search filter
    if (scaleSearchQuery.trim()) {
      const q = scaleSearchQuery.toLowerCase().trim();
      const matchName = scale.name.toLowerCase().includes(q);
      const matchTag = scale.tag.toLowerCase().includes(q);
      const matchCat = scale.category.toLowerCase().includes(q);
      const matchDesc = scale.description.toLowerCase().includes(q);
      return matchName || matchTag || matchCat || matchDesc;
    }

    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6 text-slate-100 animate-fade-in pb-8">
      
      {/* 1. HEADER & MAIN TITLE STRIP (Mobile-First) */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-navy to-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        
        {/* Title and Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                isPediatric ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}>
                {isPediatric ? '👶 PEDIÁTRICO' : '👤 ADULTO'}
              </span>
              <h2 className="text-base sm:text-xl font-extrabold text-white font-display flex items-center gap-2">
                <Pill className="w-5 h-5 text-brand-teal" />
                Tratamiento & Prescripción Personalizada
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Esquema terapéutico ajustado al paciente, vademécum fármaco-clínico y escalas médicas.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                isEditing 
                  ? 'bg-amber-500 text-slate-900 border-amber-400 font-extrabold shadow-md' 
                  : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-200 shadow-sm'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Listo (Ver)' : 'Editar Todo'}</span>
            </button>

            <button
              type="button"
              onClick={generateInitialScheme}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Restablecer esquema base según signos vitales actuales"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-teal" />
              <span className="hidden sm:inline">Recalcular Base</span>
            </button>
          </div>
        </div>

        {/* 2. PATIENT PROFILE CLINICAL DATA CARD (Mandate: Estado, Talla, IMC, Grupo Sang., Alergias, Enf. Crónicas, Últ. Consulta, Médico) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-brand-teal" />
              <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                Datos Clínicos del Paciente
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              HC: <strong className="text-brand-teal">{patient.hcNumber}</strong> • C.I.: {patient.cardId}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            
            {/* 1. Estado del Paciente */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Estado del Paciente</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                patient.status === 'Hospitalizado' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                patient.status === 'Alta' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {patient.status || 'Estable'}
              </span>
            </div>

            {/* 2. Talla & Peso */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Talla & Peso</span>
              <p className="font-bold text-white text-xs">
                {patient.height ? `${patient.height} cm` : '170 cm'} • <span className="text-brand-teal">{patient.weight} kg</span>
              </p>
            </div>

            {/* 3. IMC Calculado */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">IMC Calculado</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white text-xs font-mono">{bmiVal} kg/m²</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${bmiColor}`}>
                  {bmiCategory}
                </span>
              </div>
            </div>

            {/* 4. Grupo Sanguíneo */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Grupo Sanguíneo</span>
              <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md inline-block">
                🩸 {patient.bloodGroup || 'O+'}
              </span>
            </div>

            {/* 5. Alergias Documentadas */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-0.5 col-span-1 sm:col-span-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Alergias Documentadas</span>
              <p className={`text-xs font-medium ${allergies.length > 0 ? 'text-rose-300 font-bold' : 'text-slate-400'}`}>
                {allergies.length > 0 ? `⚠️ ${allergies.join(', ')}` : 'Ninguna conocida'}
              </p>
            </div>

            {/* 6. Enfermedades Crónicas */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-0.5 col-span-1 sm:col-span-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Enfermedades Crónicas</span>
              <p className="text-xs text-slate-300 font-medium truncate">
                {chronicDiseases.length > 0 ? chronicDiseases.join(', ') : 'Ninguna documentada'}
              </p>
            </div>

            {/* 7. Última Consulta */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Última Consulta</span>
              <p className="font-bold text-slate-200 text-xs font-mono">
                📅 {patient.lastConsultationDate || new Date().toISOString().split('T')[0]}
              </p>
            </div>

            {/* 8. Médico Tratante */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-0.5 col-span-1 sm:col-span-3">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Médico Tratante</span>
              <p className="font-bold text-brand-teal-pastel text-xs">
                👨‍⚕️ {formatDoctorName(patient.attendingDoctor)}
              </p>
            </div>

          </div>

          {/* Quick Vital Signs Strip */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-slate-300">
            <span className="text-slate-400 shrink-0 font-bold">Signos:</span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">PA: <strong className="text-white">{bp}</strong></span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">FC: <strong className="text-white">{hr}</strong> lpm</span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">FR: <strong className="text-white">{rr}</strong> rpm</span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">T°: <strong className="text-white">{temp}</strong> °C</span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">SpO2: <strong className="text-white">{spo2}%</strong></span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">Glasgow: <strong className="text-white">{glasgowTotal}/15</strong></span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">EVA: <strong className="text-white">{pain}/10</strong></span>
          </div>
        </div>

      </div>

      {/* 3. ESCALAS MÉDICAS & SCORES CLÍNICOS (Con Barra de Búsqueda y Filtros Integrados) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-teal/10 border border-brand-teal/30 flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4 text-brand-teal" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-white">Escalas Médicas & Scores Clínicos</h4>
                <span className="text-[10px] bg-slate-800 text-brand-teal px-2 py-0.5 rounded-full font-bold font-mono border border-slate-700">
                  OPCIONAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Seleccione o busque una escala médica para adaptar automáticamente el plan terapéutico
              </p>
            </div>
          </div>

          {/* Quick Clear / Reset Scale Button */}
          {selectedScale !== 'none' && (
            <button
              type="button"
              onClick={() => applyScaleAdaptation('none')}
              className="self-start sm:self-center bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Quitar escala y volver al esquema estándar"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Restablecer Esquema Base</span>
            </button>
          )}
        </div>

        {/* SEARCHABLE INTERACTIVE DROPDOWN SELECTOR */}
        <div className="relative" ref={scaleDropdownRef}>
          {/* Main Trigger Button */}
          <button
            type="button"
            onClick={() => setIsScaleDropdownOpen(!isScaleDropdownOpen)}
            className={`w-full bg-slate-950 text-left border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-between gap-2 shadow-inner ${
              isScaleDropdownOpen
                ? 'border-brand-teal ring-2 ring-brand-teal/30 bg-slate-900'
                : 'border-slate-700 hover:border-brand-teal/60 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                selectedScale !== 'none' ? 'bg-brand-teal/20 text-brand-teal border border-brand-teal/40' : 'bg-slate-800 text-slate-400'
              }`}>
                {selectedScale !== 'none' ? <Zap className="w-3.5 h-3.5 animate-pulse" /> : <Stethoscope className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                {selectedScale !== 'none' && activeScaleObj ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-xs sm:text-sm truncate">{activeScaleObj.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${activeScaleObj.badgeColor}`}>
                      {activeScaleObj.tag}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-300 font-medium text-xs sm:text-sm truncate">
                    📋 Ninguna — Esquema Estándar (Base por Signos Vitales)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">Buscar / Filtrar</span>
              <Search className="w-3.5 h-3.5 text-brand-teal" />
              {isScaleDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {/* Searchable Dropdown Menu Popover */}
          {isScaleDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in divide-y divide-slate-800">
              {/* 1. Integrated Search Bar Header */}
              <div className="p-2.5 sm:p-3 bg-slate-900/95 space-y-2">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-brand-teal absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={scaleSearchQuery}
                    onChange={(e) => setScaleSearchQuery(e.target.value)}
                    placeholder="Buscar escala médica por nombre, patología o sigla (ej. CURB-65, Sepsis, Wells, Alvarado, GINA)..."
                    className="w-full bg-slate-950 text-white placeholder-slate-400 text-xs sm:text-sm pl-9 pr-8 py-2 rounded-xl border border-slate-700 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal focus:outline-none transition-all"
                    autoFocus
                  />
                  {scaleSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setScaleSearchQuery('')}
                      className="absolute right-2.5 p-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. Category Quick Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px] scrollbar-none">
                  {SCALE_CATEGORIES.map((cat) => {
                    const isActive = scaleCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setScaleCategoryFilter(cat.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-sm'
                            : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-800 hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Filtered Options List */}
              <div className="max-h-72 overflow-y-auto p-1.5 sm:p-2 space-y-1">
                {/* Standard Base Option */}
                {(!scaleSearchQuery.trim() || 'ninguna esquema base estandar'.includes(scaleSearchQuery.toLowerCase())) && scaleCategoryFilter === 'TODOS' && (
                  <button
                    type="button"
                    onClick={() => {
                      applyScaleAdaptation('none');
                      setIsScaleDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                      selectedScale === 'none'
                        ? 'bg-brand-teal/15 border-brand-teal/50 ring-1 ring-brand-teal/30 text-white'
                        : 'bg-slate-900/40 hover:bg-slate-900 border-transparent text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-white">📋 Esquema Estándar Personalizado</span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700 font-bold">
                          BASE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        Cálculo fisiológico directo según constantes vitales, peso, edad e IMC.
                      </p>
                    </div>
                    {selectedScale === 'none' && <Check className="w-4 h-4 text-brand-teal shrink-0" />}
                  </button>
                )}

                {/* Filtered Scales List */}
                {filteredClinicalScales.filter(s => s.id !== 'none').map((scale) => {
                  const isSelected = selectedScale === scale.id;
                  return (
                    <button
                      key={scale.id}
                      type="button"
                      onClick={() => {
                        applyScaleAdaptation(scale.id);
                        setIsScaleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                        isSelected
                          ? 'bg-brand-teal/15 border-brand-teal/50 ring-1 ring-brand-teal/30 text-white'
                          : 'bg-slate-900/40 hover:bg-slate-900 border-transparent text-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-white">{scale.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${scale.badgeColor}`}>
                            {scale.tag}
                          </span>
                          <span className="text-[9px] text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded font-mono">
                            {scale.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {scale.description}
                        </p>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-brand-teal shrink-0" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-teal shrink-0 opacity-40" />
                      )}
                    </button>
                  );
                })}

                {/* No results message */}
                {filteredClinicalScales.filter(s => s.id !== 'none').length === 0 && (
                  <div className="p-6 text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      No se encontraron escalas coincidentes con <strong className="text-white">"{scaleSearchQuery}"</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setScaleSearchQuery('');
                        setScaleCategoryFilter('TODOS');
                      }}
                      className="text-xs text-brand-teal hover:underline font-bold cursor-pointer"
                    >
                      Limpiar filtros y ver todas
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Dropdown Footer info */}
              <div className="px-3 py-2 bg-slate-900/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Total: {CLINICAL_SCALES.length - 1} escalas clínicas disponibles</span>
                <button
                  type="button"
                  onClick={() => setIsScaleDropdownOpen(false)}
                  className="text-slate-400 hover:text-white font-semibold cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active Scale Description Alert */}
        {selectedScale !== 'none' && activeScaleObj && (
          <div className="bg-brand-teal/10 border border-brand-teal/40 rounded-xl p-2.5 text-xs flex items-start justify-between gap-2 animate-fade-in">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Zap className="w-4 h-4 text-brand-teal shrink-0 animate-pulse" />
                <strong className="text-white text-xs">{activeScaleObj.name}</strong>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${activeScaleObj.badgeColor}`}>
                  {activeScaleObj.tag}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {activeScaleObj.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => applyScaleAdaptation('none')}
              className="text-slate-400 hover:text-rose-400 p-1 text-xs shrink-0 cursor-pointer"
              title="Quitar escala"
            >
              ✕
            </button>
          </div>
        )}

      </div>

      {/* 4. VADEMECUM INTERACTIVE SELECTOR STRIP (Prompt Request) */}
      <div className="bg-slate-900/90 border border-brand-teal/40 rounded-2xl p-3 sm:p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-brand-teal shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">Vademécum Farmacológico Integrado</h4>
              <p className="text-[11px] text-slate-400">Seleccione fármacos de la lista para ajustar y agregar al tratamiento</p>
            </div>
          </div>

          {/* VADEMECUM DROPDOWN BUTTON */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsVademecumOpen(prev => !prev)}
              className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Explorar Medicamentos Vademécum</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isVademecumOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* VADEMECUM DROPDOWN POPUP MENU */}
            {isVademecumOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none" 
                  onClick={() => setIsVademecumOpen(false)} 
                />
                <div className="fixed inset-x-3 top-24 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-[420px] z-[125] bg-slate-900 border border-brand-teal/60 rounded-2xl shadow-2xl overflow-hidden py-1 divide-y divide-slate-800 animate-fade-in max-h-[75vh] flex flex-col">
                  
                  {/* Search Header */}
                  <div className="p-3 bg-slate-950 shrink-0 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-brand-teal font-bold uppercase">
                      <span>Catálogo Vademécum ({INITIAL_MEDICATIONS.length} Fármacos)</span>
                      <button
                        type="button"
                        onClick={() => setIsVademecumOpen(false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, indicación o categoría..."
                        value={vademecumSearch}
                        onChange={(e) => setVademecumSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
                      />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                      {['TODOS', 'Antibiótico', 'AINE', 'Analgésico', 'Emergencia', 'Cardio'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                            selectedCategoryFilter === cat
                              ? 'bg-brand-teal text-slate-900'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Medications List */}
                  <div className="overflow-y-auto divide-y divide-slate-800/60 max-h-[340px]">
                    {filteredVademecum.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        No se encontraron medicamentos coincidentes.
                      </div>
                    ) : (
                      filteredVademecum.map((med) => {
                        const hasAllergyWarning = allergies.some(a => 
                          med.name.toLowerCase().includes(a.toLowerCase()) || 
                          med.genericName.toLowerCase().includes(a.toLowerCase())
                        );

                        return (
                          <div
                            key={med.id}
                            className="p-3 hover:bg-slate-800/80 transition-colors flex items-start justify-between gap-2"
                          >
                            <div className="space-y-0.5 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <strong className="text-xs text-white font-bold">{med.name}</strong>
                                <span className="text-[9px] bg-slate-800 text-brand-teal px-1.5 py-0.2 rounded font-mono">
                                  {med.presentation}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {med.category} • {med.indications?.slice(0, 2).join(', ')}
                              </div>
                              {hasAllergyWarning && (
                                <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Paciente alérgico a este grupo
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectVademecumDrug(med)}
                              className="bg-brand-teal/20 hover:bg-brand-teal text-brand-teal hover:text-slate-900 border border-brand-teal/40 font-bold px-2.5 py-1.5 rounded-lg text-[11px] shrink-0 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5. TREATMENT NAVIGATION TABS BAR (Clean Mobile-First Buttons) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          onClick={() => setActiveTab('farmacos')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'farmacos'
              ? 'bg-brand-teal text-slate-900 border-brand-teal font-extrabold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Fármacos & Dosis ({medications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conducta')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'conducta'
              ? 'bg-brand-teal text-slate-900 border-brand-teal font-extrabold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Conducta Clínica</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pruebas')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'pruebas'
              ? 'bg-brand-teal text-slate-900 border-brand-teal font-extrabold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Exámenes & Labs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alarmas')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'alarmas'
              ? 'bg-rose-500 text-white border-rose-400 font-extrabold shadow-md'
              : 'bg-slate-900 text-rose-300 hover:bg-rose-950/40 border-rose-500/30'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Signos de Alarma</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calculadora')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'calculadora'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-md'
              : 'bg-slate-900 text-cyan-300 hover:bg-cyan-950/40 border-cyan-500/30'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Calculadora mg/kg</span>
        </button>
      </div>

      {/* 6. TAB CONTENT CONTAINER */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
        
        {/* TAB 1: FARMACOS */}
        {activeTab === 'farmacos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-brand-teal" /> Prescripción Farmacológica Individualizada
              </h3>
              
              <button
                type="button"
                onClick={() => {
                  setMedications(prev => [
                    ...prev,
                    {
                      name: 'Nuevo Medicamento',
                      indication: 'Indicación clínica',
                      doseMg: 'Dosis',
                      route: 'Vía Oral',
                      frequency: 'Cada 8 horas',
                      duration: '5 días'
                    }
                  ]);
                  setIsEditing(true);
                }}
                className="text-xs text-brand-teal hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Fármaco Manual
              </button>
            </div>

            {/* Medication Cards List */}
            <div className="space-y-3">
              {medications.map((med, index) => (
                <div
                  key={index}
                  className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2.5 transition-all hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[index].name = e.target.value;
                              setMedications(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Indicación..."
                            value={med.indication}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[index].indication = e.target.value;
                              setMedications(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-slate-800 text-slate-400 w-5 h-5 rounded-full inline-flex items-center justify-center font-bold font-mono">
                              {index + 1}
                            </span>
                            <strong className="text-sm font-bold text-white">{med.name}</strong>
                          </div>
                          {med.indication && (
                            <p className="text-[11px] text-brand-teal-pastel mt-0.5 pl-7">
                              {med.indication}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMedications(medications.filter((_, i) => i !== index));
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Eliminar fármaco"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dose details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Dosis:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.doseMg}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[index].doseMg = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-brand-teal font-bold font-mono"
                        />
                      ) : (
                        <span className="text-brand-teal font-bold font-mono">{med.doseMg} {med.volumeMl ? `(${med.volumeMl})` : ''}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Vía:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.route}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[index].route = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-300"
                        />
                      ) : (
                        <span className="text-slate-300">{med.route}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Frecuencia:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[index].frequency = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-300"
                        />
                      ) : (
                        <span className="text-slate-300">{med.frequency}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Duración:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[index].duration = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-300"
                        />
                      ) : (
                        <span className="text-slate-300">{med.duration}</span>
                      )}
                    </div>
                  </div>

                  {med.notes && (
                    <div className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-xl">
                      {med.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CONDUCTA & CUIDADOS */}
        {activeTab === 'conducta' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-brand-teal" /> Conducta Clínica e Indicaciones No Farmacológicas
            </h3>
            {isEditing ? (
              <textarea
                value={conductText}
                onChange={(e) => setConductText(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-teal"
              />
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {conductText}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LABORATORIO & PRUEBAS */}
        {activeTab === 'pruebas' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-teal" /> Exámenes de Laboratorio y Estudios Complementarios
            </h3>
            {isEditing ? (
              <textarea
                value={testsText}
                onChange={(e) => setTestsText(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-teal"
              />
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {testsText}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SIGNOS DE ALARMA */}
        {activeTab === 'alarmas' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Criterios de Urgencia y Red Flags
            </h3>
            {isEditing ? (
              <textarea
                value={alarmsText}
                onChange={(e) => setAlarmsText(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-rose-500/40 rounded-2xl p-3 text-xs text-rose-200 font-mono focus:outline-none focus:border-rose-400"
              />
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200 whitespace-pre-wrap leading-relaxed">
                {alarmsText}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CALCULADORA DE DOSIS INTEGRADA */}
        {activeTab === 'calculadora' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Calculadora de Dosis Exacta por Peso ({isPediatric ? 'Pediátrica' : 'Adulto'})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Fármaco / Nombre:</label>
                <input
                  type="text"
                  value={calcDrugName}
                  onChange={(e) => setCalcDrugName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Peso del Paciente (kg):</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-brand-teal font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Dosis por kg (mg/kg/toma):</label>
                <input
                  type="number"
                  step="0.5"
                  value={calcMgPerKg}
                  onChange={(e) => setCalcMgPerKg(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Concentración de Jarabe (mg):</label>
                <input
                  type="number"
                  value={calcConcentrationMg}
                  onChange={(e) => setCalcConcentrationMg(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">En Volumen de Jarabe (mL):</label>
                <input
                  type="number"
                  value={calcConcentrationMl}
                  onChange={(e) => setCalcConcentrationMl(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Frecuencia:</label>
                <select
                  value={calcFrequency}
                  onChange={(e) => setCalcFrequency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Cada 6 horas">Cada 6 horas (4 veces al día)</option>
                  <option value="Cada 8 horas">Cada 8 horas (3 veces al día)</option>
                  <option value="Cada 12 horas">Cada 12 horas (2 veces al día)</option>
                  <option value="Cada 24 horas">Cada 24 horas (1 vez al día)</option>
                </select>
              </div>
            </div>

            {/* Live Calculation Results */}
            <div className="bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border border-cyan-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Dosis Calculada Resultante:</span>
                <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                  {Math.round(calcWeight * calcMgPerKg)} mg por toma {' '}
                  <span className="text-cyan-300">
                    ({calcConcentrationMg > 0 ? ((Math.round(calcWeight * calcMgPerKg) * calcConcentrationMl) / calcConcentrationMg).toFixed(1) : 0} mL)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Fórmula: ({calcWeight} kg × {calcMgPerKg} mg/kg) × {calcConcentrationMl} mL / {calcConcentrationMg} mg = {((Math.round(calcWeight * calcMgPerKg) * calcConcentrationMl) / calcConcentrationMg).toFixed(1)} mL {calcFrequency.toLowerCase()}.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInsertCalculatedDose}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Insertar en Tratamiento
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 7. BOTTOM ACTION EXPORT BAR (Diseño Compacto y Elegante) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
          <Share2 className="w-3.5 h-3.5 text-brand-teal shrink-0" />
          <span className="text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider font-mono">
            Opciones de Guardado & Exportación
          </span>
        </div>

        {/* Action Buttons - Compact & Elegant */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
          {/* 1. WHATSAPP */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold px-2.5 sm:px-3 py-2 rounded-lg border border-emerald-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm text-xs active:scale-95 min-w-0"
            title="Enviar tratamiento en PDF por WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
            <span className="truncate hidden xs:inline sm:inline">WhatsApp</span>
            <span className="truncate xs:hidden sm:hidden">WhatsApp</span>
          </button>

          {/* 2. PDF */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="bg-slate-100 hover:bg-white text-slate-900 font-bold px-2.5 sm:px-3 py-2 rounded-lg border border-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm text-xs active:scale-95 min-w-0"
            title="Descargar documento PDF del tratamiento"
          >
            <Download className="w-3.5 h-3.5 text-slate-900 shrink-0" />
            <span className="truncate">PDF</span>
          </button>

          {/* 3. GUARDAR HISTORIAL */}
          <button
            type="button"
            onClick={handleSaveToEMR}
            className="bg-blue-600/90 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold px-2.5 sm:px-3 py-2 rounded-lg border border-blue-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm text-xs active:scale-95 min-w-0"
            title="Guardar en el Historial Clínico para comparar con futuras visitas"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-100 shrink-0" />
            <span className="truncate">{savedToEmr ? '✓ Guardado' : 'Historial'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}

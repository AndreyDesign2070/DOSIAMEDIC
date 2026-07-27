import React, { useState, useEffect } from 'react';
import { Patient, Prescription, Medication, EmergencyProtocol, TemplateDocument, PatientAlerts, VitalSigns, EMREntry, ImageStudy, BloodGroup, PatientStatus } from '../types';
import { INITIAL_MEDICATIONS, INITIAL_PROTOCOLS, INITIAL_PATIENTS } from '../data';
import ClinicalAlertsBar from './ClinicalAlertsBar';
import PatientProfileCard from './PatientProfileCard';
import AutoEvaluationModule from './AutoEvaluationModule';
import MedicalScalesModule from './MedicalScalesModule';
import EmergencyModeModule from './EmergencyModeModule';
import PrescriptionEngineModule from './PrescriptionEngineModule';
import DocumentsCertificationsModule from './DocumentsCertificationsModule';
import EMRTimelineModule from './EMRTimelineModule';
import AIMedicalAssistantModule from './AIMedicalAssistantModule';
import MedicalImagingModule from './MedicalImagingModule';
import MedicalAnalyticsDashboard from './MedicalAnalyticsDashboard';
import GlobalSearchModal from './GlobalSearchModal';
import DosiaLogo from './DosiaLogo';
import DosiaAppIcon from './DosiaAppIcon';
import {
  User, Activity, Calculator, Pill, FileText, Clock, Bot, HeartPulse,
  Image as ImageIcon, BarChart3, Search, Plus, LogOut, ShieldCheck,
  ChevronDown, Check, Sparkles, Baby, UserPlus
} from 'lucide-react';

interface DashboardProps {
  doctor: {
    name: string;
    username: string;
    licenseKey: string;
  };
  onLogout: () => void;
}

export default function Dashboard({ doctor, onLogout }: DashboardProps) {
  // Global Patients & Active Patient State (Starts empty on login as requested)
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [activePatientId, setActivePatientId] = useState<string>('');
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>(INITIAL_PROTOCOLS);
  const [documents, setDocuments] = useState<TemplateDocument[]>([]);
  const [emrEntries, setEmrEntries] = useState<EMREntry[]>([]);

  // Navigation Tab state
  const [activeTab, setActiveTab] = useState<
    | 'patient_profile'
    | 'clinical_consultation'
    | 'auto_evaluation'
    | 'prescription'
    | 'documents'
    | 'emr_timeline'
    | 'ai_medical'
    | 'emergency_mode'
    | 'medical_scales'
    | 'imaging'
    | 'analytics'
  >('patient_profile');

  // Global Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // New Patient Creation Modal (Points 1 to 16)
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  
  // Mandatory Points 1 - 7
  const [newCategory, setNewCategory] = useState<'ADULTO' | 'PEDIÁTRICO'>('ADULTO'); // 1
  const [newName, setNewName] = useState(''); // 2
  const [newAge, setNewAge] = useState<number | ''>(30); // 3
  const [newWeight, setNewWeight] = useState<number | ''>(70); // 4
  const [newHeight, setNewHeight] = useState<number | ''>(170); // 5
  const [newBloodGroup, setNewBloodGroup] = useState<BloodGroup>('O+'); // 6
  const [newStatus, setNewStatus] = useState<PatientStatus>('Estable'); // 7
  const [newSex, setNewSex] = useState<'M' | 'F'>('F');
  const [newCardId, setNewCardId] = useState('');

  // Optional Points 8 - 16 (Llenar poco a poco)
  const [newHeartRate, setNewHeartRate] = useState<number | ''>(80); // 8
  const [newBloodPressure, setNewBloodPressure] = useState('120/80'); // 9
  const [newTemperature, setNewTemperature] = useState<number | ''>(36.5); // 10
  const [newOxygenSat, setNewOxygenSat] = useState<number | ''>(98); // 11
  const [newRespRate, setNewRespRate] = useState<number | ''>(16); // 12
  const [newPainScale, setNewPainScale] = useState<number | ''>(0); // 13
  const [newGlychemia, setNewGlychemia] = useState<number | ''>(100); // 14
  const [newDiuresis, setNewDiuresis] = useState<number | ''>(60); // 15
  
  // 16. Glasgow Coma Scale (04 VSM6)
  const [newGlasgowOcular, setNewGlasgowOcular] = useState<number>(4);
  const [newGlasgowVerbal, setNewGlasgowVerbal] = useState<number>(5);
  const [newGlasgowMotor, setNewGlasgowMotor] = useState<number>(6);

  // Get current active patient object (returns null if activePatientId is '')
  const activePatient = patients.find(p => p.id === activePatientId) || null;

  // Load persistence from localStorage
  useEffect(() => {
    try {
      const storedP = localStorage.getItem('dosia_patients');
      if (storedP) {
        const parsed = JSON.parse(storedP);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPatients(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const savePatientsToStorage = (updatedList: Patient[]) => {
    setPatients(updatedList);
    localStorage.setItem('dosia_patients', JSON.stringify(updatedList));
  };

  const resetNewPatientForm = () => {
    setNewCategory('ADULTO');
    setNewName('');
    setNewAge(30);
    setNewWeight(70);
    setNewHeight(170);
    setNewBloodGroup('O+');
    setNewStatus('Estable');
    setNewSex('F');
    setNewCardId('');
    setNewHeartRate(80);
    setNewBloodPressure('120/80');
    setNewTemperature(36.5);
    setNewOxygenSat(98);
    setNewRespRate(16);
    setNewPainScale(0);
    setNewGlychemia(100);
    setNewDiuresis(60);
    setNewGlasgowOcular(4);
    setNewGlasgowVerbal(5);
    setNewGlasgowMotor(6);
  };

  // Mandatory Points 1 to 7 validation
  const isMandatoryValid = Boolean(
    newCategory &&
    newName.trim().length >= 2 &&
    newAge !== '' && Number(newAge) >= 0 &&
    newWeight !== '' && Number(newWeight) > 0 &&
    newHeight !== '' && Number(newHeight) > 0 &&
    newBloodGroup &&
    newStatus
  );

  const handleCreatePatient = () => {
    if (!isMandatoryValid) {
      alert('Por favor complete todos los campos obligatorios del punto 1 al 7.');
      return;
    }

    const ageNum = Number(newAge) || 30;
    const totalGlasgow = Number(newGlasgowOcular) + Number(newGlasgowVerbal) + Number(newGlasgowMotor);

    const newP: Patient = {
      id: `p-${Date.now()}`,
      name: newName.trim(),
      cardId: newCardId.trim() || `C.I.-${Math.floor(10000000 + Math.random() * 90000000)}`,
      hcNumber: `HC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientCategory: newCategory,
      age: ageNum,
      weight: Number(newWeight) || (newCategory === 'PEDIÁTRICO' ? 18 : 70),
      height: Number(newHeight) || (newCategory === 'PEDIÁTRICO' ? 105 : 170),
      sex: newSex,
      bloodGroup: newBloodGroup,
      status: newStatus,
      lastConsultationDate: new Date().toISOString().split('T')[0],
      attendingDoctor: `Dr(a). ${doctor.name}`,
      allergies: [],
      preExistingConditions: [],
      alerts: {
        allergies: [],
        chronicDiseases: [],
        isPregnant: false,
        isLactating: false,
        hasRenalFailure: false,
        hasHepaticFailure: false,
        hasCardioRisk: false
      },
      vitalSigns: {
        heartRate: newHeartRate !== '' ? Number(newHeartRate) : 80,
        bloodPressure: newBloodPressure || '120/80',
        temperature: newTemperature !== '' ? Number(newTemperature) : 36.5,
        respiratoryRate: newRespRate !== '' ? Number(newRespRate) : 16,
        oxygenSaturation: newOxygenSat !== '' ? Number(newOxygenSat) : 98,
        painEva: newPainScale !== '' ? Number(newPainScale) : 0,
        glycemia: newGlychemia !== '' ? Number(newGlychemia) : 100,
        diuresisMlHr: newDiuresis !== '' ? Number(newDiuresis) : 60,
        glasgow: {
          ocular: newGlasgowOcular,
          verbal: newGlasgowVerbal,
          motor: newGlasgowMotor,
          total: totalGlasgow
        }
      },
      photos: [],
      studies: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newP, ...patients];
    savePatientsToStorage(updated);
    setActivePatientId(newP.id);
    setShowNewPatientModal(false);
    resetNewPatientForm();
  };

  // Patient Updates
  const handleUpdatePatient = (updated: Patient) => {
    const list = patients.map(p => p.id === updated.id ? updated : p);
    savePatientsToStorage(list);
  };

  const handleUpdateAlerts = (newAlerts: PatientAlerts) => {
    if (!activePatient) return;
    const updated: Patient = {
      ...activePatient,
      alerts: newAlerts,
      allergies: newAlerts.allergies,
      preExistingConditions: newAlerts.chronicDiseases
    };
    handleUpdatePatient(updated);
  };

  const handleUpdateVitals = (vitals: VitalSigns) => {
    if (!activePatient) return;
    const updated: Patient = {
      ...activePatient,
      vitalSigns: vitals
    };
    handleUpdatePatient(updated);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col font-sans selection:bg-brand-teal selection:text-slate-900">
      
      {/* 1. TOP SYSTEM APP BAR */}
      <header className="bg-brand-navy-light/90 border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-30 backdrop-blur-md">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <DosiaAppIcon size="sm" className="animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <DosiaLogo size="md" />
              {/* Prompt Request #4: "PRESCRIPCIÓN MÉDICA" */}
              <span className="text-[10px] bg-brand-teal/20 text-brand-teal border border-brand-teal/40 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">
                PRESCRIPCIÓN MÉDICA
              </span>
            </div>

            {/* Prompt Request #5: License below Médico Autorizado */}
            <div className="text-xs text-slate-400 mt-1 leading-snug">
              <div>Médico Autorizado: <strong className="text-slate-200">{doctor.name}</strong></div>
              <div>Licencia: <span className="font-mono text-brand-teal font-semibold">{doctor.licenseKey}</span></div>
            </div>
          </div>
        </div>

        {/* Action Tools & Top Right Logout Button */}
        <div className="flex items-center flex-wrap justify-between md:justify-end gap-2 w-full md:w-auto">
          
          <button
            type="button"
            onClick={() => setShowNewPatientModal(true)}
            className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-brand-teal/10"
          >
            <Plus className="w-4 h-4" /> Nuevo Paciente
          </button>

          {/* Global Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-brand-teal" /> Buscar (Ctrl+K)
          </button>

          {/* Prompt Request #6: Logout button top right */}
          <button
            type="button"
            onClick={onLogout}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto md:ml-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>

        </div>
      </header>

      {/* 2. PERSISTENT TOP CLINICAL ALERTS PANEL */}
      <ClinicalAlertsBar patient={activePatient} onUpdateAlerts={handleUpdateAlerts} />

      {/* 3. PATIENT SELECTOR STRIP DIRECTLY ABOVE / NEAR THE TABS (Prompt Request #7) */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Paciente Activo:
          </span>
          {/* Dropdown Selector */}
          <div className="flex items-center gap-2 bg-brand-navy-light border border-slate-700 rounded-xl px-3 py-1.5 shadow-inner">
            <User className="w-4 h-4 text-brand-teal shrink-0" />
            <select
              value={activePatientId}
              onChange={(e) => setActivePatientId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-0.5"
            >
              <option value="" className="bg-slate-900 text-slate-400">-- Ningún paciente seleccionado --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name} — Cédula: {p.cardId} ({p.patientCategory || (p.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activePatient && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>HC: <strong className="text-brand-teal">{activePatient.hcNumber}</strong></span>
            <span>•</span>
            <span>Edad: <strong className="text-white">{activePatient.age} años</strong></span>
            <span>•</span>
            <span className={`font-bold px-2 py-0.5 rounded ${
              (activePatient.patientCategory || (activePatient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')) === 'PEDIÁTRICO'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-sky-500/20 text-sky-300'
            }`}>
              {activePatient.patientCategory || (activePatient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')}
            </span>
          </div>
        )}
      </div>

      {/* 4. PRIMARY NAVIGATION TABS NAVBAR */}
      <div className="bg-brand-navy-light/40 border-b border-slate-800 px-4 sm:px-6 py-2 overflow-x-auto flex gap-1.5 scrollbar-none sticky top-[49px] z-20 backdrop-blur-md">
        {[
          { id: 'patient_profile', label: 'Perfil del Paciente', icon: User },
          { id: 'clinical_consultation', label: 'Consulta Clínica', icon: FileText },
          { id: 'auto_evaluation', label: 'Evaluación Automática', icon: Activity },
          { id: 'prescription', label: 'Prescripción & Vademécum', icon: Pill },
          { id: 'documents', label: 'Documentos & Certificados', icon: ShieldCheck },
          { id: 'emr_timeline', label: 'Historial Clínico (Timeline)', icon: Clock },
          { id: 'ai_medical', label: 'IA Médica', icon: Bot },
          { id: 'emergency_mode', label: '⚡ Modo Emergencia', icon: HeartPulse, isCritical: true },
          { id: 'medical_scales', label: '🧮 Escalas Médicas', icon: Calculator },
          { id: 'imaging', label: '🖼️ Imagenología', icon: ImageIcon },
          { id: 'analytics', label: '📊 Estadísticas', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? tab.isCritical
                    ? 'bg-rose-500 text-slate-900 shadow-lg shadow-rose-500/20'
                    : 'bg-brand-teal text-slate-900 shadow-lg shadow-brand-teal/20'
                  : tab.isCritical
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. MAIN BODY RENDERER FOR ACTIVE TAB */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* TAB 1: PERFIL DEL PACIENTE */}
        {activeTab === 'patient_profile' && activePatient && (
          <div className="space-y-6 animate-fade-in">
            <PatientProfileCard
              patient={activePatient}
              onUpdatePatient={handleUpdatePatient}
              onOpenConsultation={() => setActiveTab('clinical_consultation')}
            />
            <AutoEvaluationModule patient={activePatient} onUpdateVitals={handleUpdateVitals} />
          </div>
        )}

        {/* TAB 2: CONSULTA CLÍNICA */}
        {activeTab === 'clinical_consultation' && activePatient && (
          <div className="space-y-6 animate-fade-in">
            <AutoEvaluationModule patient={activePatient} onUpdateVitals={handleUpdateVitals} />
            <PrescriptionEngineModule
              patient={activePatient}
              medicationsList={medications}
              onGeneratePrescription={(meds, diag, obs) => {
                setActiveTab('documents');
              }}
            />
          </div>
        )}

        {/* TAB 3: EVALUACIÓN AUTOMÁTICA */}
        {activeTab === 'auto_evaluation' && activePatient && (
          <div className="space-y-6 animate-fade-in">
            <AutoEvaluationModule patient={activePatient} onUpdateVitals={handleUpdateVitals} />
          </div>
        )}

        {/* TAB 4: PRESCRIPCIÓN & VADEMÉCUM */}
        {activeTab === 'prescription' && (
          <div className="space-y-6 animate-fade-in">
            <PrescriptionEngineModule
              patient={activePatient}
              medicationsList={medications}
              onGeneratePrescription={(meds, diag, obs) => {
                setActiveTab('documents');
              }}
            />
          </div>
        )}

        {/* TAB 5: DOCUMENTOS Y CERTIFICADOS */}
        {activeTab === 'documents' && (
          <div className="space-y-6 animate-fade-in">
            <DocumentsCertificationsModule
              patient={activePatient}
              documents={documents}
              onCreateDocument={(newDoc) => setDocuments([newDoc, ...documents])}
            />
          </div>
        )}

        {/* TAB 6: HISTORIAL CLÍNICO (TIMELINE) */}
        {activeTab === 'emr_timeline' && (
          <div className="space-y-6 animate-fade-in">
            <EMRTimelineModule
              patient={activePatient}
              entries={emrEntries}
              onAddEvolutionNote={(note) => setEmrEntries([note, ...emrEntries])}
              onUpdateEntries={(updatedList) => setEmrEntries(updatedList)}
            />
          </div>
        )}

        {/* TAB 7: IA MÉDICA */}
        {activeTab === 'ai_medical' && (
          <div className="space-y-6 animate-fade-in">
            <AIMedicalAssistantModule patient={activePatient} />
          </div>
        )}

        {/* EXTRA TAB 8: MODO EMERGENCIA */}
        {activeTab === 'emergency_mode' && (
          <div className="space-y-6 animate-fade-in">
            <EmergencyModeModule patient={activePatient} />
          </div>
        )}

        {/* EXTRA TAB 9: ESCALAS MÉDICAS */}
        {activeTab === 'medical_scales' && (
          <div className="space-y-6 animate-fade-in">
            <MedicalScalesModule patient={activePatient} />
          </div>
        )}

        {/* EXTRA TAB 10: IMAGENOLOGÍA */}
        {activeTab === 'imaging' && (
          <div className="space-y-6 animate-fade-in">
            <MedicalImagingModule
              patient={activePatient}
              onAddStudy={(study) => {
                if (activePatient) {
                  const updated: Patient = {
                    ...activePatient,
                    studies: [study, ...(activePatient.studies || [])]
                  };
                  handleUpdatePatient(updated);
                }
              }}
            />
          </div>
        )}

        {/* EXTRA TAB 11: ESTADÍSTICAS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <MedicalAnalyticsDashboard
              patients={patients}
              activeLicense={{
                key: doctor.licenseKey,
                doctorName: doctor.name,
                username: doctor.username,
                password: '',
                purchaseDate: '2026-05-15',
                status: 'Activa',
                maxActivations: 1,
                activatedDeviceId: 'simulated-phone-device'
              }}
            />
          </div>
        )}

      </main>

      {/* GLOBAL SEARCH MODAL */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        patients={patients}
        medications={medications}
        protocols={protocols}
        documents={documents}
        onSelectPatient={(p) => setActivePatientId(p.id)}
        onSelectTab={(tab) => setActiveTab(tab as any)}
      />

      {/* NEW PATIENT CREATION MODAL (16 FIELDS) */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-brand-navy-light border border-slate-800 rounded-3xl p-6 my-8 space-y-5 text-left shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-brand-teal" /> Registro Completo de Nuevo Paciente
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Los puntos <strong className="text-brand-teal font-semibold">1 al 7 son obligatorios</strong> para crear el expediente. El resto de signos vitales (puntos 8 a 16) pueden completarse progresivamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPatientModal(false)}
                className="text-slate-400 hover:text-white font-bold text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
              
              {/* SECTION A: MANDATORY FIELDS (Puntos 1 a 7) */}
              <div className="bg-slate-900/90 border border-brand-teal/30 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-brand-teal uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                  Campos Obligatorios (Puntos 1 a 7)
                </span>

                {/* Point 1: Adulto o Niño */}
                <div>
                  <label className="text-slate-300 font-bold block mb-1">1. Categoría de Paciente (Adulto o Niño) *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCategory('ADULTO')}
                      className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        newCategory === 'ADULTO'
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200 ring-1 ring-sky-400/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <User className="w-4 h-4" /> ADULTO
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewCategory('PEDIÁTRICO')}
                      className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        newCategory === 'PEDIÁTRICO'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Baby className="w-4 h-4" /> NIÑO (PEDIÁTRICO)
                    </button>
                  </div>
                </div>

                {/* Point 2: Nombre y Apellido */}
                <div>
                  <label className="text-slate-300 font-bold block mb-1">2. Nombre y Apellido Completo *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Carmen María Delgado"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Point 3: Edad */}
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">3. Edad (Años) *</label>
                    <input
                      type="number"
                      value={newAge}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setNewAge(val);
                        if (typeof val === 'number' && val < 15) setNewCategory('PEDIÁTRICO');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  {/* Point 4: Peso */}
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">4. Peso (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 68.5"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  {/* Point 5: Talla */}
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">5. Talla (cm) *</label>
                    <input
                      type="number"
                      value={newHeight}
                      onChange={(e) => setNewHeight(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 165"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Point 6: Grupo Sanguíneo */}
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">6. Grupo Sanguíneo *</label>
                    <select
                      value={newBloodGroup}
                      onChange={(e) => setNewBloodGroup(e.target.value as BloodGroup)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  {/* Point 7: Estado Hospitalario */}
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">7. Estado Hospitalario *</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as PatientStatus)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      <option value="Estable">Estable</option>
                      <option value="Observación">Observación</option>
                      <option value="Crítico">Crítico</option>
                      <option value="Alta">Alta Médica</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-800/80 pt-2">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Cédula / Identificación (Opcional)</label>
                    <input
                      type="text"
                      value={newCardId}
                      onChange={(e) => setNewCardId(e.target.value)}
                      placeholder="Ej. 0928172635"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Sexo Biológico</label>
                    <select
                      value={newSex}
                      onChange={(e) => setNewSex(e.target.value as 'M' | 'F')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs"
                    >
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* SECTION B: OPTIONAL VITAL SIGNS & GLASGOW (Puntos 8 a 16) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                  Signos Vitales Iniciales y Escala de Glasgow (Puntos 8 a 16 - Completar opcionalmente)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Point 8: FC */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">8. Frec. Cardíaca (bpm)</label>
                    <input
                      type="number"
                      value={newHeartRate}
                      onChange={(e) => setNewHeartRate(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="80"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  {/* Point 9: PA */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">9. P. Arterial (mmHg)</label>
                    <input
                      type="text"
                      value={newBloodPressure}
                      onChange={(e) => setNewBloodPressure(e.target.value)}
                      placeholder="120/80"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  {/* Point 10: Temp */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">10. Temperatura (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newTemperature}
                      onChange={(e) => setNewTemperature(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="36.5"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  {/* Point 11: SpO2 */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">11. Saturación SpO2 (%)</label>
                    <input
                      type="number"
                      value={newOxygenSat}
                      onChange={(e) => setNewOxygenSat(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="98"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  {/* Point 12: FR */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">12. Frec. Resp. (rpm)</label>
                    <input
                      type="number"
                      value={newRespRate}
                      onChange={(e) => setNewRespRate(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="16"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  {/* Point 13: Escala Dolor */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">13. Escala Dolor EVA (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={newPainScale}
                      onChange={(e) => setNewPainScale(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  {/* Point 14: Glucemia Capilar */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">14. Glucemia (mg/dL)</label>
                    <input
                      type="number"
                      value={newGlychemia}
                      onChange={(e) => setNewGlychemia(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="100"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  {/* Point 15: Diuresis Horaria */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">15. Diuresis (mL/h)</label>
                    <input
                      type="number"
                      value={newDiuresis}
                      onChange={(e) => setNewDiuresis(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="60"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Point 16: ESCALA DE COMA DE GLASGOW COMPLETA (04 VSM6) */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      16. Escala de Coma de Glasgow Completa (04 VSM6)
                    </span>
                    <span className="text-xs font-mono font-bold bg-brand-teal/20 text-brand-teal px-2 py-0.5 rounded border border-brand-teal/30">
                      Total: {newGlasgowOcular + newGlasgowVerbal + newGlasgowMotor} / 15
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Respuesta Ocular (1-4)</label>
                      <select
                        value={newGlasgowOcular}
                        onChange={(e) => setNewGlasgowOcular(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                      >
                        <option value={4}>O4: Espontánea (4 pt)</option>
                        <option value={3}>O3: A la orden verbal (3 pt)</option>
                        <option value={2}>O2: Al dolor (2 pt)</option>
                        <option value={1}>O1: Nula (1 pt)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Respuesta Verbal (1-5)</label>
                      <select
                        value={newGlasgowVerbal}
                        onChange={(e) => setNewGlasgowVerbal(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                      >
                        <option value={5}>V5: Orientada (5 pt)</option>
                        <option value={4}>V4: Desorientada (4 pt)</option>
                        <option value={3}>V3: Inapropiada (3 pt)</option>
                        <option value={2}>V2: Incomprensible (2 pt)</option>
                        <option value={1}>V1: Nula (1 pt)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Respuesta Motora (1-6)</label>
                      <select
                        value={newGlasgowMotor}
                        onChange={(e) => setNewGlasgowMotor(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                      >
                        <option value={6}>M6: Obedece órdenes (6 pt)</option>
                        <option value={5}>M5: Localiza dolor (5 pt)</option>
                        <option value={4}>M4: Retira al dolor (4 pt)</option>
                        <option value={3}>M3: Flexión anormal (3 pt)</option>
                        <option value={2}>M2: Extensión anormal (2 pt)</option>
                        <option value={1}>M1: Nula (1 pt)</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-mono text-slate-400">
                {isMandatoryValid ? (
                  <span className="text-emerald-400 font-bold">✓ Puntos 1 a 7 listos para registrar</span>
                ) : (
                  <span className="text-amber-400 font-bold">⚠️ Complete los puntos 1 a 7 obligatorios</span>
                )}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreatePatient}
                  disabled={!isMandatoryValid}
                  className={`font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isMandatoryValid
                      ? 'bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 shadow-md shadow-brand-teal/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  Crear Perfil Completo de Paciente
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-mono">
        DOSIA Clinical Software 2026 • Sistema Médico Certificado • Creado por Andrey Design
      </footer>

    </div>
  );
}

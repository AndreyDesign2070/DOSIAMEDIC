import React, { useState, useEffect } from 'react';
import { 
  Patient, Medication, EmergencyProtocol, PatientAlerts, VitalSigns, 
  EMREntry, BloodGroup, PatientStatus 
} from '../types';
import { INITIAL_MEDICATIONS, INITIAL_PROTOCOLS, INITIAL_PATIENTS } from '../data';
import PatientTreatmentSection from './PatientTreatmentSection';
import AutoEvaluationModule from './AutoEvaluationModule';
import MedicalScalesModule from './MedicalScalesModule';
import EmergencyModeModule from './EmergencyModeModule';
import EMRTimelineModule from './EMRTimelineModule';
import AIMedicalAssistantModule from './AIMedicalAssistantModule';
import GlobalSearchModal from './GlobalSearchModal';
import PatientsListModal from './PatientsListModal';
import DosiaAppIcon from './DosiaAppIcon';
import DosiaLogo from './DosiaLogo';
import { 
  subscribeCloudPatients, 
  saveCloudPatient, 
  deleteCloudPatient 
} from '../lib/firebase';
import { formatDoctorName } from '../utils';
import {
  User, Activity, Pill, Clock, Bot, HeartPulse, Stethoscope,
  Search, Plus, LogOut, ShieldCheck, Check, Sparkles, Baby, 
  UserPlus, X, ChevronRight, FileText, Share2, FolderPlus,
  RefreshCw, SlidersHorizontal, ArrowRight, UserCheck, Smartphone
} from 'lucide-react';

interface DashboardProps {
  doctor: {
    name: string;
    username: string;
    licenseKey: string;
  };
  onLogout: () => void;
  onOpenCreateIcon?: () => void;
}

export default function Dashboard({ doctor, onLogout, onOpenCreateIcon }: DashboardProps) {
  // Global Patients & Active Patient State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientId] = useState<string>('');
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>(INITIAL_PROTOCOLS);
  const [emrEntries, setEmrEntries] = useState<EMREntry[]>([]);

  // Navigation Tab state: Mobile-First, Direct Buttons (No dropdown groups)
  const [activeTab, setActiveTab] = useState<
    | 'treatment'
    | 'clinical_consultation'
    | 'emr_timeline'
    | 'ai_medical'
    | 'emergency_mode'
  >('treatment');

  // Interactive Patient Dropdown Selector state
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showPatientsListModal, setShowPatientsListModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // New Patient Form State (16 Points)
  const [newCategory, setNewCategory] = useState<'ADULTO' | 'PEDIÁTRICO'>('ADULTO'); // 1
  const [newName, setNewName] = useState(''); // 2
  const [newAge, setNewAge] = useState<number | ''>(30); // 3
  const [newWeight, setNewWeight] = useState<number | ''>(70); // 4
  const [newHeight, setNewHeight] = useState<number | ''>(170); // 5
  const [newBloodGroup, setNewBloodGroup] = useState<BloodGroup>('O+'); // 6
  const [newStatus, setNewStatus] = useState<PatientStatus>('Estable'); // 7
  const [newSex, setNewSex] = useState<'M' | 'F'>('F');
  const [newCardId, setNewCardId] = useState('');

  // Signos Vitales (8 a 16)
  const [newHeartRate, setNewHeartRate] = useState<number | ''>(80); // 8
  const [newBloodPressure, setNewBloodPressure] = useState('120/80'); // 9
  const [newTemperature, setNewTemperature] = useState<number | ''>(36.5); // 10
  const [newOxygenSat, setNewOxygenSat] = useState<number | ''>(98); // 11
  const [newRespRate, setNewRespRate] = useState<number | ''>(16); // 12
  const [newPainScale, setNewPainScale] = useState<number | ''>(0); // 13
  const [newGlychemia, setNewGlychemia] = useState<number | ''>(100); // 14
  const [newDiuresis, setNewDiuresis] = useState<number | ''>(60); // 15
  
  // 16. Glasgow
  const [newGlasgowOcular, setNewGlasgowOcular] = useState<number>(4);
  const [newGlasgowVerbal, setNewGlasgowVerbal] = useState<number>(5);
  const [newGlasgowMotor, setNewGlasgowMotor] = useState<number>(6);

  // Active patient object
  const activePatient = patients.find(p => p.id === activePatientId) || null;

  // Helper to retrieve deleted patient IDs set for current license key
  const getDeletedPatientIds = (normKey: string): Set<string> => {
    try {
      const raw = localStorage.getItem(`dosia_deleted_patients_${normKey}`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch (e) {}
    return new Set();
  };

  // Helper to merge local patients and cloud patients safely without wiping local data
  const mergePatientsLists = (localP: Patient[], cloudP: Patient[], normKey: string): Patient[] => {
    const deletedSet = getDeletedPatientIds(normKey);
    const resultMap = new Map<string, Patient>();

    if (Array.isArray(localP)) {
      for (const p of localP) {
        if (p && p.id && !deletedSet.has(p.id)) {
          resultMap.set(p.id, p);
        }
      }
    }

    if (Array.isArray(cloudP)) {
      for (const p of cloudP) {
        if (p && p.id && !deletedSet.has(p.id)) {
          if (!resultMap.has(p.id)) {
            resultMap.set(p.id, p);
          } else {
            const existing = resultMap.get(p.id)!;
            resultMap.set(p.id, { ...existing, ...p });
          }
        }
      }
    }

    return Array.from(resultMap.values());
  };

  // Real-time synchronization of patients with Cloud Firestore across all devices with same license
  useEffect(() => {
    const normKey = (doctor?.licenseKey || '').trim().toUpperCase();
    if (!normKey) return;

    const storageKey = `dosia_patients_${normKey}`;

    // 1. Local storage load for instant render
    let initialLocal: Patient[] = [];
    try {
      const storedP = localStorage.getItem(storageKey);
      if (storedP) {
        const parsed = JSON.parse(storedP);
        if (Array.isArray(parsed)) {
          initialLocal = parsed;
        }
      }
    } catch (e) {
      console.error('Error reading local patients cache:', e);
    }

    const deletedSet = getDeletedPatientIds(normKey);
    const validInitial = initialLocal.filter(p => p && p.id && !deletedSet.has(p.id));
    setPatients(validInitial);

    // 2. Subscribe to real-time Cloud Firestore updates
    const unsubscribe = subscribeCloudPatients(doctor.licenseKey, (cloudPatients) => {
      let currentLocal: Patient[] = [];
      try {
        const storedP = localStorage.getItem(storageKey);
        if (storedP) {
          const parsed = JSON.parse(storedP);
          if (Array.isArray(parsed)) {
            currentLocal = parsed;
          }
        }
      } catch (e) {}

      const merged = mergePatientsLists(currentLocal, cloudPatients, normKey);
      setPatients(merged);

      try {
        localStorage.setItem(storageKey, JSON.stringify(merged));
      } catch (e) {}
    });

    return () => unsubscribe();
  }, [doctor?.licenseKey]);

  const savePatientsToStorage = (updatedPatients: Patient[]) => {
    const normKey = (doctor?.licenseKey || '').trim().toUpperCase();
    if (!normKey) return;
    try {
      localStorage.setItem(`dosia_patients_${normKey}`, JSON.stringify(updatedPatients));
    } catch (e) {
      console.error('Error al guardar pacientes en localStorage:', e);
    }
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

  const isMandatoryValid = (
    newAge !== '' && Number(newAge) > 0 &&
    newWeight !== '' && Number(newWeight) > 0 &&
    newHeight !== '' && Number(newHeight) > 0
  );

  // Handle Create Patient: Automatically selects the patient and switches to Treatment!
  const handleCreatePatient = () => {
    if (!isMandatoryValid) return;

    const ageNum = Number(newAge) || 30;
    const totalGlasgow = Number(newGlasgowOcular) + Number(newGlasgowVerbal) + Number(newGlasgowMotor);
    const finalName = newName.trim() || `Paciente #${Math.floor(1000 + Math.random() * 9000)}`;
    const finalCardId = newCardId.trim() || `C.I.-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newP: Patient = {
      id: `p-${Date.now()}`,
      name: finalName,
      cardId: finalCardId,
      hcNumber: `HC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientCategory: newCategory,
      age: ageNum,
      weight: Number(newWeight) || (newCategory === 'PEDIÁTRICO' ? 18 : 70),
      height: Number(newHeight) || (newCategory === 'PEDIÁTRICO' ? 105 : 170),
      sex: newSex,
      bloodGroup: newBloodGroup,
      status: newStatus,
      lastConsultationDate: new Date().toISOString().split('T')[0],
      attendingDoctor: formatDoctorName(doctor.name),
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
    saveCloudPatient(newP, doctor.licenseKey);
    setActivePatientId(newP.id);
    setActiveTab('treatment'); // Immediately jump to Treatment as requested!
    setShowNewPatientModal(false);
    resetNewPatientForm();
  };

  const handleUpdatePatient = (updated: Patient) => {
    const list = patients.map(p => p.id === updated.id ? updated : p);
    savePatientsToStorage(list);
    saveCloudPatient(updated, doctor.licenseKey);
  };

  const handleDeletePatient = (patientId: string) => {
    const normKey = (doctor?.licenseKey || '').trim().toUpperCase();
    if (normKey && patientId) {
      try {
        const deletedSet = getDeletedPatientIds(normKey);
        deletedSet.add(patientId);
        localStorage.setItem(`dosia_deleted_patients_${normKey}`, JSON.stringify(Array.from(deletedSet)));
      } catch (e) {}
    }

    const updated = patients.filter(p => p.id !== patientId);
    savePatientsToStorage(updated);
    deleteCloudPatient(patientId);
    if (activePatientId === patientId) {
      setActivePatientId(updated.length > 0 ? updated[0].id : '');
    }
  };

  const handleUpdateVitals = (vitals: VitalSigns) => {
    if (!activePatient) return;
    const updated: Patient = {
      ...activePatient,
      vitalSigns: vitals
    };
    handleUpdatePatient(updated);
  };

  // Filtered dropdown patients
  const filteredDropdownPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    p.cardId.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    p.hcNumber.toLowerCase().includes(patientSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-brand-teal selection:text-slate-900">
      
      {/* 1. TOP MOBILE-FIRST HEADER BAR */}
      <header className="bg-slate-900 border-b border-slate-800/90 px-3 sm:px-6 py-2.5 sticky top-0 z-40 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Logo & App Icon with "TRATAMIENTOS MÉDICOS" subtitle right underneath */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <DosiaAppIcon size="sm" />
              <DosiaLogo size="md" />
              <span className="text-[10px] bg-brand-teal/20 text-brand-teal px-1.5 py-0.5 rounded font-mono font-bold">
                v2026
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-brand-teal-pastel uppercase font-mono mt-0.5">
              TRATAMIENTOS MÉDICOS
            </span>
          </div>

          {/* Action Buttons Section: Features "CREAR ICONO" and "CERRAR SESIÓN" */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* CREAR ICONO */}
            {onOpenCreateIcon && (
              <button
                type="button"
                onClick={onOpenCreateIcon}
                className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/50 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs shadow-sm shadow-cyan-500/10 active:scale-95 cursor-pointer"
                title="Crear icono en la pantalla principal del celular"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-extrabold tracking-wide">CREAR ICONO</span>
              </button>
            )}

            {/* Quick New Patient Button */}
            <button
              type="button"
              onClick={() => setShowNewPatientModal(true)}
              className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-brand-teal/20"
              title="Registrar nuevo paciente"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Paciente</span>
            </button>

            {/* CERRAR SESION Button (Icon-only with door and arrow in red) */}
            <button
              type="button"
              onClick={onLogout}
              className="p-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm active:scale-95 shrink-0"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
            </button>
          </div>

        </div>
      </header>

      {/* 2. ACTIVE PATIENT QUICK BANNER & SWITCHER (Mobile-First) */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          
          {/* Patient Selector Dropdown */}
          <div className="relative flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setIsPatientDropdownOpen(prev => !prev)}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-700/80 text-white rounded-xl px-3 py-2 flex items-center justify-between gap-2 cursor-pointer shadow-inner transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                <UserCheck className={`w-4 h-4 shrink-0 ${activePatient ? 'text-brand-teal' : 'text-slate-500'}`} />
                <span className="font-bold truncate">
                  {activePatient ? `${activePatient.name} (${activePatient.age}a • ${activePatient.weight}kg)` : 'Seleccionar Paciente de la Lista...'}
                </span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono shrink-0">
                {patients.length} reg.
              </span>
            </button>

            {/* Dropdown Menu */}
            {isPatientDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[120] bg-black/60 sm:bg-transparent" 
                  onClick={() => setIsPatientDropdownOpen(false)} 
                />
                <div className="fixed inset-x-3 top-24 sm:absolute sm:top-full sm:left-0 sm:right-auto sm:w-80 z-[130] bg-slate-900 border border-brand-teal/50 rounded-2xl shadow-2xl overflow-hidden py-1 divide-y divide-slate-800 animate-fade-in">
                  
                  <div className="p-2.5 bg-slate-950 space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={patientSearchQuery}
                        onChange={(e) => setPatientSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto divide-y divide-slate-800/60 max-h-[260px]">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePatientId('');
                        setIsPatientDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between cursor-pointer ${
                        activePatientId === '' ? 'bg-brand-teal/20 text-brand-teal' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="italic">-- Deseleccionar Paciente --</span>
                      {activePatientId === '' && <Check className="w-4 h-4 text-brand-teal" />}
                    </button>

                    {filteredDropdownPatients.map((p) => {
                      const isSelected = p.id === activePatientId;
                      const cat = p.patientCategory || (p.age < 15 ? 'PEDIÁTRICO' : 'ADULTO');
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setActivePatientId(p.id);
                            setIsPatientDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected ? 'bg-brand-teal/20 text-brand-teal font-extrabold' : 'text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="font-bold text-white flex items-center gap-1.5 truncate">
                              <span>{p.name}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                cat === 'PEDIÁTRICO' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                              }`}>
                                {cat}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              C.I.: {p.cardId} • {p.age}a • {p.weight}kg
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-brand-teal shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2 bg-slate-950">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPatientDropdownOpen(false);
                        setShowNewPatientModal(true);
                      }}
                      className="w-full bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar Nuevo
                    </button>
                  </div>

                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* 3. PRIMARY NAVIGATION BAR (Individual Direct Buttons - Prompt Mandate) */}
      <nav className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2 sticky top-[53px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          
          {/* TAB 1: TRATAMIENTO & VADEMÉCUM (Centerpiece) */}
          <button
            type="button"
            onClick={() => setActiveTab('treatment')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              activeTab === 'treatment'
                ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-md shadow-brand-teal/20 font-extrabold'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border-slate-700/80'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Tratamiento & Vademécum</span>
          </button>

          {/* TAB 2: CONSULTA & EVALUACIÓN */}
          <button
            type="button"
            onClick={() => setActiveTab('clinical_consultation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              activeTab === 'clinical_consultation'
                ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-md shadow-brand-teal/20 font-extrabold'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border-slate-700/80'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Consulta & Tríada</span>
          </button>

          {/* TAB 4: HISTORIAL CLÍNICO (EMR) */}
          <button
            type="button"
            onClick={() => setActiveTab('emr_timeline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              activeTab === 'emr_timeline'
                ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-md shadow-brand-teal/20 font-extrabold'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border-slate-700/80'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historial Clínico</span>
          </button>

          {/* TAB 5: IA MÉDICA (Direct Button) */}
          <button
            type="button"
            onClick={() => setActiveTab('ai_medical')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              activeTab === 'ai_medical'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-extrabold'
                : 'bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 border-cyan-500/40'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>IA Médica</span>
          </button>

          {/* TAB 7: MODO EMERGENCIA (Direct Button) */}
          <button
            type="button"
            onClick={() => setActiveTab('emergency_mode')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              activeTab === 'emergency_mode'
                ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-md font-extrabold'
                : 'bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 border-rose-500/40'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>⚡ Emergencia</span>
          </button>

        </div>
      </nav>

      {/* 4. MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        
        {/* If no patient is active and on Patient Consultation or Treatment: Show Hero Action Cards */}
        {!activePatient && (activeTab === 'treatment' || activeTab === 'clinical_consultation') && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-6 max-w-2xl mx-auto shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-brand-teal/10 border border-brand-teal/30 text-brand-teal rounded-full flex items-center justify-center mx-auto">
              <Pill className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                Bienvenido al Asistente Terapéutico DOSIA
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Para diagnosticar el tratamiento, calcular dosis pediátricas/adulto y ajustar medicamentos del vademécum, inicie registrando un paciente o seleccione uno existente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto pt-2">
              <button
                type="button"
                onClick={() => setShowNewPatientModal(true)}
                className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-extrabold p-4 rounded-2xl text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-teal/20"
              >
                <Plus className="w-6 h-6" />
                <span>Registrar Nuevo Paciente</span>
                <span className="text-[10px] font-normal opacity-80">Ventana completa con signos vitales</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPatientsListModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold p-4 rounded-2xl text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                <UserCheck className="w-6 h-6 text-brand-teal" />
                <span>Ver Pacientes ({patients.length})</span>
                <span className="text-[10px] font-normal text-slate-400">Seleccionar paciente registrado</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: TRATAMIENTO & VADEMÉCUM (PRIMARY COMPONENT) */}
        {activeTab === 'treatment' && activePatient && (
          <PatientTreatmentSection
            patient={activePatient}
            onSaveToEMR={(newEntry) => setEmrEntries([newEntry, ...emrEntries])}
            onUpdatePatient={handleUpdatePatient}
            onOpenNewPatientModal={() => setShowNewPatientModal(true)}
          />
        )}

        {/* TAB 2: CONSULTA & EVALUACIÓN */}
        {activeTab === 'clinical_consultation' && activePatient && (
          <div className="space-y-6 animate-fade-in">
            <AutoEvaluationModule patient={activePatient} onUpdateVitals={handleUpdateVitals} />
          </div>
        )}

        {/* TAB 4: HISTORIAL CLÍNICO (EMR) */}
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

        {/* TAB 5: IA MÉDICA */}
        {activeTab === 'ai_medical' && (
          <div className="space-y-6 animate-fade-in">
            <AIMedicalAssistantModule patient={activePatient} />
          </div>
        )}

        {/* TAB 6: MODO EMERGENCIA */}
        {activeTab === 'emergency_mode' && (
          <div className="space-y-6 animate-fade-in">
            <EmergencyModeModule patient={activePatient} />
          </div>
        )}

      </main>

      {/* 5. FULL 16-POINTS PATIENT REGISTRATION MODAL */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 my-6 space-y-4 text-left shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-brand-teal" /> Registro de Paciente & Signos Vitales
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete los datos personales y signos vitales para generar automáticamente el tratamiento personalizado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPatientModal(false)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
              
              {/* SECTION A: MANDATORY FIELDS (Puntos 1 a 7) */}
              <div className="bg-slate-950/80 border border-brand-teal/30 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-brand-teal uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                  1. Datos Personales Obligatorios (Puntos 1 a 7)
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
                          : 'bg-slate-900 border-slate-800 text-slate-400'
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
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Baby className="w-4 h-4" /> NIÑO (PEDIÁTRICO)
                    </button>
                  </div>
                </div>

                {/* Point 2: Nombre */}
                <div>
                  <label className="text-slate-300 font-bold block mb-1">2. Nombre y Apellido Completo</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Carmen María Delgado"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-brand-teal font-bold font-mono"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  {/* Point 7: Estado Hospitalario */}
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">7. Estado Clínico *</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as PatientStatus)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      <option value="Estable">Estable</option>
                      <option value="Observación">Observación</option>
                      <option value="Crítico">Crítico</option>
                      <option value="Alta">Alta Médica</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-800 pt-2">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Cédula / Identificación (Opcional)</label>
                    <input
                      type="text"
                      value={newCardId}
                      onChange={(e) => setNewCardId(e.target.value)}
                      placeholder="Ej. 0928172635"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Sexo Biológico</label>
                    <select
                      value={newSex}
                      onChange={(e) => setNewSex(e.target.value as 'M' | 'F')}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs"
                    >
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* SECTION B: VITAL SIGNS & GLASGOW (Puntos 8 a 16) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                  2. Signos Vitales y Estado Inicial (Puntos 8 a 16)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">8. FC (lpm)</label>
                    <input
                      type="number"
                      value={newHeartRate}
                      onChange={(e) => setNewHeartRate(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="80"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">9. PA (mmHg)</label>
                    <input
                      type="text"
                      value={newBloodPressure}
                      onChange={(e) => setNewBloodPressure(e.target.value)}
                      placeholder="120/80"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">10. T° (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newTemperature}
                      onChange={(e) => setNewTemperature(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="36.5"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">11. SpO2 (%)</label>
                    <input
                      type="number"
                      value={newOxygenSat}
                      onChange={(e) => setNewOxygenSat(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="98"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">12. FR (rpm)</label>
                    <input
                      type="number"
                      value={newRespRate}
                      onChange={(e) => setNewRespRate(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="16"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">13. Dolor EVA (0-10)</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={newPainScale}
                      onChange={(e) => setNewPainScale(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">14. Glucemia (mg/dL)</label>
                    <input
                      type="number"
                      value={newGlychemia}
                      onChange={(e) => setNewGlychemia(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="100"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">15. Diuresis (mL/h)</label>
                    <input
                      type="number"
                      value={newDiuresis}
                      onChange={(e) => setNewDiuresis(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="60"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Point 16: Glasgow */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      16. Escala de Glasgow ({newGlasgowOcular + newGlasgowVerbal + newGlasgowMotor} / 15)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Ocular (1-4)</label>
                      <select
                        value={newGlasgowOcular}
                        onChange={(e) => setNewGlasgowOcular(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                      >
                        <option value={4}>O4: Espontánea (4 pt)</option>
                        <option value={3}>O3: A la voz (3 pt)</option>
                        <option value={2}>O2: Al dolor (2 pt)</option>
                        <option value={1}>O1: Nula (1 pt)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Verbal (1-5)</label>
                      <select
                        value={newGlasgowVerbal}
                        onChange={(e) => setNewGlasgowVerbal(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                      >
                        <option value={5}>V5: Orientada (5 pt)</option>
                        <option value={4}>V4: Confusa (4 pt)</option>
                        <option value={3}>V3: Palabras inapropiadas (3 pt)</option>
                        <option value={2}>V2: Sonidos incomprensibles (2 pt)</option>
                        <option value={1}>V1: Nula (1 pt)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Motora (1-6)</label>
                      <select
                        value={newGlasgowMotor}
                        onChange={(e) => setNewGlasgowMotor(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
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

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-mono text-slate-400">
                {isMandatoryValid ? (
                  <span className="text-emerald-400 font-bold">✓ Datos completos para prescripción</span>
                ) : (
                  <span className="text-amber-400 font-bold">⚠️ Ingrese edad, peso y talla</span>
                )}
              </span>

              <div className="flex items-center justify-end gap-2">
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
                  className={`font-extrabold px-5 py-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
                    isMandatoryValid
                      ? 'bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 shadow-md shadow-brand-teal/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>Guardar y Crear Tratamiento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. GLOBAL SEARCH MODAL */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        patients={patients}
        medications={medications}
        protocols={protocols}
        documents={[]}
        onSelectPatient={(p) => setActivePatientId(p.id)}
        onSelectTab={(tab) => setActiveTab(tab as any)}
      />

      {/* 7. PATIENTS LIST MODAL */}
      <PatientsListModal
        isOpen={showPatientsListModal}
        onClose={() => setShowPatientsListModal(false)}
        patients={patients}
        activePatientId={activePatientId}
        onSelectPatient={(id) => {
          setActivePatientId(id);
          setActiveTab('treatment');
        }}
        onDeletePatient={handleDeletePatient}
        onOpenNewPatientModal={() => setShowNewPatientModal(true)}
      />

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-3 text-center text-[11px] text-slate-500 font-mono">
        DOSIA 2026 • Plataforma Clínica Inteligente First-Mobile
      </footer>

    </div>
  );
}

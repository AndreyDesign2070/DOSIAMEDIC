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
import PatientsListModal from './PatientsListModal';
import DosiaLogo from './DosiaLogo';
import DosiaAppIcon from './DosiaAppIcon';
import { 
  subscribeCloudPatients, 
  saveCloudPatient, 
  deleteCloudPatient 
} from '../lib/firebase';
import {
  User, Activity, Calculator, Pill, FileText, Clock, Bot, HeartPulse,
  Image as ImageIcon, BarChart3, Search, Plus, LogOut, ShieldCheck,
  ChevronDown, Check, Sparkles, Baby, UserPlus, X, Smartphone, Monitor, ChevronRight
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
  // Global Patients & Active Patient State (Starts empty with 0 patients for a new license)
  const [patients, setPatients] = useState<Patient[]>([]);
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

  // Navigation Group Dropdowns state ('g1' | 'g2' | 'g3' | null)
  const [openGroup, setOpenGroup] = useState<'g1' | 'g2' | 'g3' | null>(null);

  // Interactive Patient Dropdown Selector state
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Global Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Patients List Modal state
  const [showPatientsListModal, setShowPatientsListModal] = useState(false);

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

    // 1. Add local patients first
    if (Array.isArray(localP)) {
      for (const p of localP) {
        if (p && p.id && !deletedSet.has(p.id)) {
          resultMap.set(p.id, p);
        }
      }
    }

    // 2. Add or update cloud patients (respecting deleted set)
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

    // 1. Try local cache first for instant zero-latency render
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

    // 2. Subscribe to real-time Cloud Firestore updates for doctor.licenseKey
    const unsubscribe = subscribeCloudPatients(doctor.licenseKey, (cloudPatients) => {
      // Re-read current local storage to preserve any patients created locally during session
      let currentLocal: Patient[] = [];
      try {
        const s = localStorage.getItem(storageKey);
        if (s) {
          const p = JSON.parse(s);
          if (Array.isArray(p)) currentLocal = p;
        }
      } catch (e) {}

      const merged = mergePatientsLists(currentLocal, cloudPatients || [], normKey);
      setPatients(merged);
      localStorage.setItem(storageKey, JSON.stringify(merged));

      // Auto-upload any local patients to Cloud Firestore that aren't in cloud list yet
      const cloudIds = new Set((cloudPatients || []).map(p => p.id));
      merged.forEach(p => {
        if (!cloudIds.has(p.id)) {
          saveCloudPatient(p, doctor.licenseKey);
        }
      });
    });

    return () => unsubscribe();
  }, [doctor?.licenseKey]);

  const savePatientsToStorage = (updatedList: Patient[]) => {
    setPatients(updatedList);
    const normKey = (doctor?.licenseKey || '').trim().toUpperCase();
    if (normKey) {
      localStorage.setItem(`dosia_patients_${normKey}`, JSON.stringify(updatedList));
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

  // Mandatory validation (Name and Card ID are optional)
  const isMandatoryValid = Boolean(
    newCategory &&
    newAge !== '' && Number(newAge) >= 0 &&
    newWeight !== '' && Number(newWeight) > 0 &&
    newHeight !== '' && Number(newHeight) > 0 &&
    newBloodGroup &&
    newStatus
  );

  const handleCreatePatient = () => {
    if (!isMandatoryValid) {
      alert('Por favor complete los datos básicos (Categoría, Edad, Peso, Talla, Grupo Sanguíneo y Estado).');
      return;
    }

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
    saveCloudPatient(newP, doctor.licenseKey);
    setActivePatientId(newP.id);
    setShowNewPatientModal(false);
    resetNewPatientForm();
  };

  // Patient Updates
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

  // Filtered patients for dropdown
  const filteredDropdownPatients = patients.filter(p => {
    if (!patientSearchQuery.trim()) return true;
    const q = patientSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.cardId.toLowerCase().includes(q) ||
      p.hcNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col font-sans selection:bg-brand-teal selection:text-slate-900 transition-all duration-300">
      
      {/* 1. TOP SYSTEM APP BAR */}
      <header className="bg-brand-navy-light border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-30">
        
        {/* Left Branding */}
        <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <DosiaAppIcon size="sm" className="animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <DosiaLogo size="md" />
                <span className="text-[9px] sm:text-[10px] bg-brand-teal/20 text-brand-teal border border-brand-teal/40 px-2 sm:px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase shrink-0">
                  PRESCRIPCIÓN MÉDICA
                </span>
              </div>

              <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-snug">
                <div>Médico Autorizado: <strong className="text-slate-200">{doctor.name}</strong></div>
                <div>Licencia: <span className="font-mono text-brand-teal font-semibold">{doctor.licenseKey}</span></div>
              </div>
            </div>
          </div>

          {/* Mobile Logout Button (Visible only on small screens next to brand) */}
          <button
            type="button"
            onClick={onLogout}
            className="md:hidden bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Action Tools & Top Right Buttons */}
        <div className="grid grid-cols-3 sm:flex sm:items-center sm:flex-wrap justify-between md:justify-end gap-1.5 sm:gap-2 w-full md:w-auto">
          
          <button
            type="button"
            onClick={() => setShowNewPatientModal(true)}
            className="col-span-1 bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-2 sm:px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-brand-teal/10"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Nuevo Paciente</span>
          </button>

          {/* White Pacientes Button right next to Nuevo Paciente */}
          <button
            type="button"
            onClick={() => setShowPatientsListModal(true)}
            className="col-span-1 bg-white hover:bg-slate-100 text-slate-900 font-bold px-2 sm:px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm border border-slate-200"
          >
            <User className="w-3.5 h-3.5 text-brand-navy shrink-0" />
            <span className="truncate">Pacientes</span>
            {patients.length > 0 && (
              <span className="bg-brand-navy/10 text-brand-navy text-[10px] font-extrabold px-1.5 py-0.2 rounded-full font-mono shrink-0">
                {patients.length}
              </span>
            )}
          </button>

          {/* Global Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="col-span-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-brand-teal shrink-0" />
            <span className="truncate">Buscar</span>
          </button>

          {/* Logout button desktop */}
          <button
            type="button"
            onClick={onLogout}
            className="hidden md:flex bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer items-center gap-1"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>

        </div>
      </header>

      {/* 2. PERSISTENT TOP CLINICAL ALERTS PANEL */}
      <ClinicalAlertsBar patient={activePatient} onUpdateAlerts={handleUpdateAlerts} />

      {/* 3. PATIENT SELECTOR STRIP DIRECTLY ABOVE / NEAR THE TABS (Prompt Request #7) */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative">
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono shrink-0">
            Paciente:
          </span>

          {/* CUSTOM INTERACTIVE PATIENT DROPDOWN SELECTOR */}
          <div className="relative inline-block text-left min-w-0 max-w-full">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPatientDropdownOpen(prev => !prev);
              }}
              className="flex items-center justify-between gap-2 bg-slate-950 hover:bg-slate-800 border border-brand-teal/50 rounded-xl px-3 py-1.5 shadow-inner transition-all cursor-pointer min-w-0 text-xs font-bold text-white max-w-[280px] sm:max-w-md select-none"
              title="Haz clic para seleccionar o cambiar de paciente"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-brand-teal shrink-0" />
                <span className="truncate">
                  {activePatient ? (
                    <>
                      <strong className="text-white">{activePatient.name}</strong> — {activePatient.cardId}
                    </>
                  ) : (
                    <span className="text-slate-400 italic">-- Seleccionar Paciente --</span>
                  )}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-brand-teal shrink-0 transition-transform ${isPatientDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* POPUP DROPDOWN MENU FOR SELECTING PATIENT */}
            {isPatientDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none" 
                  onClick={() => setIsPatientDropdownOpen(false)} 
                />
                <div className="fixed inset-x-3 top-28 sm:absolute sm:top-full sm:left-0 sm:right-auto sm:w-96 z-[125] bg-slate-900 border border-brand-teal/60 rounded-2xl shadow-2xl overflow-hidden py-1 divide-y divide-slate-800 animate-fade-in max-h-[70vh] flex flex-col">
                  
                  {/* Search Header */}
                  <div className="p-2.5 bg-slate-950 shrink-0 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-brand-teal font-bold uppercase tracking-wider">
                      <span>Seleccionar Paciente</span>
                      <button
                        type="button"
                        onClick={() => setIsPatientDropdownOpen(false)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, cédula o HC..."
                        value={patientSearchQuery}
                        onChange={(e) => setPatientSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="overflow-y-auto divide-y divide-slate-800/60 max-h-[300px]">
                    {/* Option: None */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActivePatientId('');
                        setIsPatientDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        activePatientId === '' ? 'bg-brand-teal/20 text-brand-teal font-extrabold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span className="italic">-- Ningún paciente seleccionado --</span>
                      {activePatientId === '' && <Check className="w-4 h-4 text-brand-teal shrink-0" />}
                    </button>

                    {/* Patient Items */}
                    {filteredDropdownPatients.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-slate-500 italic">
                        No se encontraron pacientes registrados.
                      </div>
                    ) : (
                      filteredDropdownPatients.map((p) => {
                        const isSelected = p.id === activePatientId;
                        const cat = p.patientCategory || (p.age < 15 ? 'PEDIÁTRICO' : 'ADULTO');
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActivePatientId(p.id);
                              setIsPatientDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-brand-teal/20 text-brand-teal font-extrabold'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                <span>{p.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                  cat === 'PEDIÁTRICO' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                                }`}>
                                  {cat}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Cédula: {p.cardId} • Edad: {p.age}a • HC: {p.hcNumber}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-brand-teal shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Create New Patient Footer Option */}
                  <div className="p-2 bg-slate-950 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsPatientDropdownOpen(false);
                        setShowNewPatientModal(true);
                      }}
                      className="w-full bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Plus className="w-4 h-4" /> Registrar Nuevo Paciente
                    </button>
                  </div>

                </div>
              </>
            )}
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

      {/* 4. PRIMARY NAVIGATION TABS NAVBAR (GROUPED DROPDOWNS AS REQUESTED) */}
      <div className="bg-brand-navy-light border-b border-slate-800 px-3 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto sm:overflow-visible max-w-full sm:flex-wrap sticky top-[49px] z-30">
        
        {/* GRUPO 1: Perfil del paciente, Consulta Clínica, Evaluación Automática */}
        {(() => {
          const g1Items = [
            { id: 'patient_profile', label: 'Perfil del Paciente', icon: User },
            { id: 'clinical_consultation', label: 'Consulta Clínica', icon: FileText },
            { id: 'auto_evaluation', label: 'Evaluación Automática', icon: Activity }
          ];
          const isG1Active = g1Items.some(item => item.id === activeTab);
          const activeItem = g1Items.find(item => item.id === activeTab);

          return (
            <div className="relative inline-block text-left shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenGroup(openGroup === 'g1' ? null : 'g1');
                }}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border select-none ${
                  isG1Active
                    ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-lg shadow-brand-teal/20 font-extrabold'
                    : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800 border-slate-700/80'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">GRUPO 1</span>
                  <span className="text-xs truncate max-w-[110px] sm:max-w-[180px]">
                    {activeItem ? activeItem.label : 'Consulta & Evaluación'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openGroup === 'g1' ? 'rotate-180' : ''}`} />
              </button>

              {openGroup === 'g1' && (
                <>
                  <div 
                    className="fixed inset-0 z-[100] bg-black/60 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none" 
                    onClick={() => setOpenGroup(null)} 
                  />
                  <div className="fixed inset-x-3 top-28 sm:absolute sm:top-full sm:left-0 sm:right-auto sm:w-64 z-[110] rounded-2xl bg-slate-900 border border-brand-teal/50 shadow-2xl overflow-hidden py-1 divide-y divide-slate-800">
                    <div className="px-3.5 py-2 text-[10px] font-mono text-brand-teal font-bold uppercase tracking-wider bg-slate-950/90 flex items-center justify-between">
                      <span>GRUPO 1 — Paciente & Consulta</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenGroup(null);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {g1Items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveTab(item.id as any);
                            setOpenGroup(null);
                          }}
                          className={`w-full text-left px-4 py-3 sm:py-2.5 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-brand-teal/20 text-brand-teal font-extrabold'
                              : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-brand-teal shrink-0" />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-brand-teal shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* GRUPO 2: Prescripción & Vademécum, Documentos & Certificados */}
        {(() => {
          const g2Items = [
            { id: 'prescription', label: 'Prescripción & Vademécum', icon: Pill },
            { id: 'documents', label: 'Documentos & Certificados', icon: ShieldCheck }
          ];
          const isG2Active = g2Items.some(item => item.id === activeTab);
          const activeItem = g2Items.find(item => item.id === activeTab);

          return (
            <div className="relative inline-block text-left shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenGroup(openGroup === 'g2' ? null : 'g2');
                }}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border select-none ${
                  isG2Active
                    ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-lg shadow-brand-teal/20 font-extrabold'
                    : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800 border-slate-700/80'
                }`}
              >
                <Pill className="w-4 h-4 shrink-0" />
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">GRUPO 2</span>
                  <span className="text-xs truncate max-w-[110px] sm:max-w-[180px]">
                    {activeItem ? activeItem.label : 'Prescripción & Documentos'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openGroup === 'g2' ? 'rotate-180' : ''}`} />
              </button>

              {openGroup === 'g2' && (
                <>
                  <div 
                    className="fixed inset-0 z-[100] bg-black/60 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none" 
                    onClick={() => setOpenGroup(null)} 
                  />
                  <div className="fixed inset-x-3 top-28 sm:absolute sm:top-full sm:left-0 sm:right-auto sm:w-64 z-[110] rounded-2xl bg-slate-900 border border-brand-teal/50 shadow-2xl overflow-hidden py-1 divide-y divide-slate-800">
                    <div className="px-3.5 py-2 text-[10px] font-mono text-brand-teal font-bold uppercase tracking-wider bg-slate-950/90 flex items-center justify-between">
                      <span>GRUPO 2 — Prescripción & Docs</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenGroup(null);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {g2Items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveTab(item.id as any);
                            setOpenGroup(null);
                          }}
                          className={`w-full text-left px-4 py-3 sm:py-2.5 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-brand-teal/20 text-brand-teal font-extrabold'
                              : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-brand-teal shrink-0" />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-brand-teal shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* GRUPO 3: Historial Clínico, Escalas Médicas, Estadísticas (+ Imagenología) */}
        {(() => {
          const g3Items = [
            { id: 'emr_timeline', label: 'Historial Clínico (Timeline)', icon: Clock },
            { id: 'medical_scales', label: 'Escalas Médicas', icon: Calculator },
            { id: 'analytics', label: 'Estadísticas', icon: BarChart3 },
            { id: 'imaging', label: 'Imagenología', icon: ImageIcon }
          ];
          const isG3Active = g3Items.some(item => item.id === activeTab);
          const activeItem = g3Items.find(item => item.id === activeTab);

          return (
            <div className="relative inline-block text-left shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenGroup(openGroup === 'g3' ? null : 'g3');
                }}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border select-none ${
                  isG3Active
                    ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-lg shadow-brand-teal/20 font-extrabold'
                    : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800 border-slate-700/80'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">GRUPO 3</span>
                  <span className="text-xs truncate max-w-[110px] sm:max-w-[180px]">
                    {activeItem ? activeItem.label : 'Historial & Escalas'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openGroup === 'g3' ? 'rotate-180' : ''}`} />
              </button>

              {openGroup === 'g3' && (
                <>
                  <div 
                    className="fixed inset-0 z-[100] bg-black/60 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none" 
                    onClick={() => setOpenGroup(null)} 
                  />
                  <div className="fixed inset-x-3 top-28 sm:absolute sm:top-full sm:left-0 sm:right-auto sm:w-64 z-[110] rounded-2xl bg-slate-900 border border-brand-teal/50 shadow-2xl overflow-hidden py-1 divide-y divide-slate-800">
                    <div className="px-3.5 py-2 text-[10px] font-mono text-brand-teal font-bold uppercase tracking-wider bg-slate-950/90 flex items-center justify-between">
                      <span>GRUPO 3 — Historial & Diagnóstico</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenGroup(null);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {g3Items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveTab(item.id as any);
                            setOpenGroup(null);
                          }}
                          className={`w-full text-left px-4 py-3 sm:py-2.5 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-brand-teal/20 text-brand-teal font-extrabold'
                              : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-brand-teal shrink-0" />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-brand-teal shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* SUELTO 1: IA Médica */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('ai_medical');
            setOpenGroup(null);
          }}
          className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border ${
            activeTab === 'ai_medical'
              ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-lg shadow-brand-teal/20 font-extrabold'
              : 'bg-slate-900/80 text-cyan-300 hover:text-white hover:bg-slate-800 border-cyan-500/30'
          }`}
        >
          <Bot className="w-4 h-4 text-cyan-400" />
          <span>IA Médica</span>
        </button>

        {/* SUELTO 2: Modo Emergencia */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('emergency_mode');
            setOpenGroup(null);
          }}
          className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border ${
            activeTab === 'emergency_mode'
              ? 'bg-rose-500 text-slate-900 border-rose-500 shadow-lg shadow-rose-500/20 font-extrabold'
              : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/30'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-rose-400" />
          <span>⚡ Modo Emergencia</span>
        </button>

      </div>

      {/* 5. MAIN BODY RENDERER FOR ACTIVE TAB */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* TAB 1: PERFIL DEL PACIENTE */}
        {activeTab === 'patient_profile' && (
          activePatient ? (
            <div className="space-y-6 animate-fade-in">
              <PatientProfileCard
                patient={activePatient}
                onUpdatePatient={handleUpdatePatient}
                onOpenConsultation={() => setActiveTab('clinical_consultation')}
                onSaveToEMR={(newEntry) => setEmrEntries([newEntry, ...emrEntries])}
              />
              <AutoEvaluationModule patient={activePatient} onUpdateVitals={handleUpdateVitals} />
            </div>
          ) : (
            <div className="bg-brand-navy-light/40 border border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto my-12 backdrop-blur-md animate-fade-in shadow-2xl">
              <div className="w-16 h-16 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal rounded-full flex items-center justify-center mx-auto">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Ningún Paciente Seleccionado</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                El perfil de paciente se encuentra actualmente vacío. Seleccione un paciente registrado en el menú superior o registre un nuevo paciente para comenzar la evaluación clínica.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(true)}
                  className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-brand-teal/10"
                >
                  <Plus className="w-4 h-4" /> Registrar Nuevo Paciente
                </button>
                <button
                  type="button"
                  onClick={() => setShowPatientsListModal(true)}
                  className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                >
                  <User className="w-4 h-4 text-brand-navy" /> Ver Lista de Pacientes ({patients.length})
                </button>
              </div>
            </div>
          )
        )}

        {/* TAB 2: CONSULTA CLÍNICA */}
        {activeTab === 'clinical_consultation' && (
          activePatient ? (
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
          ) : (
            <div className="bg-brand-navy-light/40 border border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto my-12 backdrop-blur-md animate-fade-in shadow-2xl">
              <div className="w-16 h-16 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Ningún Paciente Seleccionado</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Seleccione un paciente para iniciar la consulta clínica, evaluación de signos vitales y prescripción.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPatientsListModal(true)}
                  className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <User className="w-4 h-4" /> Seleccionar Paciente
                </button>
              </div>
            </div>
          )
        )}

        {/* TAB 3: EVALUACIÓN AUTOMÁTICA */}
        {activeTab === 'auto_evaluation' && (
          activePatient ? (
            <div className="space-y-6 animate-fade-in">
              <AutoEvaluationModule patient={activePatient} onUpdateVitals={handleUpdateVitals} />
            </div>
          ) : (
            <div className="bg-brand-navy-light/40 border border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto my-12 backdrop-blur-md animate-fade-in shadow-2xl">
              <div className="w-16 h-16 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal rounded-full flex items-center justify-center mx-auto">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Ningún Paciente Seleccionado</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Seleccione un paciente para visualizar su tríada de evaluación clínica y semáforo de riesgo.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPatientsListModal(true)}
                  className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <User className="w-4 h-4" /> Seleccionar Paciente
                </button>
              </div>
            </div>
          )
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
              doctorName={doctor.name}
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
                  <label className="text-slate-300 font-bold block mb-1">2. Nombre y Apellido Completo (Opcional)</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Carmen María Delgado (Opcional)"
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
                  <span className="text-emerald-400 font-bold">✓ Datos listos para crear perfil</span>
                ) : (
                  <span className="text-amber-400 font-bold">⚠️ Complete edad, peso y talla</span>
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

      {/* PATIENTS LIST MODAL */}
      <PatientsListModal
        isOpen={showPatientsListModal}
        onClose={() => setShowPatientsListModal(false)}
        patients={patients}
        activePatientId={activePatientId}
        onSelectPatient={(id) => setActivePatientId(id)}
        onDeletePatient={handleDeletePatient}
        onOpenNewPatientModal={() => setShowNewPatientModal(true)}
      />

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-mono">
        DOSIA Clinical Software 2026 • Sistema Médico Certificado • Creado por Andrey Design
      </footer>

    </div>
  );
}

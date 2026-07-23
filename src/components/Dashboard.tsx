import React, { useState, useEffect } from 'react';
import { Patient, Prescription, Medication, EmergencyProtocol, AuditEntry, TemplateDocument } from '../types';
import { INITIAL_MEDICATIONS, INITIAL_PROTOCOLS } from '../data';
import { calculateBSA, calculateIMC, getIMCCategory, calculateDoseByWeight, generatePrescriptionQR } from '../utils/calc';
import SignaturePad from './SignaturePad';
import DosiaLogo from './DosiaLogo';
import DosiaAppIcon from './DosiaAppIcon';
import {
  Heart, User, Calendar, Activity, Weight, Ruler, AlertTriangle, Search,
  Plus, Trash2, Sparkles, FileText, CheckCircle, Smartphone, Wifi, WifiOff,
  CloudLightning, Database, Share2, Printer, Clipboard, FileCheck, RefreshCw,
  QrCode, BookOpen, Clock, HeartPulse, LogOut, Award, BarChart3, Image as ImageIcon,
  Paperclip, ShieldAlert, Check, Eye, EyeOff, Cloud
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
  // Global States
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [activeTab, setActiveTab] = useState<'prescribe' | 'history' | 'vademecum' | 'protocols' | 'stats'>('prescribe');

  // Form: Active Patient State
  const [patientName, setPatientName] = useState('');
  const [patientCardId, setPatientCardId] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientWeight, setPatientWeight] = useState<number | ''>('');
  const [patientHeight, setPatientHeight] = useState<number | ''>('');
  const [patientSex, setPatientSex] = useState<'M' | 'F'>('M');
  
  // Vital Signs
  const [heartRate, setHeartRate] = useState<number | ''>('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState<number | ''>('');
  const [respiratoryRate, setRespiratoryRate] = useState<number | ''>('');
  const [oxygenSaturation, setOxygenSaturation] = useState<number | ''>('');

  // Diagnosis, Allergies, Pre-existing conditions
  const [diagnosis, setDiagnosis] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [preExistingInput, setPreExistingInput] = useState('');
  const [preExistingConditions, setPreExistingConditions] = useState<string[]>([]);

  // Attachments
  const [attachments, setAttachments] = useState<{ name: string; type: string; dataUrl: string }[]>([]);
  const [attType, setAttType] = useState<'photo' | 'study'>('photo');

  // Active Prescribing State
  const [selectedMedId, setSelectedMedId] = useState('');
  const [customMedName, setCustomMedName] = useState('');
  const [customMedActive, setCustomMedActive] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medFrequency, setMedFrequency] = useState('Cada 8 horas');
  const [medDuration, setMedDuration] = useState('7 días');
  const [medNotes, setMedNotes] = useState('');
  const [prescribedList, setPrescribedList] = useState<{ id: string; name: string; activeIngredient: string; dose: string; frequency: string; duration: string; notes: string }[]>([]);
  const [generalObservations, setGeneralObservations] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('Medicina de Emergencias');
  const [doctorSello, setDoctorSello] = useState(`M.S.P. Reg: 82410-DOSIA\nEmergenciólogo Hospital General`);
  const [signatureData, setSignatureData] = useState('');

  // Vademecum searchable
  const [vademecumSearch, setVademecumSearch] = useState('');
  const [newMedForm, setNewMedForm] = useState({
    name: '',
    activeIngredient: '',
    category: 'Analgésico',
    adultDose: '',
    pediatricDosePerKg: '',
    maxDailyDoseMg: 2000,
    maxDosePerKgMg: 50
  });

  // AI module state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Print/Preview prescription overlay state
  const [previewPrescription, setPreviewPrescription] = useState<Prescription | null>(null);

  // Template documents state
  const [docTemplateType, setDocTemplateType] = useState<'certificate' | 'lab_order' | 'reference'>('certificate');
  const [generatedDoc, setGeneratedDoc] = useState<TemplateDocument | null>(null);
  const [docNotes, setDocNotes] = useState('');

  // Load patient/prescription database from "SQLite" LocalStorage
  useEffect(() => {
    try {
      const storedPatients = localStorage.getItem('dosia_patients');
      const storedPrescriptions = localStorage.getItem('dosia_prescriptions');
      const storedMeds = localStorage.getItem('dosia_meds');
      const storedAudits = localStorage.getItem('dosia_audits');

      if (storedPatients) setPatients(JSON.parse(storedPatients));
      if (storedPrescriptions) setPrescriptions(JSON.parse(storedPrescriptions));
      if (storedMeds) setMedications(JSON.parse(storedMeds));
      if (storedAudits) setAuditLogs(JSON.parse(storedAudits));
    } catch (e) {
      console.error('Error loading data from local database:', e);
    }
  }, []);

  // Save to "SQLite" LocalStorage helper
  const saveToSQLite = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const addAuditLog = (action: string, details: string) => {
    const entry: AuditEntry = {
      timestamp: new Date().toLocaleString(),
      action,
      user: doctor.name,
      details
    };
    const updated = [entry, ...auditLogs];
    setAuditLogs(updated);
    saveToSQLite('dosia_audits', updated);
  };

  // Google Drive Backup Modal state
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveEmail, setDriveEmail] = useState('');
  const [drivePassword, setDrivePassword] = useState('');
  const [showDrivePassword, setShowDrivePassword] = useState(false);
  const [driveBackingUp, setDriveBackingUp] = useState(false);

  // Simulated Google Drive Backup
  const handleBackupDrive = () => {
    if (isOffline) {
      alert('Imposible respaldar: Se encuentra en modo Offline. Active la conexión Premium.');
      return;
    }
    setShowDriveModal(true);
  };

  const handleExecuteDriveBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      alert('Imposible respaldar: Se encuentra en modo Offline. Active la conexión Premium.');
      return;
    }

    if (!driveEmail.trim() || !drivePassword.trim()) {
      alert('Por favor ingrese el correo y la contraseña de su cuenta de Google Drive.');
      return;
    }

    setSyncing(true);
    setDriveBackingUp(true);
    addAuditLog('Respaldo Nube', `Copia de seguridad en Google Drive iniciada para la cuenta: ${driveEmail}`);
    
    setTimeout(() => {
      setSyncing(false);
      setDriveBackingUp(false);
      setShowDriveModal(false);
      alert(`Respaldo en la Nube de Google Drive realizado con éxito. Todos sus expedientes clínicos y firmas digitales están asegurados para el correo: ${driveEmail}.`);
      addAuditLog('Respaldo Exitoso', `Sincronización en la nube completada para la cuenta: ${driveEmail}`);
      // Clear password for security
      setDrivePassword('');
    }, 2000);
  };

  // Auto Calculations
  const bsa = calculateBSA(Number(patientWeight), Number(patientHeight));
  const imc = calculateIMC(Number(patientWeight), Number(patientHeight));
  const imcCat = getIMCCategory(imc);

  // Add tag chips helpers
  const addAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const addPreExisting = () => {
    if (preExistingInput.trim() && !preExistingConditions.includes(preExistingInput.trim())) {
      setPreExistingConditions([...preExistingConditions, preExistingInput.trim()]);
      setPreExistingInput('');
    }
  };

  // File Upload base64 reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAttachments([
          ...attachments,
          {
            name: file.name,
            type: attType === 'photo' ? 'Fotografía Clínica' : 'Estudio (Rayos X/Eco)',
            dataUrl: event.target.result as string
          }
        ]);
        addAuditLog('Adjunto Cargado', `Se adjuntó el archivo ${file.name} como ${attType}`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add prescription medication helper
  const handleAddMedication = () => {
    let medName = customMedName;
    let activeIng = customMedActive;

    if (selectedMedId) {
      const selected = medications.find(m => m.id === selectedMedId);
      if (selected) {
        medName = selected.name;
        activeIng = selected.activeIngredient;
      }
    }

    if (!medName || !medDose) {
      alert('Por favor, especifique el medicamento y la dosis.');
      return;
    }

    const newPrescriptionMed = {
      id: Math.random().toString(),
      name: medName,
      activeIngredient: activeIng,
      dose: medDose,
      frequency: medFrequency,
      duration: medDuration,
      notes: medNotes
    };

    setPrescribedList([...prescribedList, newPrescriptionMed]);
    
    // Reset specific med fields
    setSelectedMedId('');
    setCustomMedName('');
    setCustomMedActive('');
    setMedDose('');
    setMedNotes('');
  };

  // AI suggestion tool trigger
  const handleGetAiSuggestions = async () => {
    if (!diagnosis) {
      alert('Por favor, ingrese un diagnóstico o motivo de consulta para que la IA pueda proponer un esquema de tratamiento.');
      return;
    }
    setAiLoading(true);
    setAiResult(null);

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: patientAge || 30,
          weight: patientWeight || 70,
          height: patientHeight || 170,
          sex: patientSex,
          vitalSigns: {
            heartRate: Number(heartRate) || 80,
            bloodPressure: bloodPressure || '120/80',
            temperature: Number(temperature) || 36.8,
            respiratoryRate: Number(respiratoryRate) || 16,
            oxygenSaturation: Number(oxygenSaturation) || 98
          },
          diagnosis,
          allergies,
          preExistingConditions
        })
      });

      const data = await res.json();
      setAiResult(data);
      addAuditLog('Consulta IA', `Sugerencias del módulo de apoyo clínico generadas para ${diagnosis}`);
    } catch (e) {
      console.error(e);
      alert('Ocurrió un error en la conexión de IA, intentando de nuevo.');
    } finally {
      setAiLoading(false);
    }
  };

  // Create & Save complete prescription
  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName || !patientCardId) {
      alert('Por favor complete los datos obligatorios del paciente (Nombre y Cédula).');
      return;
    }

    if (prescribedList.length === 0) {
      alert('Agregue al menos un medicamento a la prescripción.');
      return;
    }

    if (!signatureData) {
      alert('Por favor firme digitalmente la receta antes de guardarla.');
      return;
    }

    const patientId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const prescriptionId = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

    const newPatient: Patient = {
      id: patientId,
      name: patientName,
      cardId: patientCardId,
      age: Number(patientAge) || 0,
      weight: Number(patientWeight) || 0,
      height: Number(patientHeight) || 0,
      sex: patientSex,
      allergies,
      preExistingConditions,
      vitalSigns: {
        heartRate: Number(heartRate) || 0,
        bloodPressure,
        temperature: Number(temperature) || 0,
        respiratoryRate: Number(respiratoryRate) || 0,
        oxygenSaturation: Number(oxygenSaturation) || 0
      },
      photos: attachments.filter(a => a.type === 'Fotografía Clínica').map(a => a.dataUrl),
      studies: attachments.filter(a => a.type !== 'Fotografía Clínica'),
      createdAt: new Date().toLocaleDateString()
    };

    const newPrescription: Prescription = {
      id: prescriptionId,
      patientId,
      patientName,
      patientCardId,
      patientAge: Number(patientAge) || 0,
      patientWeight: Number(patientWeight) || 0,
      patientHeight: Number(patientHeight) || 0,
      patientSex,
      date: new Date().toLocaleString(),
      medications: prescribedList,
      diagnosis,
      observations: generalObservations,
      signature: signatureData,
      qrCode: generatePrescriptionQR(prescriptionId),
      doctorName: doctor.name,
      doctorCédula: doctor.username,
      doctorSpecialty,
      doctorSello,
      auditLog: [
        {
          timestamp: new Date().toLocaleString(),
          action: 'Creación de Receta',
          user: doctor.name,
          details: `Prescripción ${prescriptionId} elaborada para paciente ${patientName}`
        }
      ]
    };

    // Update Local Databases (SQLite representation)
    const updatedPatients = [newPatient, ...patients];
    const updatedPrescriptions = [newPrescription, ...prescriptions];

    setPatients(updatedPatients);
    setPrescriptions(updatedPrescriptions);

    saveToSQLite('dosia_patients', updatedPatients);
    saveToSQLite('dosia_prescriptions', updatedPrescriptions);

    addAuditLog('Receta Guardada', `Se archivó la receta ${prescriptionId} de ${patientName} en SQLite.`);

    // Automatically trigger Print Preview
    setPreviewPrescription(newPrescription);

    // Reset prescription form
    setPatientName('');
    setPatientCardId('');
    setPatientAge('');
    setPatientWeight('');
    setPatientHeight('');
    setHeartRate('');
    setBloodPressure('');
    setTemperature('');
    setRespiratoryRate('');
    setOxygenSaturation('');
    setDiagnosis('');
    setAllergies([]);
    setPreExistingConditions([]);
    setPrescribedList([]);
    setGeneralObservations('');
    setAttachments([]);
    setAiResult(null);
  };

  // Add Medication to Vademecum
  const handleCreateVademecumMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedForm.name || !newMedForm.activeIngredient) {
      alert('Escriba el nombre y principio activo del medicamento.');
      return;
    }

    const newMed: Medication = {
      id: Math.random().toString(),
      name: newMedForm.name,
      activeIngredient: newMedForm.activeIngredient,
      category: newMedForm.category,
      adultDose: newMedForm.adultDose || 'Dosis según criterio clínico',
      pediatricDosePerKg: newMedForm.pediatricDosePerKg || 'No especificada',
      maxDailyDoseMg: newMedForm.maxDailyDoseMg,
      maxDosePerKgMg: newMedForm.maxDosePerKgMg,
      interactions: [],
      contraindications: []
    };

    const updatedMeds = [...medications, newMed];
    setMedications(updatedMeds);
    saveToSQLite('dosia_meds', updatedMeds);
    addAuditLog('Vademécum Actualizado', `Se agregó ${newMed.name} a la base de medicamentos.`);

    setNewMedForm({
      name: '',
      activeIngredient: '',
      category: 'Analgésico',
      adultDose: '',
      pediatricDosePerKg: '',
      maxDailyDoseMg: 2000,
      maxDosePerKgMg: 50
    });
    alert('Medicamento agregado con éxito.');
  };

  // Generate Medical Document templates
  const handleGenerateTemplateDoc = () => {
    if (!patientName || !patientCardId) {
      alert('Escriba el nombre y cédula del paciente para generar la plantilla de documento.');
      return;
    }

    let title = '';
    let content = '';

    if (docTemplateType === 'certificate') {
      title = 'Certificado Médico de Aptitud';
      content = `Por medio de la presente, certifico que he evaluado clínicamente al paciente ${patientName}, de Cédula de Identidad ${patientCardId}.\n\nAl momento de la evaluación, el paciente presenta Signos Vitales estables:\n- Presión Arterial: ${bloodPressure || '120/80'} mmHg\n- Frecuencia Cardíaca: ${heartRate || '75'} lpm\n- Temperatura: ${temperature || '36.5'} °C.\n\nDiagnóstico: ${diagnosis || 'Sano clínicamente'}.\n\nSe prescribe reposo de ${docNotes || '3 días'} por motivos de salud y recuperación terapéutica.\n\nSe firma en constancia a la fecha: ${new Date().toLocaleDateString()}.`;
    } else if (docTemplateType === 'lab_order') {
      title = 'Orden de Laboratorio Clínico';
      content = `Se solicita realizar al paciente ${patientName}, C.I: ${patientCardId}, los siguientes análisis de laboratorio urgente:\n\n1. Biometría Hemática Completa.\n2. Química Sanguínea (Glucosa, Urea, Creatinina).\n3. Electrolitos Séricos (Na, K, Cl).\n4. Examen General de Orina (EGO).\n5. Otros exámenes solicitados: ${docNotes || 'Perfil Lipídico, PCR ultra sensible'}.\n\nIndicaciones: Ayuno de 8 horas. Presentar resultados a consulta de seguimiento.`;
    } else {
      title = 'Referencia Médica de Interconsulta';
      content = `Se realiza derivación médica del paciente ${patientName}, C.I: ${patientCardId} al especialista de consulta externa.\n\nResumen Clínico:\nPaciente ingresa con cuadro agudo. Diagnóstico presuntivo de: ${diagnosis || 'A descartar patología mayor'}.\n\nTratamiento de emergencia instaurado: ${docNotes || 'Estabilización de signos vitales e hidratación endovenosa'}.\n\nMotivo de la transferencia: Evaluación especializada y manejo definitivo.`;
    }

    const doc: TemplateDocument = {
      id: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      type: docTemplateType,
      title,
      patientName,
      patientCardId,
      content,
      date: new Date().toLocaleDateString(),
      doctorName: doctor.name,
      doctorSello
    };

    setGeneratedDoc(doc);
    addAuditLog('Documento Generado', `Se generó plantilla de ${title} para ${patientName}`);
  };

  // WhatsApp share generator
  const handleShareWhatsApp = (presc: Prescription) => {
    const text = `*DOSIA - Prescripción Médica de Emergencia*
*Receta ID:* ${presc.id}
*Paciente:* ${presc.patientName} (Edad: ${presc.patientAge} años)
*Médico:* ${presc.doctorName} - ${presc.doctorSpecialty}

*Medicamentos Prescritos:*
${presc.medications.map((m, i) => `${i + 1}. ${m.name} (${m.activeIngredient}) - ${m.dose} / ${m.frequency} por ${m.duration}`).join('\n')}

*Observaciones:* ${presc.observations || 'Sin observaciones adicionales.'}
*Verificar Autenticidad QR:* ${window.location.origin}/verify/${presc.id}

App created by Andrey Design`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Clinic analytical calculations
  const totalConsultas = prescriptions.length;
  const popularDiagnosis = () => {
    if (prescriptions.length === 0) return 'Ninguno';
    const counts: { [key: string]: number } = {};
    prescriptions.forEach(p => {
      if (p.diagnosis) {
        counts[p.diagnosis] = (counts[p.diagnosis] || 0) + 1;
      }
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'Fiebre');
  };

  const topMedication = () => {
    if (prescriptions.length === 0) return 'Ninguno';
    const counts: { [key: string]: number } = {};
    prescriptions.forEach(p => {
      p.medications.forEach(m => {
        counts[m.name] = (counts[m.name] || 0) + 1;
      });
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'Paracetamol');
  };

  return (
    <div className="flex-1 bg-brand-dark min-h-screen flex flex-col font-sans">
      
      {/* Clinicial Header Area */}
      <header className="bg-brand-navy-light/70 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <DosiaAppIcon size="sm" className="animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <DosiaLogo size="md" />
              <span className="text-[10px] bg-brand-teal/20 text-brand-teal border border-brand-teal/40 px-1.5 py-0.5 rounded font-mono font-semibold">PREMIUM CLINIC</span>
            </div>
            <p className="text-xs text-slate-400">Consultorio de {doctor.name}</p>
          </div>
        </div>

        {/* Global toggles and sync actions */}
        <div className="flex items-center flex-wrap gap-3">
          
          {/* Offline/Online simulation button */}
          <button
            onClick={() => {
              setIsOffline(!isOffline);
              addAuditLog('Cambio Red', `Modo de red cambiado a ${!isOffline ? 'Offline (SQLite)' : 'Online (Premium Cloud)'}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isOffline
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
            title="Presione para alternar modo sin conexión (SQLite local)"
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Modo Offline (SQLite)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Modo Online (Premium)</span>
              </>
            )}
          </button>

          {/* Drive sync backup */}
          <button
            onClick={handleBackupDrive}
            disabled={syncing}
            className="bg-brand-navy-light hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-55"
          >
            <CloudLightning className={`w-3.5 h-3.5 text-brand-teal ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Respaldar Drive'}</span>
          </button>

          <button
            onClick={onLogout}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Primary Sub-Navigation Row */}
      <div className="bg-brand-navy-light/30 border-b border-slate-800/80 px-6 py-2 flex overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('prescribe')}
          className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'prescribe'
              ? 'bg-brand-teal text-slate-900 shadow-md shadow-brand-teal/10'
              : 'text-slate-400 hover:bg-brand-navy-light/50 hover:text-white'
          }`}
        >
          📝 Prescribir Receta
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'bg-brand-teal text-slate-900 shadow-md shadow-brand-teal/10'
              : 'text-slate-400 hover:bg-brand-navy-light/50 hover:text-white'
          }`}
        >
          📂 Historial SQLite ({patients.length})
        </button>
        <button
          onClick={() => setActiveTab('vademecum')}
          className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'vademecum'
              ? 'bg-brand-teal text-slate-900 shadow-md shadow-brand-teal/10'
              : 'text-slate-400 hover:bg-brand-navy-light/50 hover:text-white'
          }`}
        >
          💊 Vademécum ({medications.length})
        </button>
        <button
          onClick={() => setActiveTab('protocols')}
          className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'protocols'
              ? 'bg-brand-teal text-slate-900 shadow-md shadow-brand-teal/10'
              : 'text-slate-400 hover:bg-brand-navy-light/50 hover:text-white'
          }`}
        >
          🚨 Protocolos Emergencia
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-brand-teal text-slate-900 shadow-md shadow-brand-teal/10'
              : 'text-slate-400 hover:bg-brand-navy-light/50 hover:text-white'
          }`}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* Main Container Content */}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
        
        {/* TAB 1: PRESCRIBE NEW PATIENT */}
        {activeTab === 'prescribe' && (
          <form 
            onSubmit={handleSavePrescription} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                e.preventDefault();
                const targetInput = e.target as HTMLInputElement;
                if (targetInput.placeholder && targetInput.placeholder.includes('Penicilina')) {
                  addAllergy();
                } else if (targetInput.placeholder && targetInput.placeholder.includes('HTA')) {
                  addPreExisting();
                }
              }
            }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            
            {/* Left Column: Patient profiling and calculations */}
            <div className="space-y-6 lg:col-span-2">
              
              {/* Patient Core Information Card */}
              <div className="bg-brand-navy-light/30 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                  <User className="w-5 h-5 text-brand-teal" />
                  <h3 className="text-lg font-bold font-display text-white">Perfil del Paciente Activo</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Nombre Completo *</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Ej. María Josefa Gómez"
                      className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-brand-teal text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Cédula de Identidad *</label>
                    <input
                      type="text"
                      value={patientCardId}
                      onChange={(e) => setPatientCardId(e.target.value)}
                      placeholder="Ej. 172635418"
                      className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Edad (Años)</label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Años"
                      min="0"
                      className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Peso (kg)</label>
                    <input
                      type="number"
                      value={patientWeight}
                      onChange={(e) => setPatientWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 65"
                      min="0"
                      step="0.1"
                      className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Talla (cm)</label>
                    <input
                      type="number"
                      value={patientHeight}
                      onChange={(e) => setPatientHeight(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 165"
                      min="0"
                      className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Sexo Biológico</label>
                    <div className="flex bg-brand-navy-light p-1 rounded-lg border border-slate-700 gap-1">
                      <button
                        type="button"
                        onClick={() => setPatientSex('M')}
                        className={`flex-1 py-1 text-xs font-bold rounded transition-all cursor-pointer ${patientSex === 'M' ? 'bg-brand-teal text-slate-900' : 'text-slate-400'}`}
                      >
                        Masculino
                      </button>
                      <button
                        type="button"
                        onClick={() => setPatientSex('F')}
                        className={`flex-1 py-1 text-xs font-bold rounded transition-all cursor-pointer ${patientSex === 'F' ? 'bg-brand-teal text-slate-900' : 'text-slate-400'}`}
                      >
                        Femenino
                      </button>
                    </div>
                  </div>

                  {/* Automatic physical calculations readout */}
                  <div className="sm:col-span-2 bg-brand-navy-light/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-around">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block uppercase">Superficie Corporal (BSA)</span>
                      <span className="text-lg font-bold font-mono text-brand-teal-pastel">{bsa > 0 ? `${bsa.toFixed(2)} m²` : '---'}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800" />
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block uppercase">IMC / BMI</span>
                      <span className="text-lg font-bold font-mono text-white">{imc > 0 ? `${imc.toFixed(1)}` : '---'}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800" />
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block uppercase">Clasificación Peso</span>
                      <span className={`text-xs font-extrabold ${imcCat.color}`}>{imc > 0 ? imcCat.label : '---'}</span>
                    </div>
                  </div>
                </div>

                {/* Vital Signs Form */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-brand-teal-pastel" />
                    <h4 className="text-sm font-bold text-slate-300">Signos Vitales del Paciente</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Frec. Cardíaca (lpm)</span>
                      <input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej. 80"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full font-mono text-white focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Presión Art. (mmHg)</span>
                      <input
                        type="text"
                        value={bloodPressure}
                        onChange={(e) => setBloodPressure(e.target.value)}
                        placeholder="Ej. 120/80"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full font-mono text-white focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Temperatura (°C)</span>
                      <input
                        type="number"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej. 37"
                        step="0.1"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full font-mono text-white focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Frec. Resp. (rpm)</span>
                      <input
                        type="number"
                        value={respiratoryRate}
                        onChange={(e) => setRespiratoryRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej. 18"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full font-mono text-white focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Saturación O₂ (%)</span>
                      <input
                        type="number"
                        value={oxygenSaturation}
                        onChange={(e) => setOxygenSaturation(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej. 98"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full font-mono text-white focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                  </div>
                </div>

                {/* Diagnosis and clinical details */}
                <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Diagnóstico / Motivo de Consulta *</label>
                    <textarea
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Ej. Crisis asmática desencadenada por infección respiratoria alta, sibilancias bilaterales..."
                      className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-xs w-full h-20 focus:outline-none focus:border-brand-teal text-white leading-relaxed"
                      required
                    />
                  </div>

                  {/* Allergies and pre-existing tags */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Alergias Conocidas</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={allergyInput}
                          onChange={(e) => setAllergyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addAllergy();
                            }
                          }}
                          placeholder="Ej. Penicilina"
                          className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1 text-xs flex-1 text-white focus:outline-none focus:border-brand-teal"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            addAllergy();
                          }}
                          className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {allergies.map((all, idx) => (
                          <span key={idx} className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            {all}
                            <button type="button" onClick={() => setAllergies(allergies.filter(a => a !== all))} className="text-rose-400 hover:text-white font-bold ml-1 font-mono">×</button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Enfermedades Preexistentes</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={preExistingInput}
                          onChange={(e) => setPreExistingInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addPreExisting();
                            }
                          }}
                          placeholder="Ej. Asma bronquial, HTA"
                          className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1 text-xs flex-1 text-white focus:outline-none focus:border-brand-teal"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            addPreExisting();
                          }}
                          className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {preExistingConditions.map((cond, idx) => (
                          <span key={idx} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            {cond}
                            <button type="button" onClick={() => setPreExistingConditions(preExistingConditions.filter(c => c !== cond))} className="text-amber-400 hover:text-white font-bold ml-1 font-mono">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attach Clinical Photos & Studies */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-brand-teal" /> Adjuntar Expediente Auxiliar (Fotografías / Radiografías)
                    </span>
                    <div className="flex p-0.5 bg-brand-navy-light border border-slate-700 rounded-md gap-0.5">
                      <button
                        type="button"
                        onClick={() => setAttType('photo')}
                        className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase transition-all cursor-pointer ${attType === 'photo' ? 'bg-brand-teal text-slate-900' : 'text-slate-400'}`}
                      >
                        Foto Clínica
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttType('study')}
                        className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase transition-all cursor-pointer ${attType === 'study' ? 'bg-brand-teal text-slate-900' : 'text-slate-400'}`}
                      >
                        Radiografía / Eco
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative border-2 border-dashed border-slate-700 hover:border-brand-teal/50 rounded-xl p-4 flex flex-col items-center justify-center transition-colors bg-brand-navy-light/10">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <ImageIcon className="w-8 h-8 text-slate-500 mb-1" />
                      <span className="text-xs text-slate-400 font-medium">Click o Arrastre su archivo aquí</span>
                      <span className="text-[10px] text-slate-500">Formato JPG, PNG (Simulación de Captura)</span>
                    </div>

                    {/* Renders uploaded files inline */}
                    <div className="flex flex-wrap gap-2 content-start bg-brand-navy-light/20 p-2.5 rounded-xl border border-slate-800/80 min-h-[90px]">
                      {attachments.length === 0 ? (
                        <div className="text-slate-600 text-[10px] italic flex items-center justify-center w-full h-full">
                          Ningún archivo clínico adjunto para esta receta.
                        </div>
                      ) : (
                        attachments.map((att, index) => (
                          <div key={index} className="bg-brand-navy-light p-1.5 rounded-lg border border-slate-700 flex items-center gap-2 max-w-[200px] text-left">
                            <img src={att.dataUrl} alt="clinical" className="w-8 h-8 rounded object-cover" />
                            <div className="overflow-hidden">
                              <div className="text-[10px] text-white font-bold truncate">{att.name}</div>
                              <div className="text-[8px] text-brand-teal-pastel">{att.type}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                              className="text-rose-400 hover:text-rose-300 font-bold text-xs shrink-0 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Prescribed Medications active list card */}
              <div className="bg-brand-navy-light/30 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-brand-teal" />
                    <h3 className="text-lg font-bold font-display text-white">Estructura de Fórmulas de la Prescripción</h3>
                  </div>
                  {prescribedList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPrescribedList([])}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Vaciar Lista
                    </button>
                  )}
                </div>

                {/* Add new medication to this prescription block */}
                <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-4 mb-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Drug selector (Vademecum or custom) */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Medicamento Vademécum</label>
                      <select
                        value={selectedMedId}
                        onChange={(e) => {
                          setSelectedMedId(e.target.value);
                          if (e.target.value) {
                            const found = medications.find(m => m.id === e.target.value);
                            if (found) {
                              setCustomMedName(found.name);
                              setCustomMedActive(found.activeIngredient);
                              
                              // Trigger auto pediatric calculation if child
                              if (patientWeight && Number(patientAge) < 12) {
                                const calculated = calculateDoseByWeight(found, Number(patientWeight), Number(patientAge));
                                setMedDose(calculated.recommendedDoseText.replace('Rango sugerido: ', ''));
                              } else {
                                setMedDose(found.adultDose.split(' cada')[0]);
                              }
                            }
                          } else {
                            setCustomMedName('');
                            setCustomMedActive('');
                            setMedDose('');
                          }
                        }}
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full text-slate-200 focus:outline-none focus:border-brand-teal"
                      >
                        <option value="">-- Personalizado / Buscar --</option>
                        {medications.map(med => (
                          <option key={med.id} value={med.id}>{med.name}</option>
                        ))}
                      </select>
                    </div>

                    {!selectedMedId && (
                      <>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Fórmula Personalizada</label>
                          <input
                            type="text"
                            value={customMedName}
                            onChange={(e) => setCustomMedName(e.target.value)}
                            placeholder="Nombre comercial"
                            className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Principio Activo</label>
                          <input
                            type="text"
                            value={customMedActive}
                            onChange={(e) => setCustomMedActive(e.target.value)}
                            placeholder="Ej. Paracetamol"
                            className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                          />
                        </div>
                      </>
                    )}

                    {selectedMedId && (
                      <div className="sm:col-span-2 bg-brand-navy-light border border-slate-700 rounded-lg p-2.5 text-xs leading-normal">
                        <span className="text-[10px] text-slate-400 block mb-0.5">VADEMÉCUM INFO DOSIFICACIÓN:</span>
                        <div className="text-brand-teal-pastel font-medium">Pediatría: {medications.find(m => m.id === selectedMedId)?.pediatricDosePerKg}</div>
                        <div className="text-slate-300">Adultos: {medications.find(m => m.id === selectedMedId)?.adultDose}</div>
                      </div>
                    )}
                  </div>

                  {/* Calculations warnings and Dose inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Dosis Prescrita *</label>
                      <input
                        type="text"
                        value={medDose}
                        onChange={(e) => setMedDose(e.target.value)}
                        placeholder="Ej. 250 mg"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-white focus:outline-none focus:border-brand-teal font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Frecuencia</label>
                      <select
                        value={medFrequency}
                        onChange={(e) => setMedFrequency(e.target.value)}
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-slate-200 focus:outline-none"
                      >
                        <option value="Cada 4 horas">Cada 4 horas</option>
                        <option value="Cada 6 horas">Cada 6 horas</option>
                        <option value="Cada 8 horas">Cada 8 horas</option>
                        <option value="Cada 12 horas">Cada 12 horas</option>
                        <option value="Cada 24 horas">Cada 24 horas</option>
                        <option value="Dosis única de rescate">Dosis única de rescate</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Duración</label>
                      <input
                        type="text"
                        value={medDuration}
                        onChange={(e) => setMedDuration(e.target.value)}
                        placeholder="Ej. 5 días"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Indicaciones / Notas</label>
                      <input
                        type="text"
                        value={medNotes}
                        onChange={(e) => setMedNotes(e.target.value)}
                        placeholder="Ej. Disolver en agua"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Safety checks indicators */}
                  {selectedMedId && patientWeight && (
                    (() => {
                      const selected = medications.find(m => m.id === selectedMedId)!;
                      const check = calculateDoseByWeight(selected, Number(patientWeight), Number(patientAge) || 30);
                      
                      return (
                        <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${check.hasOverdose ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' : 'bg-brand-teal/5 border border-brand-teal/20 text-brand-teal-pastel'}`}>
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Calculador Automático DOSIA (Peso: {patientWeight} kg):</span>
                            <span>{check.recommendedDoseText}</span>
                            {check.maxDoseLimitAlert && (
                              <span className="block font-bold mt-1 text-rose-500 uppercase tracking-wide text-[10px]">
                                🚨 {check.maxDoseLimitAlert}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      + Agregar a Receta
                    </button>
                  </div>
                </div>

                {/* List table of prescribed medications */}
                <div className="overflow-x-auto">
                  {prescribedList.length === 0 ? (
                    <div className="text-slate-500 text-xs py-8 text-center italic">
                      No hay fármacos agregados a esta receta todavía. Use la caja superior para agregar.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs divide-y divide-slate-800">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-wider font-semibold text-[10px] pb-2">
                          <th className="py-2">Medicamento</th>
                          <th className="py-2">Principio Activo</th>
                          <th className="py-2">Dosis / Frecuencia</th>
                          <th className="py-2">Duración</th>
                          <th className="py-2 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {prescribedList.map((med, idx) => (
                          <tr key={med.id} className="hover:bg-brand-navy-light/10">
                            <td className="py-2.5 font-bold text-white text-sm">{med.name}</td>
                            <td className="py-2.5 text-slate-400 italic">{med.activeIngredient}</td>
                            <td className="py-2.5 font-mono text-xs">
                              <div className="text-brand-teal-pastel font-bold">{med.dose}</div>
                              <div className="text-slate-400 text-[10px]">{med.frequency}</div>
                            </td>
                            <td className="py-2.5 text-slate-300">{med.duration}</td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => setPrescribedList(prescribedList.filter(m => m.id !== med.id))}
                                className="text-rose-400 hover:text-rose-300 transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* General observations area */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase">Indicaciones Adicionales / Cuidados Generales</label>
                  <input
                    type="text"
                    value={generalObservations}
                    onChange={(e) => setGeneralObservations(e.target.value)}
                    placeholder="Ej. Dieta líquida por 24 horas, control de temperatura, acudir por emergencia ante datos de alarma..."
                    className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              {/* Template Documents Fast Generator Block */}
              <div className="bg-brand-navy-light/30 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-teal" />
                    <h3 className="text-lg font-bold font-display text-white">Plantillas de Certificados y Órdenes</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Tipo de Documento</label>
                      <select
                        value={docTemplateType}
                        onChange={(e) => setDocTemplateType(e.target.value as any)}
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full text-slate-200 focus:outline-none focus:border-brand-teal"
                      >
                        <option value="certificate">Certificado Médico</option>
                        <option value="lab_order">Orden de Laboratorio</option>
                        <option value="reference">Referencia Médica</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Notas del Documento</label>
                      <input
                        type="text"
                        value={docNotes}
                        onChange={(e) => setDocNotes(e.target.value)}
                        placeholder="Ej. Reposo por 5 días / Pruebas lipídicas"
                        className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateTemplateDoc}
                      className="w-full bg-brand-navy-light hover:bg-slate-800 border border-brand-teal/30 hover:border-brand-teal/50 text-brand-teal-pastel font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Generar Documento
                    </button>
                  </div>

                  {/* Render generated clinical document template */}
                  <div className="md:col-span-2 bg-brand-navy-light/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    {generatedDoc ? (
                      <div className="flex-1 flex flex-col justify-between text-left">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-2">
                            <span className="font-bold text-brand-teal-pastel font-display text-sm uppercase">{generatedDoc.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{generatedDoc.id}</span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
                            {generatedDoc.content}
                          </p>
                        </div>
                        
                        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[9px] text-slate-500">Fecha: {generatedDoc.date}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const printWindow = window.open('', '_blank');
                              if (printWindow) {
                                printWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>${generatedDoc.title}</title>
                                      <style>
                                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                                        .title { font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
                                        .content { font-size: 14px; white-space: pre-wrap; margin-bottom: 50px; }
                                        .footer { margin-top: 50px; text-align: center; font-size: 12px; }
                                        .seal { border-top: 1px solid #ccc; width: 250px; margin: 0 auto; padding-top: 10px; }
                                      </style>
                                    </head>
                                    <body>
                                      <div class="header">
                                        <div class="title">${generatedDoc.title}</div>
                                        <div>Servicio Médico Premium - DOSIA App</div>
                                      </div>
                                      <div class="content">${generatedDoc.content}</div>
                                      <div class="footer">
                                        <div class="seal">
                                          <strong>${generatedDoc.doctorName}</strong><br/>
                                          ${doctorSello.replace('\n', '<br/>')}
                                        </div>
                                      </div>
                                      <script>window.print();</script>
                                    </body>
                                  </html>
                                `);
                                printWindow.document.close();
                              }
                            }}
                            className="text-[10px] text-brand-teal hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Printer className="w-3 h-3" /> Imprimir Documento
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-xs italic gap-1 select-none">
                        <FileCheck className="w-8 h-8 text-slate-700" />
                        <span>Presione generar para formatear certificado u orden médica</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: AI Suggestions and Prescribe settings */}
            <div className="space-y-6">
              
              {/* AI Clinical Assistant Card */}
              <div className="bg-gradient-to-br from-brand-navy-light/40 to-brand-teal/5 border border-brand-teal/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-teal animate-pulse" />
                    <h3 className="text-lg font-bold font-display text-white">DOSIA Asistente IA</h3>
                  </div>
                  <span className="text-[10px] bg-brand-teal/20 text-brand-teal border border-brand-teal/40 px-1.5 py-0.5 rounded font-mono font-semibold">GEMINI 3.5</span>
                </div>

                <p className="text-xs text-slate-400 mb-4 leading-normal">
                  Sugerencias automatizadas de fármacos, dosis ajustadas y alertas de interacciones medicamento basadas en el paciente.
                </p>

                <button
                  type="button"
                  onClick={handleGetAiSuggestions}
                  disabled={aiLoading}
                  className="w-full bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-3 px-4 rounded-xl shadow-lg shadow-brand-teal/10 hover:shadow-brand-teal/20 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analizando Expediente Clínico...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-slate-900" />
                      <span>Sugerir Esquema por IA</span>
                    </>
                  )}
                </button>

                {/* AI suggestion output box */}
                {aiResult && (
                  <div className="mt-4 p-4 bg-brand-navy-light/80 border border-slate-800 rounded-xl space-y-3 max-h-[300px] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 text-[10px] text-slate-400">
                      <span>IMC: {aiResult.calculatedIMC} ({aiResult.imcCategory})</span>
                      <span>BSA: {aiResult.calculatedBSA} m²</span>
                    </div>

                    {/* AI Alerts */}
                    {aiResult.alerts && aiResult.alerts.length > 0 && (
                      <div className="space-y-1 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg text-[11px] text-rose-400">
                        <span className="font-bold flex items-center gap-1 uppercase text-[9px]"><AlertTriangle className="w-3.5 h-3.5" /> ALERTAS:</span>
                        <ul className="list-disc list-inside">
                          {aiResult.alerts.map((al: string, idx: number) => <li key={idx}>{al}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* AI Drug recommendations */}
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-brand-teal-pastel block uppercase tracking-wide">Fármacos Sugeridos:</span>
                      {aiResult.suggestedDrugs?.map((drug: any, idx: number) => (
                        <div key={idx} className="bg-brand-dark/50 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
                          <div className="flex justify-between font-bold text-white text-xs">
                            <span>{drug.name}</span>
                            <span className="text-brand-teal font-mono">{drug.doseCalculated}</span>
                          </div>
                          <div className="text-slate-400">Principio Activo: {drug.activeIngredient}</div>
                          <div className="text-slate-400">{drug.frequency} | Duración: {drug.duration}</div>
                          <div className="text-[10px] text-slate-500 leading-normal bg-brand-navy-light p-1 rounded italic">{drug.purpose}</div>
                          <div className="text-[10px] text-emerald-400">{drug.maxLimitsCheck}</div>
                          
                          {/* Quick Add Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const newPresc = {
                                id: Math.random().toString(),
                                name: drug.name,
                                activeIngredient: drug.activeIngredient,
                                dose: drug.doseCalculated,
                                frequency: drug.frequency,
                                duration: drug.duration,
                                notes: drug.purpose
                              };
                              setPrescribedList([...prescribedList, newPresc]);
                              addAuditLog('Receta IA Carga', `Se agregó ${drug.name} sugerido por IA a la receta`);
                            }}
                            className="text-[9px] text-brand-teal hover:underline font-semibold flex items-center gap-0.5 mt-1"
                          >
                            <Plus className="w-3 h-3" /> Añadir esta sugerencia a la receta
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* AI Advice */}
                    <div className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800 pt-2 space-y-1">
                      <span className="font-bold text-xs text-brand-teal-pastel block uppercase tracking-wide">Consejo Clínico Emergencia:</span>
                      <p>{aiResult.clinicalAdvice}</p>
                    </div>

                    <div className="text-[8px] text-slate-500 italic mt-2 text-center border-t border-slate-800 pt-1">
                      {aiResult.disclaimer}
                    </div>
                  </div>
                )}
              </div>

              {/* Digital signature and Seal Settings Card */}
              <div className="bg-brand-navy-light/30 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                  <Award className="w-5 h-5 text-brand-teal" />
                  <h3 className="text-lg font-bold font-display text-white">Firma Médica y Personalización</h3>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Especialidad del Médico</label>
                  <input
                    type="text"
                    value={doctorSpecialty}
                    onChange={(e) => setDoctorSpecialty(e.target.value)}
                    placeholder="Ej. Medicina de Emergencias"
                    className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Datos del Sello (Sello Médico)</label>
                  <textarea
                    value={doctorSello}
                    onChange={(e) => setDoctorSello(e.target.value)}
                    placeholder="Ej. MSP Reg: 8214-G, Emergenciólogo"
                    className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full h-16 focus:outline-none focus:border-brand-teal text-slate-200 leading-normal"
                  />
                </div>

                {/* Digital Signature Drawing Canvas */}
                <SignaturePad
                  onSave={(dataUrl) => setSignatureData(dataUrl)}
                  initialValue={signatureData}
                />

                {/* Submit save button */}
                <button
                  type="submit"
                  className="w-full bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-brand-teal/20 transition-all text-xs flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 stroke-[2.5px]" /> Guardar y Archivar Receta
                </button>
              </div>

            </div>

          </form>
        )}

        {/* TAB 2: PATIENT HISTORY (Local SQLite representation) */}
        {activeTab === 'history' && (
          <div className="bg-brand-navy-light/30 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-teal" /> Historial Clínico Local (SQLite Seguro)
                </h3>
                <p className="text-xs text-slate-400">Ledger de consultas y prescripciones archivadas localmente con cifrado simulado</p>
              </div>

              {/* Patient fast Search */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Buscar paciente por nombre o cédula..."
                  onChange={(e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = patients.filter(p => p.name.toLowerCase().includes(term) || p.cardId.includes(term));
                    // We can display list filtering live
                  }}
                  className="bg-brand-navy-light border border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-xs w-full text-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {prescriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-2">
                <Clipboard className="w-12 h-12 text-slate-700" />
                <span>No se han emitido recetas médicas todavía en este dispositivo.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {prescriptions.map((presc) => (
                  <div key={presc.id} className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 hover:border-brand-teal/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-3">
                        <div>
                          <span className="font-bold text-white text-base block font-display">{presc.patientName}</span>
                          <span className="text-[10px] text-slate-400">C.I: {presc.patientCardId} • Edad: {presc.patientAge} años</span>
                        </div>
                        <span className="font-mono text-xs font-bold bg-brand-teal/15 text-brand-teal-pastel border border-brand-teal/30 px-2 py-0.5 rounded">
                          {presc.id}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4 text-xs text-left">
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider text-[9px] block">Diagnóstico</span>
                          <span className="text-slate-200 font-medium">{presc.diagnosis}</span>
                        </div>
                        
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider text-[9px] block">Tratamiento Indicado</span>
                          <div className="space-y-1 mt-1">
                            {presc.medications.map((med, idx) => (
                              <div key={idx} className="bg-brand-navy-light border border-slate-800/80 p-2 rounded text-[11px] flex justify-between font-mono">
                                <span className="text-slate-300 font-bold">{med.name} ({med.activeIngredient})</span>
                                <span className="text-brand-teal-pastel">{med.dose} - {med.frequency}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {presc.observations && (
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[9px] block">Observaciones</span>
                            <span className="text-slate-300 italic">{presc.observations}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 mt-2 text-xs">
                      <span className="text-[10px] text-slate-500 font-mono">{presc.date}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewPrescription(presc)}
                          className="bg-brand-teal/20 hover:bg-brand-teal/35 border border-brand-teal/40 text-brand-teal text-[10px] font-bold px-2.5 py-1.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> PDF / Receta
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(presc)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Compartir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VADEMECUM (Drug database editor) */}
        {activeTab === 'vademecum' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Add custom medication form */}
            <div className="bg-brand-navy-light/30 border border-slate-800 rounded-2xl p-6 h-fit">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                <Plus className="w-5 h-5 text-brand-teal" />
                <h3 className="text-lg font-bold font-display text-white">Agregar al Vademécum</h3>
              </div>

              <form onSubmit={handleCreateVademecumMed} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    value={newMedForm.name}
                    onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                    placeholder="Ej. Tempra Jarabe"
                    className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Principio Activo *</label>
                  <input
                    type="text"
                    value={newMedForm.activeIngredient}
                    onChange={(e) => setNewMedForm({ ...newMedForm, activeIngredient: e.target.value })}
                    placeholder="Ej. Acetaminofén"
                    className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Categoría Farmacológica</label>
                  <select
                    value={newMedForm.category}
                    onChange={(e) => setNewMedForm({ ...newMedForm, category: e.target.value })}
                    className="bg-brand-navy-light border border-slate-700 rounded-lg px-2 py-1.5 text-xs w-full text-slate-200 focus:outline-none"
                  >
                    <option value="Analgésico / Antipirético">Analgésico / Antipirético</option>
                    <option value="Antiinflamatorio (AINE)">Antiinflamatorio (AINE)</option>
                    <option value="Antibiótico">Antibiótico</option>
                    <option value="Antiemético">Antiemético</option>
                    <option value="Antihistamínico">Antihistamínico</option>
                    <option value="Broncodilatador">Broncodilatador</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Dosis Adultos Estándar</label>
                  <input
                    type="text"
                    value={newMedForm.adultDose}
                    onChange={(e) => setNewMedForm({ ...newMedForm, adultDose: e.target.value })}
                    placeholder="Ej. 500 mg cada 8 horas"
                    className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Dosis Pediatría por Peso (mg/kg)</label>
                  <input
                    type="text"
                    value={newMedForm.pediatricDosePerKg}
                    onChange={(e) => setNewMedForm({ ...newMedForm, pediatricDosePerKg: e.target.value })}
                    placeholder="Ej. 10-15 mg/kg por dosis"
                    className="bg-brand-navy-light border border-slate-700 rounded-lg px-3 py-2 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Máx Diario (mg)</label>
                    <input
                      type="number"
                      value={newMedForm.maxDailyDoseMg}
                      onChange={(e) => setNewMedForm({ ...newMedForm, maxDailyDoseMg: Number(e.target.value) })}
                      placeholder="4000"
                      className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Máx mg/kg</label>
                    <input
                      type="number"
                      value={newMedForm.maxDosePerKgMg}
                      onChange={(e) => setNewMedForm({ ...newMedForm, maxDosePerKgMg: Number(e.target.value) })}
                      placeholder="75"
                      className="bg-brand-navy-light border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs w-full text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-2 px-4 rounded-lg shadow transition-colors text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" /> Registrar Medicamento
                </button>
              </form>
            </div>

            {/* List and search Vademecum */}
            <div className="bg-brand-navy-light/30 border border-slate-800 rounded-2xl p-6 lg:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 mb-5 gap-4">
                <div>
                  <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-brand-teal" /> Vademécum Clínico DOSIA
                  </h3>
                  <p className="text-xs text-slate-400">Buscador instantáneo por nombre comercial o principio activo</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={vademecumSearch}
                    onChange={(e) => setVademecumSearch(e.target.value)}
                    placeholder="Buscar fármaco o principio..."
                    className="bg-brand-navy-light border border-slate-700 rounded-lg pl-9 pr-3.5 py-1.5 text-xs w-full text-white focus:outline-none focus:border-brand-teal"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Grid of Vademecum drugs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {medications
                  .filter(m => m.name.toLowerCase().includes(vademecumSearch.toLowerCase()) || m.activeIngredient.toLowerCase().includes(vademecumSearch.toLowerCase()))
                  .map(med => (
                    <div key={med.id} className="bg-brand-navy-light/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between text-left hover:border-brand-teal/20 transition-all">
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <div>
                            <span className="font-bold text-white text-sm block">{med.name}</span>
                            <span className="text-[10px] text-brand-teal-pastel font-mono font-semibold">{med.category}</span>
                          </div>
                          <span className="text-[9px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-400 font-mono">ID: {med.id}</span>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-slate-300">
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[8px] block">Principio Activo:</span>
                            <span className="italic">{med.activeIngredient}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[8px] block">Dosis Adulto:</span>
                            <span>{med.adultDose}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[8px] block">Dosis Pediatría por Peso:</span>
                            <span>{med.pediatricDosePerKg}</span>
                          </div>
                        </div>

                        {med.interactions.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-800/55">
                            <span className="text-rose-400 font-bold text-[8px] uppercase block mb-1">Interacciones de Riesgo:</span>
                            {med.interactions.map((int, i) => (
                              <div key={i} className="text-[9px] text-slate-400 leading-normal flex items-start gap-1">
                                <span className="text-rose-400 font-bold">• {int.drugName} ({int.severity}):</span>
                                <span>{int.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/40 flex justify-end">
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar ${med.name} del vademécum local?`)) {
                              const updated = medications.filter(m => m.id !== med.id);
                              setMedications(updated);
                              saveToSQLite('dosia_meds', updated);
                              addAuditLog('Fármaco Eliminado', `Se retiró ${med.name} de la base de datos.`);
                            }
                          }}
                          className="text-[10px] text-rose-400 hover:underline hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          Eliminar de Vademécum
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: CRISIS/EMERGENCY PROTOCOLS */}
        {activeTab === 'protocols' && (
          <div className="bg-brand-navy-light/30 border border-slate-800 rounded-2xl p-6">
            <div className="border-b border-slate-800 pb-4 mb-6">
              <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-brand-teal animate-pulse" /> Protocolos de Actuación Médica en Emergencia
              </h3>
              <p className="text-xs text-slate-400">Guías de soporte vital avanzado rápidas para pediatría y medicina de adultos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              {INITIAL_PROTOCOLS.map((protocol) => (
                <div key={protocol.id} className="bg-brand-navy-light/40 border border-slate-800 rounded-2xl p-5 hover:border-brand-teal/20 transition-all">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-lg font-bold font-display text-white">{protocol.title}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                      protocol.category === 'pediatric'
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {protocol.category === 'pediatric' ? 'PEDIÁTRICO' : 'ADULTO'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 leading-normal">{protocol.description}</p>

                  <div className="space-y-4">
                    
                    {/* Steps checklist */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal block mb-1.5">Secuencia de Actuación:</span>
                      <ol className="space-y-1.5 text-xs text-slate-200">
                        {protocol.steps.map((step, idx) => (
                          <li key={idx} className="flex gap-2 items-start leading-normal">
                            <span className="bg-slate-800 text-slate-300 font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Crisis Drugs table */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal block mb-1.5">Fármacos Críticos y Rescate:</span>
                      <div className="bg-brand-dark/50 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                        {protocol.medications.map((m, idx) => (
                          <div key={idx} className="p-2.5 flex justify-between items-center gap-2 text-xs">
                            <div>
                              <span className="font-bold text-white block">{m.name}</span>
                              <span className="text-[10px] text-slate-500">{m.indication}</span>
                            </div>
                            <span className="bg-brand-teal/15 text-brand-teal-pastel px-2 py-0.5 rounded font-mono font-bold text-[11px] shrink-0">{m.dosage}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CLINIC ANALYTICS & STATS */}
        {activeTab === 'stats' && (
          <div className="bg-brand-navy-light/30 border border-slate-800 rounded-2xl p-6">
            <div className="border-b border-slate-800 pb-4 mb-6 text-left">
              <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-teal" /> Estadísticas Generales del Consultorio
              </h3>
              <p className="text-xs text-slate-400">Análisis clínicos en tiempo real de pacientes y fármacos de DOSIA</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
              <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total de Prescripciones</span>
                <span className="text-4xl font-extrabold font-mono text-brand-teal-pastel">{totalConsultas}</span>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">SQLite Local Record Count</p>
              </div>

              <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Diagnóstico Más Común</span>
                <span className="text-xl font-bold text-white block truncate mt-1">{popularDiagnosis()}</span>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">Sujeto a actualización clínica</p>
              </div>

              <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Fármaco Más Prescrito</span>
                <span className="text-xl font-bold text-emerald-400 block truncate mt-1">{topMedication()}</span>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">Control de vademécum de emergencias</p>
              </div>
            </div>

            {/* Audit Logs Ledger */}
            <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 text-left">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
                <span className="font-bold text-base text-white flex items-center gap-1.5 font-display">
                  <Clock className="w-4.5 h-4.5 text-brand-teal" /> Registro de Auditoría de Seguridad (Cifrado local)
                </span>
                <button
                  onClick={() => {
                    setAuditLogs([]);
                    saveToSQLite('dosia_audits', []);
                  }}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Limpiar Auditoría
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <div className="text-slate-600 text-xs italic text-center py-6">
                    No se registran transacciones clínicas recientes de auditoría en la base de datos local.
                  </div>
                ) : (
                  auditLogs.map((log, i) => (
                    <div key={i} className="bg-brand-dark/50 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center text-xs font-mono">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-brand-teal/20 text-brand-teal px-1.5 py-0.5 rounded text-[9px] font-bold">{log.action}</span>
                          <span className="text-slate-300 font-semibold">{log.details}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 block mt-1">Usuario: {log.user}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 shrink-0">{log.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* OVERLAY 1: Prescription Print Preview Card / PDF Modal */}
      {previewPrescription && (
        <div className="fixed inset-0 bg-brand-dark/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col justify-between border-4 border-slate-800 relative my-8">
            
            <button
              onClick={() => setPreviewPrescription(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono transition-colors border cursor-pointer"
            >
              ×
            </button>

            {/* Printable Area Starts */}
            <div id="printable-prescription-sheet" className="p-4 bg-white select-text text-left">
              
              {/* Doctor Headings */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 font-display uppercase">{previewPrescription.doctorName}</h1>
                  <p className="text-xs font-bold text-slate-600 tracking-wide uppercase">{previewPrescription.doctorSpecialty}</p>
                  <p className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap leading-tight">{previewPrescription.doctorSello}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="bg-slate-900 text-white p-1 rounded font-display font-extrabold text-sm mb-1">DOSIA</div>
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase block">Receta No:</span>
                  <span className="text-xs text-brand-dark font-mono font-black">{previewPrescription.id}</span>
                </div>
              </div>

              {/* Patient profiling specifications */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Paciente</span>
                  <strong className="text-slate-800 text-sm">{previewPrescription.patientName}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Cédula Identidad</span>
                  <strong className="font-mono text-slate-700">{previewPrescription.patientCardId}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Edad</span>
                  <strong className="text-slate-800">{previewPrescription.patientAge} años</strong>
                </div>
                
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Peso</span>
                  <strong className="text-slate-800">{previewPrescription.patientWeight} kg</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Talla / Altura</span>
                  <strong className="text-slate-800">{previewPrescription.patientHeight} cm</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Sup. Corporal (BSA)</span>
                  <strong className="font-mono text-slate-800">{calculateBSA(previewPrescription.patientWeight, previewPrescription.patientHeight).toFixed(2)} m²</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Fécha Emisión</span>
                  <span className="text-slate-700 text-[10px] font-mono font-bold block">{previewPrescription.date.split(',')[0]}</span>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-[9px] text-slate-500 font-bold uppercase block">Diagnóstico de Emergencia:</span>
                <p className="text-slate-800 text-xs font-bold font-sans mt-0.5">{previewPrescription.diagnosis}</p>
              </div>

              {/* Prescribed drugs table */}
              <div className="mb-6">
                <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">R: Indicación de Tratamiento Farmacológico</span>
                <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="py-2 px-3">Fórmula</th>
                      <th className="py-2 px-3">Principio Activo</th>
                      <th className="py-2 px-3">Dosificación / Frecuencia</th>
                      <th className="py-2 px-3">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {previewPrescription.medications.map((med, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-bold">{med.name}</td>
                        <td className="py-2 px-3 text-slate-600 italic">{med.activeIngredient}</td>
                        <td className="py-2 px-3 font-mono font-bold">{med.dose} - {med.frequency}</td>
                        <td className="py-2 px-3">{med.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewPrescription.observations && (
                <div className="mb-6 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Observaciones y Cuidados Generales:</span>
                  <p className="text-slate-700 text-xs mt-1 italic">{previewPrescription.observations}</p>
                </div>
              )}

              {/* Stamp, Signature, QR verification blocks */}
              <div className="grid grid-cols-3 gap-4 border-t-2 border-slate-800 pt-4 mt-4">
                <div className="text-center flex flex-col items-center justify-center">
                  <span className="text-[8px] text-slate-400 block uppercase mb-1">Código QR Verificación</span>
                  <img src={previewPrescription.qrCode} alt="Verificación QR" className="w-16 h-16 rounded border p-1" />
                  <span className="text-[8px] text-slate-500 font-mono mt-1">Sello Autenticidad QR</span>
                </div>

                <div className="text-center flex flex-col justify-end items-center border-l border-slate-200 pb-2">
                  <div className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-2">Sello Autorizado</div>
                  <div className="text-[9px] text-slate-600 whitespace-pre-wrap leading-none border-2 border-slate-400 p-1.5 rounded bg-slate-50/50 font-mono text-center inline-block">
                    {previewPrescription.doctorSello}
                  </div>
                </div>

                <div className="text-center flex flex-col items-center justify-end border-l border-slate-200 pb-2">
                  {previewPrescription.signature ? (
                    <img src={previewPrescription.signature} alt="Firma Médica" className="w-28 h-12 object-contain bg-slate-800/10 rounded" />
                  ) : (
                    <div className="w-28 h-12 border border-slate-300 rounded border-dashed flex items-center justify-center text-[10px] text-slate-400">Sin firma</div>
                  )}
                  <span className="w-28 h-px bg-slate-400 mt-1 block" />
                  <span className="text-[9px] text-slate-500 font-bold block mt-1">Firma del Facultativo</span>
                  <span className="text-[7px] text-slate-400 font-mono block">Cédula: {previewPrescription.doctorCédula}</span>
                </div>
              </div>

            </div>
            {/* Printable Area Ends */}

            {/* Actions modal bar */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const printContents = document.getElementById('printable-prescription-sheet')?.innerHTML;
                  const printWindow = window.open('', '_blank');
                  if (printWindow && printContents) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Receta_DOSIA_${previewPrescription.id}</title>
                          <style>
                            body { font-family: sans-serif; padding: 20px; color: #000; background: #fff; }
                            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            .grid-cols-3 { display: flex; justify-content: space-between; margin-top: 30px; border-top: 2px solid #000; padding-top: 15px; }
                            .text-center { text-align: center; }
                            .bg-slate-50 { background-color: #f9f9f9; padding: 10px; border-radius: 5px; }
                            .italic { font-style: italic; }
                            .font-mono { font-family: monospace; }
                            .font-bold { font-weight: bold; }
                          </style>
                        </head>
                        <body>
                          ${printContents}
                          <script>window.print();</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
                className="flex-1 bg-brand-dark hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-brand-teal" /> Imprimir Receta / Generar PDF
              </button>
              
              <button
                onClick={() => handleShareWhatsApp(previewPrescription)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4" /> Compartir por WhatsApp
              </button>

              <button
                onClick={() => setPreviewPrescription(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl border transition-all text-xs cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GOOGLE DRIVE BACKUP MODAL */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-brand-navy-light border border-slate-800 rounded-3xl p-8 relative shadow-2xl overflow-hidden">
            {/* Soft accent background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="text-center mb-6 relative">
              <div className="mx-auto w-12 h-12 rounded-full bg-brand-teal/10 border border-brand-teal/30 flex items-center justify-center text-brand-teal mb-3">
                <Cloud className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-bold text-slate-200 text-lg font-display">Respaldo Google Drive</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Vincule su cuenta de Google Drive para respaldar expedientes clínicos y firmas de forma segura.
              </p>
            </div>

            <form onSubmit={handleExecuteDriveBackup} className="space-y-5 relative">
              {driveBackingUp && (
                <div className="absolute inset-0 bg-brand-navy-light/90 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl">
                  <RefreshCw className="w-8 h-8 text-brand-teal animate-spin" />
                  <span className="text-xs font-semibold text-brand-teal-pastel font-mono">Respaldando información en Drive...</span>
                  <span className="text-[10px] text-slate-400">Por favor espere un momento</span>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1.5">Correo Electrónico (Gmail)</label>
                <input
                  type="email"
                  value={driveEmail}
                  onChange={(e) => setDriveEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="bg-brand-dark border border-slate-700 rounded-xl px-4 py-3 text-sm w-full text-white focus:outline-none focus:border-brand-teal font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1.5">Contraseña de Gmail</label>
                <div className="relative">
                  <input
                    type={showDrivePassword ? 'text' : 'password'}
                    value={drivePassword}
                    onChange={(e) => setDrivePassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    className="bg-brand-dark border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-sm w-full text-white focus:outline-none focus:border-brand-teal font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDrivePassword(!showDrivePassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showDrivePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDriveModal(false);
                    setDriveEmail('');
                    setDrivePassword('');
                    setShowDrivePassword(false);
                  }}
                  className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 font-bold py-3 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  RESPALDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Design Branding stamp */}
      <footer className="bg-brand-dark border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-mono tracking-wider mt-auto select-none">
        App created By: Andrey Design
      </footer>

    </div>
  );
}

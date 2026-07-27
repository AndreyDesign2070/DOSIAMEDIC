import React, { useState } from 'react';
import { User, Activity, ShieldAlert, Calendar, Stethoscope, Edit3, FileText, Check, Plus, Trash2, Baby, Calculator, X, Sparkles } from 'lucide-react';
import { Patient, BloodGroup, PatientStatus } from '../types';

interface PatientProfileCardProps {
  patient: Patient | null;
  onUpdatePatient?: (updated: Patient) => void;
  onOpenConsultation?: () => void;
  onOpenNewPatientModal?: () => void;
}

export default function PatientProfileCard({
  patient,
  onUpdatePatient,
  onOpenConsultation,
  onOpenNewPatientModal
}: PatientProfileCardProps) {
  if (!patient) {
    return (
      <div className="bg-brand-navy-light/40 border border-slate-800 rounded-3xl p-10 text-center space-y-6 max-w-2xl mx-auto my-12 shadow-2xl animate-fade-in">
        <div className="w-20 h-20 bg-brand-teal/10 border border-brand-teal/30 rounded-full flex items-center justify-center mx-auto text-brand-teal">
          <User className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white font-display">Sin Paciente Seleccionado</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Para consultar la historia médica o registrar datos clínicos, seleccione un paciente de la lista desplegable superior o haga clic en <strong className="text-brand-teal">"Nuevo Paciente"</strong>.
          </p>
        </div>
        {onOpenNewPatientModal && (
          <button
            type="button"
            onClick={onOpenNewPatientModal}
            className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-6 py-3.5 rounded-2xl text-xs inline-flex items-center gap-2 shadow-lg shadow-brand-teal/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Registrar Nuevo Paciente
          </button>
        )}
      </div>
    );
  }

  const [isEditing, setIsEditing] = useState(false);
  const [showDoseCalcModal, setShowDoseCalcModal] = useState(false);

  // Dose Calculator State
  const [calcWeight, setCalcWeight] = useState(patient.weight || 15);
  const [calcMgPerKg, setCalcMgPerKg] = useState(15);
  const [calcConcentrationMg, setCalcConcentrationMg] = useState(120);
  const [calcConcentrationMl, setCalcConcentrationMl] = useState(5);
  const [calcFrequency, setCalcFrequence] = useState('Cada 8 horas');

  const [editedName, setEditedName] = useState(patient.name);
  const [editedAge, setEditedAge] = useState(patient.age);
  const [editedWeight, setEditedWeight] = useState(patient.weight);
  const [editedHeight, setEditedHeight] = useState(patient.height);
  const [editedBloodGroup, setEditedBloodGroup] = useState<BloodGroup>(patient.bloodGroup || 'O+');
  const [editedStatus, setEditedStatus] = useState<PatientStatus>(patient.status || 'Activo');
  const [editedAttendingDoctor, setEditedAttendingDoctor] = useState(patient.attendingDoctor || 'Dr. Juan Pérez');
  const [editedCategory, setEditedCategory] = useState<'ADULTO' | 'PEDIÁTRICO'>(
    patient.patientCategory || (patient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')
  );

  // Allergies & Chronic Diseases State
  const [allergies, setAllergies] = useState<string[]>(
    patient.allergies || patient.alerts?.allergies || []
  );
  const [chronicDiseases, setChronicDiseases] = useState<string[]>(
    patient.preExistingConditions || patient.alerts?.chronicDiseases || []
  );

  const [newAllergy, setNewAllergy] = useState('');
  const [newChronic, setNewChronic] = useState('');

  // Calculate BMI
  const heightM = patient.height ? patient.height / 100 : 1;
  const bmi = patient.weight && heightM > 0 ? (patient.weight / (heightM * heightM)).toFixed(1) : 'N/A';
  const bmiNum = parseFloat(bmi);

  let bmiCategory = 'Normal';
  let bmiColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (!isNaN(bmiNum)) {
    if (bmiNum < 18.5) {
      bmiCategory = 'Bajo peso';
      bmiColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    } else if (bmiNum >= 18.5 && bmiNum < 25) {
      bmiCategory = 'Normal';
      bmiColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    } else if (bmiNum >= 25 && bmiNum < 30) {
      bmiCategory = 'Sobrepeso';
      bmiColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    } else {
      bmiCategory = 'Obesidad';
      bmiColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  }

  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return;
    setAllergies([...allergies, newAllergy.trim()]);
    setNewAllergy('');
  };

  const handleRemoveAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleAddChronic = () => {
    if (!newChronic.trim()) return;
    setChronicDiseases([...chronicDiseases, newChronic.trim()]);
    setNewChronic('');
  };

  const handleRemoveChronic = (index: number) => {
    setChronicDiseases(chronicDiseases.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!onUpdatePatient) return;
    const updated: Patient = {
      ...patient,
      name: editedName,
      age: Number(editedAge),
      weight: Number(editedWeight),
      height: Number(editedHeight),
      bloodGroup: editedBloodGroup,
      status: editedStatus,
      attendingDoctor: editedAttendingDoctor,
      patientCategory: editedCategory,
      allergies: allergies,
      preExistingConditions: chronicDiseases,
      alerts: {
        ...patient.alerts,
        allergies: allergies,
        chronicDiseases: chronicDiseases
      }
    };
    onUpdatePatient(updated);
    setIsEditing(false);
  };

  const currentCategory = patient.patientCategory || (patient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO');

  return (
    <div className="bg-brand-navy-light/40 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden text-left space-y-6">
      {/* Background soft ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold bg-brand-dark/80 text-brand-teal border border-brand-teal/30 px-3 py-1 rounded-xl">
            {patient.hcNumber || 'HC-2026-0001'}
          </span>
          <span className={`text-xs font-bold px-3 py-1 rounded-xl border uppercase tracking-wider ${
            patient.status === 'Hospitalizado'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : patient.status === 'Alta'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-brand-teal/15 border-brand-teal/40 text-brand-teal'
          }`}>
            ● Estado: {patient.status}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Prompt Request #3: Dose Calculator Button inside Patient Profile */}
          <button
            type="button"
            onClick={() => {
              setCalcWeight(patient.weight || 15);
              setShowDoseCalcModal(true);
            }}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10"
          >
            <Calculator className="w-4 h-4 text-amber-400" /> Calculadora de Dosis
          </button>

          {onOpenConsultation && (
            <button
              type="button"
              onClick={onOpenConsultation}
              className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-brand-teal/10 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Nueva Consulta
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancelar' : 'Editar Datos'}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Core Patient Demographics (Cols 8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {isEditing ? (
            <div className="space-y-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800">
              
              {/* Category Selector (Adult / Pediatric) */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Categoría Paciente</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditedCategory('ADULTO')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      editedCategory === 'ADULTO'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 ring-1 ring-sky-400/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <User className="w-4 h-4" /> ADULTO
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditedCategory('PEDIÁTRICO')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      editedCategory === 'PEDIÁTRICO'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Baby className="w-4 h-4" /> NIÑO (PEDIÁTRICO)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="bg-brand-navy-light border border-slate-700 rounded-xl px-3 py-2 text-sm text-white w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Edad (Años)</label>
                  <input
                    type="number"
                    value={editedAge}
                    onChange={(e) => {
                      const newA = Number(e.target.value);
                      setEditedAge(newA);
                      if (newA < 15) setEditedCategory('PEDIÁTRICO');
                      else setEditedCategory('ADULTO');
                    }}
                    className="bg-brand-navy-light border border-slate-700 rounded-xl px-3 py-2 text-sm text-white w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    value={editedWeight}
                    onChange={(e) => setEditedWeight(Number(e.target.value))}
                    className="bg-brand-navy-light border border-slate-700 rounded-xl px-3 py-2 text-sm text-white w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Talla (cm)</label>
                  <input
                    type="number"
                    value={editedHeight}
                    onChange={(e) => setEditedHeight(Number(e.target.value))}
                    className="bg-brand-navy-light border border-slate-700 rounded-xl px-3 py-2 text-sm text-white w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Grupo Sanguíneo</label>
                  <select
                    value={editedBloodGroup}
                    onChange={(e) => setEditedBloodGroup(e.target.value as BloodGroup)}
                    className="bg-brand-navy-light border border-slate-700 rounded-xl px-3 py-2 text-sm text-white w-full"
                  >
                    {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Estado Hospitalario</label>
                  <select
                    value={editedStatus}
                    onChange={(e) => setEditedStatus(e.target.value as PatientStatus)}
                    className="bg-brand-navy-light border border-slate-700 rounded-xl px-3 py-2 text-sm text-white w-full"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Hospitalizado">Hospitalizado</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" /> Guardar Cambios del Paciente
              </button>
            </div>
          ) : (
            <>
              {/* Display Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">{patient.name}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Cédula: <strong className="text-brand-teal-pastel font-mono">{patient.cardId}</strong> | {patient.age} años | Sexo: <strong className="text-slate-200">{patient.sex === 'M' ? 'Masculino' : 'Femenino'}</strong>
                  </p>
                </div>

                {/* Patient Category Indicator Pill */}
                <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 font-bold text-xs ${
                  currentCategory === 'PEDIÁTRICO'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                    : 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                }`}>
                  {currentCategory === 'PEDIÁTRICO' ? <Baby className="w-5 h-5 text-amber-400" /> : <User className="w-5 h-5 text-sky-400" />}
                  <div>
                    <span className="text-[9px] block uppercase text-slate-400">Tipo de Paciente</span>
                    <span>{currentCategory === 'PEDIÁTRICO' ? 'NIÑO (PEDIÁTRICO)' : 'ADULTO'}</span>
                  </div>
                </div>
              </div>

              {/* Attributes Chips Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Peso</span>
                  <span className="text-lg font-bold font-mono text-white">{patient.weight} <span className="text-xs text-slate-400">kg</span></span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Talla</span>
                  <span className="text-lg font-bold font-mono text-white">{patient.height} <span className="text-xs text-slate-400">cm</span></span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">IMC Calculado</span>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold font-mono text-white">{bmi}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${bmiColor}`}>
                      {bmiCategory}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Grupo Sanguíneo</span>
                  <span className="text-lg font-bold font-mono text-rose-400">{patient.bloodGroup || 'O+'}</span>
                </div>
              </div>
            </>
          )}

          {/* INTEGRATED ALERGIAS Y ENFERMEDADES CRÓNICAS BOXES (Prompt Request #9) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Box 1: Alergias */}
            <div className="bg-slate-900/90 border border-rose-500/30 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> 🔴 Alergias Documentadas
                </h4>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
                  {allergies.length}
                </span>
              </div>

              {/* Allergy List */}
              <div className="flex flex-wrap gap-1.5">
                {allergies.length > 0 ? (
                  allergies.map((allergy, idx) => (
                    <span key={idx} className="bg-rose-500/20 text-rose-200 border border-rose-500/40 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                      {allergy}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(idx)}
                        className="text-rose-400 hover:text-white cursor-pointer"
                        title="Eliminar alergia"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No se registran alergias.</span>
                )}
              </div>

              {/* Add Allergy Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAllergy()}
                  placeholder="Ej. Penicilina, AINEs..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleAddAllergy}
                  className="bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Box 2: Enfermedades Crónicas */}
            <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Activity className="w-4 h-4 text-amber-500" /> 🟠 Enfermedades Crónicas
                </h4>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {chronicDiseases.length}
                </span>
              </div>

              {/* Chronic Diseases List */}
              <div className="flex flex-wrap gap-1.5">
                {chronicDiseases.length > 0 ? (
                  chronicDiseases.map((cond, idx) => (
                    <span key={idx} className="bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                      {cond}
                      <button
                        type="button"
                        onClick={() => handleRemoveChronic(idx)}
                        className="text-amber-400 hover:text-white cursor-pointer"
                        title="Eliminar enfermedad"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No se registran antecedentes crónicos.</span>
                )}
              </div>

              {/* Add Chronic Disease Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newChronic}
                  onChange={(e) => setNewChronic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChronic()}
                  placeholder="Ej. Hipertensión Arterial..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddChronic}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold p-1.5 rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Metadata & Clinical Context (Cols 4) */}
        <div className="lg:col-span-4 space-y-4 bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-800">
          
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-brand-teal shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Última Consulta</span>
              <span className="font-mono text-white font-bold">{patient.lastConsultationDate || '2026-07-22'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
            <Stethoscope className="w-4 h-4 text-brand-teal shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Médico Tratante</span>
              <span className="text-white font-semibold">{patient.attendingDoctor || 'Dr. Juan Pérez'}</span>
            </div>
          </div>

          {/* Quick Summary Box */}
          <div className="border-t border-slate-800/80 pt-3 space-y-2">
            <span className="text-[10px] text-brand-teal font-bold uppercase tracking-wider block">Resumen del Expediente</span>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
              <div>• Paciente: <span className="text-white font-bold">{patient.name}</span></div>
              <div>• Clasificación: <span className="text-brand-teal font-bold">{currentCategory}</span></div>
              <div>• FC previa: {patient.vitalSigns?.heartRate || 80} lpm</div>
              <div>• PA previa: {patient.vitalSigns?.bloodPressure || '120/80'} mmHg</div>
            </div>
          </div>

        </div>

      </div>

      {/* DOSE CALCULATOR MODAL (Prompt Request #3) */}
      {showDoseCalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-brand-navy-light border border-slate-800 rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto text-left shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" /> Calculadora de Dosis Exacta (Pediátrica / Adulto)
              </h4>
              <button
                type="button"
                onClick={() => setShowDoseCalcModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient Context Banner */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs flex justify-between items-center font-mono">
              <span>Paciente: <strong className="text-white">{patient.name}</strong></span>
              <span>Peso Actual: <strong className="text-brand-teal">{calcWeight} kg</strong></span>
              <span>Categoría: <strong className="text-amber-300">{currentCategory}</strong></span>
            </div>

            {/* Quick Drug Presets */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Plantillas Rápidas Frecuentes:</label>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { name: 'Paracetamol', mgkg: 15, mg: 120, ml: 5 },
                  { name: 'Ibuprofeno', mgkg: 10, mg: 100, ml: 5 },
                  { name: 'Amoxicilina', mgkg: 40, mg: 250, ml: 5 },
                  { name: 'Ceftriaxona', mgkg: 50, mg: 500, ml: 5 },
                  { name: 'Azitromicina', mgkg: 10, mg: 200, ml: 5 }
                ].map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setCalcMgPerKg(preset.mgkg);
                      setCalcConcentrationMg(preset.mg);
                      setCalcConcentrationMl(preset.ml);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg font-semibold transition-all"
                  >
                    {preset.name} ({preset.mgkg}mg/kg)
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Peso del Paciente (kg)</label>
                <input
                  type="number"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Dosis Deseada (mg / kg / dosis)</label>
                <input
                  type="number"
                  value={calcMgPerKg}
                  onChange={(e) => setCalcMgPerKg(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Concentración de Presentación (mg)</label>
                <input
                  type="number"
                  value={calcConcentrationMg}
                  onChange={(e) => setCalcConcentrationMg(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">En Volumen de Jarabe / Ampolla (mL)</label>
                <input
                  type="number"
                  value={calcConcentrationMl}
                  onChange={(e) => setCalcConcentrationMl(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            {/* Result Box */}
            {calcWeight > 0 && calcMgPerKg > 0 && (
              <div className="bg-brand-dark p-4 rounded-2xl border border-brand-teal/40 space-y-2">
                <span className="text-[10px] font-bold text-brand-teal uppercase tracking-wider block">
                  CÁLCULO AUTOMÁTICO RESULTANTE
                </span>

                <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Dosis Total en Miligramos:</span>
                    <span className="text-amber-400 font-black text-base">
                      {(calcWeight * calcMgPerKg).toFixed(1)} mg / dosis
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Volumen Exacto en Mililitros:</span>
                    <span className="text-brand-teal font-black text-base">
                      {calcConcentrationMg > 0
                        ? (((calcWeight * calcMgPerKg) * calcConcentrationMl) / calcConcentrationMg).toFixed(1)
                        : '0'} mL / dosis
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-sans italic pt-1">
                  💡 Fórmula aplicada: (Peso x Dosis en mg/kg x mL de jarabe) / mg de la presentación.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDoseCalcModal(false)}
              className="w-full bg-brand-teal text-slate-900 font-bold py-3 rounded-xl text-xs cursor-pointer hover:bg-brand-teal-pastel"
            >
              Cerrar Calculadora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

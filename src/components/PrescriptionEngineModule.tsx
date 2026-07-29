import React, { useState } from 'react';
import { Pill, ShieldCheck, AlertTriangle, Calculator, Baby, Heart, Search, CheckCircle, Plus, Trash2, FileText, Sparkles } from 'lucide-react';
import { Patient, Medication, PrescriptionMedication, DrugInteraction } from '../types';

interface PrescriptionEngineModuleProps {
  patient: Patient | null;
  medicationsList: Medication[];
  onGeneratePrescription: (meds: PrescriptionMedication[], diagnosis: string, observations: string) => void;
}

export default function PrescriptionEngineModule({
  patient,
  medicationsList,
  onGeneratePrescription
}: PrescriptionEngineModuleProps) {
  const [subTab, setSubTab] = useState<'prescribe' | 'vademecum' | 'peds_calculator' | 'interactions'>('prescribe');
  const [searchDrug, setSearchDrug] = useState('');
  const [selectedMedForPrescription, setSelectedMedForPrescription] = useState<Medication | null>(null);

  // Form inputs for current drug being added
  const [customDose, setCustomDose] = useState('');
  const [customFreq, setCustomFreq] = useState('Cada 8 horas');
  const [customDuration, setCustomDuration] = useState('7 días');
  const [customNotes, setCustomNotes] = useState('');

  // Added prescription items list
  const [currentPrescriptionList, setCurrentPrescriptionList] = useState<PrescriptionMedication[]>([]);
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [observationsInput, setObservationsInput] = useState('');

  // Dose Adjustment toggles
  const [adjRenal, setAdjRenal] = useState(patient?.alerts?.hasRenalFailure || false);
  const [adjHepatic, setAdjHepatic] = useState(patient?.alerts?.hasHepaticFailure || false);
  const [adjPregnancy, setAdjPregnancy] = useState(patient?.alerts?.isPregnant || false);
  const [adjLactation, setAdjLactation] = useState(patient?.alerts?.isLactating || false);

  // Pediatric Calc Inputs
  const [calcWeight, setCalcWeight] = useState(patient?.weight || 15);
  const [calcMgPerKg, setCalcMgPerKg] = useState(10);
  const [calcConcentrationMg, setCalcConcentrationMg] = useState(120);
  const [calcConcentrationMl, setCalcConcentrationMl] = useState(5);

  // Category Quick Filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const filteredMeds = medicationsList.filter(m => {
    const matchesSearch =
      (m?.name || '').toLowerCase().includes((searchDrug || '').toLowerCase()) ||
      (m?.activeIngredient || '').toLowerCase().includes((searchDrug || '').toLowerCase()) ||
      (m?.category || '').toLowerCase().includes((searchDrug || '').toLowerCase()) ||
      (m?.brandName || '').toLowerCase().includes((searchDrug || '').toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategoryFilter === 'psicotropicos') {
      return (m?.category || '').toLowerCase().includes('psicotrópico') || (m?.category || '').toLowerCase().includes('psicotropico') || ['clonazepam', 'alprazolam', 'quetiapina', 'sertralina', 'haloperidol', 'diazepam'].some(k => (m?.name || '').toLowerCase().includes(k) || (m?.activeIngredient || '').toLowerCase().includes(k));
    }
    if (selectedCategoryFilter === 'vasoactivos') {
      return (m?.category || '').toLowerCase().includes('vasoactivo') || (m?.category || '').toLowerCase().includes('inotrópico') || (m?.category || '').toLowerCase().includes('inotropico') || ['noradrenalina', 'adrenalina', 'dopamina', 'dobutamina', 'vasopresina', 'milrinona'].some(k => (m?.name || '').toLowerCase().includes(k) || (m?.activeIngredient || '').toLowerCase().includes(k));
    }
    if (selectedCategoryFilter === 'antihipertensivos_iv') {
      return (m?.category || '').toLowerCase().includes('antihipertensivo') || ['labetalol', 'nicardipino', 'nicardipina', 'nitroprusiato', 'nitroglicerina', 'hidralazina', 'esmolol'].some(k => (m?.name || '').toLowerCase().includes(k) || (m?.activeIngredient || '').toLowerCase().includes(k));
    }
    if (selectedCategoryFilter === 'antiarritmicos') {
      return (m?.category || '').toLowerCase().includes('antiarreítmico') || (m?.category || '').toLowerCase().includes('antiarritmico') || ['amiodarona', 'adenosina', 'lidocaína', 'lidocaina', 'propafenona', 'verapamilo'].some(k => (m?.name || '').toLowerCase().includes(k) || (m?.activeIngredient || '').toLowerCase().includes(k));
    }

    return true;
  });

  // INTERACTION CHECKER FOR SELECTED MEDS IN PRESCRIPTION LIST
  const getInteractions = () => {
    const warnings: { med1: string; med2: string; severity: 'Moderada' | 'Grave'; desc: string }[] = [];
    
    for (let i = 0; i < currentPrescriptionList.length; i++) {
      for (let j = i + 1; j < currentPrescriptionList.length; j++) {
        const item1 = currentPrescriptionList[i];
        const item2 = currentPrescriptionList[j];

        const medObj1 = medicationsList.find(m => m.name === item1.name || m.activeIngredient === item1.activeIngredient);
        if (medObj1?.interactions) {
          const match = medObj1.interactions.find(
            intr => (item2?.name || '').toLowerCase().includes((intr?.drugName || '').toLowerCase()) || (item2?.activeIngredient || '').toLowerCase().includes((intr?.drugName || '').toLowerCase())
          );
          if (match && match.severity !== 'Sin interacción') {
            warnings.push({
              med1: item1.name,
              med2: item2.name,
              severity: match.severity as any,
              desc: match.description
            });
          }
        }
      }
    }
    return warnings;
  };

  const interactionsFound = getInteractions();

  // SAFETY VALIDATIONS
  const checkMedSafety = (med: Medication) => {
    const warnings: string[] = [];

    // Check allergy
    if (patient?.allergies) {
      const isAllergic = patient.allergies.some(
        a => (med?.name || '').toLowerCase().includes((a || '').toLowerCase()) || (med?.activeIngredient || '').toLowerCase().includes((a || '').toLowerCase())
      );
      if (isAllergic) {
        warnings.push(`🔴 ALERTA GRAVE: El paciente tiene alergia documentada a ${med.name}!`);
      }
    }

    // Pregnancy check
    if (adjPregnancy || patient?.alerts?.isPregnant) {
      if (med.pregnancyCategory === 'D' || med.pregnancyCategory === 'X') {
        warnings.push(`🟡 ADVERTENCIA DE EMBARAZO: Categoría ${med.pregnancyCategory} (Contraindicado en gestación).`);
      }
    }

    // Renal check
    if (adjRenal || patient?.alerts?.hasRenalFailure) {
      if (med.renalAdjustment) {
        warnings.push(`🟣 AJUSTE RENAL: ${med.renalAdjustment}`);
      }
    }

    // Hepatic check
    if (adjHepatic || patient?.alerts?.hasHepaticFailure) {
      if (med.hepaticAdjustment) {
        warnings.push(`🟢 AJUSTE HEPÁTICO: ${med.hepaticAdjustment}`);
      }
    }

    return warnings;
  };

  const handleSelectMedToPrescribe = (med: Medication) => {
    setSelectedMedForPrescription(med);
    // Auto set default dose
    if (patient && patient.age < 12) {
      const pedsDose = (15 * patient.weight).toFixed(0);
      setCustomDose(`${pedsDose} mg (${(Number(pedsDose) / 24).toFixed(1)} ml)`);
    } else {
      setCustomDose(med.adultDose.split('cada')[0] || med.adultDose);
    }
  };

  const handleAddMedToPrescriptionList = () => {
    if (!selectedMedForPrescription) return;

    const newItem: PrescriptionMedication = {
      id: `pmed-${Date.now()}`,
      name: selectedMedForPrescription.name,
      activeIngredient: selectedMedForPrescription.activeIngredient,
      dose: customDose || selectedMedForPrescription.adultDose,
      frequency: customFreq,
      duration: customDuration,
      notes: customNotes
    };

    setCurrentPrescriptionList([...currentPrescriptionList, newItem]);
    setSelectedMedForPrescription(null);
    setCustomDose('');
    setCustomNotes('');
  };

  const handleRemoveItem = (id: string) => {
    setCurrentPrescriptionList(currentPrescriptionList.filter(item => item.id !== id));
  };

  // Pediatric dose results
  const totalSingleDoseMg = calcMgPerKg * calcWeight;
  const totalMlPerDose = calcConcentrationMg > 0 ? (totalSingleDoseMg * calcConcentrationMl) / calcConcentrationMg : 0;
  const totalDropsPerDose = totalMlPerDose * 20; // 1 ml = 20 gotas std

  return (
    <div className="bg-brand-navy-light/30 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
      
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Pill className="w-5 h-5 text-brand-teal" /> Motor Inteligente de Prescripción & Vademécum
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Validación automática de alergias, interacciones fármaco-fármaco, dosis pediátricas y ajustes de función renal/hepática.
          </p>
        </div>

        {/* Dose Adjustment Toggles Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-[10px] font-bold">
          <span className="text-slate-400 px-2 uppercase font-mono">Ajustes Activos:</span>
          <button
            type="button"
            onClick={() => setAdjRenal(!adjRenal)}
            className={`px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
              adjRenal ? 'bg-purple-500/25 border-purple-400 text-purple-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
            }`}
          >
            🟣 Renal: {adjRenal ? 'SÍ' : 'NO'}
          </button>
          <button
            type="button"
            onClick={() => setAdjHepatic(!adjHepatic)}
            className={`px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
              adjHepatic ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
            }`}
          >
            🟢 Hepático: {adjHepatic ? 'SÍ' : 'NO'}
          </button>
          <button
            type="button"
            onClick={() => setAdjPregnancy(!adjPregnancy)}
            className={`px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
              adjPregnancy ? 'bg-yellow-500/25 border-yellow-400 text-yellow-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
            }`}
          >
            🟡 Embarazo: {adjPregnancy ? 'SÍ' : 'NO'}
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'prescribe', label: '📝 Generar Receta Médica', icon: FileText },
          { id: 'vademecum', label: '📖 Vademécum Clínico Completo', icon: Pill },
          { id: 'peds_calculator', label: '👶 Calculadora de Dosis Pediátrica', icon: Calculator },
          { id: 'interactions', label: '⚠️ Detector de Interacciones', icon: AlertTriangle }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                subTab === tab.id
                  ? 'bg-brand-teal text-slate-900 shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: PRESCRIBE */}
      {subTab === 'prescribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Medication Picker (Cols 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchDrug}
                onChange={(e) => setSearchDrug(e.target.value)}
                placeholder="Buscar en Vademécum por nombre o principio activo..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>

            {/* Quick Categories Bar */}
            <div className="flex flex-wrap gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-2 py-1 rounded-lg border font-medium transition-all ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-brand-teal text-slate-900 font-bold border-brand-teal'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('psicotropicos')}
                className={`px-2 py-1 rounded-lg border font-medium transition-all ${
                  selectedCategoryFilter === 'psicotropicos'
                    ? 'bg-purple-500 text-white font-bold border-purple-400'
                    : 'bg-slate-900 border-slate-800 text-purple-300 hover:border-purple-500'
                }`}
              >
                🧠 Psicotrópicos
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('vasoactivos')}
                className={`px-2 py-1 rounded-lg border font-medium transition-all ${
                  selectedCategoryFilter === 'vasoactivos'
                    ? 'bg-amber-500 text-slate-900 font-bold border-amber-400'
                    : 'bg-slate-900 border-slate-800 text-amber-300 hover:border-amber-500'
                }`}
              >
                ⚡ Vasoactivos / Inotrópicos
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('antihipertensivos_iv')}
                className={`px-2 py-1 rounded-lg border font-medium transition-all ${
                  selectedCategoryFilter === 'antihipertensivos_iv'
                    ? 'bg-rose-500 text-white font-bold border-rose-400'
                    : 'bg-slate-900 border-slate-800 text-rose-300 hover:border-rose-500'
                }`}
              >
                💉 Antihipertensivos IV
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('antiarritmicos')}
                className={`px-2 py-1 rounded-lg border font-medium transition-all ${
                  selectedCategoryFilter === 'antiarritmicos'
                    ? 'bg-cyan-500 text-slate-900 font-bold border-cyan-400'
                    : 'bg-slate-900 border-slate-800 text-cyan-300 hover:border-cyan-500'
                }`}
              >
                ❤️ Antiarrítmicos
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {filteredMeds.map(med => {
                const warnings = checkMedSafety(med);
                const hasWarnings = warnings.length > 0;

                return (
                  <div
                    key={med.id}
                    onClick={() => handleSelectMedToPrescribe(med)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      selectedMedForPrescription?.id === med.id
                        ? 'bg-brand-teal/20 border-brand-teal text-white'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-white">{med.name}</span>
                      <span className="text-[10px] bg-slate-800 text-brand-teal px-2 py-0.5 rounded">
                        {med.category}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Dosis Adulto: {med.adultDose} | Pediátrico: {med.pediatricDosePerKg}
                    </p>

                    {hasWarnings && (
                      <div className="text-[10px] text-rose-400 font-bold bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                        {warnings[0]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Drug Configure Box */}
            {selectedMedForPrescription && (
              <div className="bg-slate-900 p-4 rounded-2xl border border-brand-teal/40 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-sm text-brand-teal font-display">
                    Configurar: {selectedMedForPrescription.name}
                  </span>
                  <button
                    onClick={() => setSelectedMedForPrescription(null)}
                    className="text-xs text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block">Dosis Específica</label>
                    <input
                      type="text"
                      value={customDose}
                      onChange={(e) => setCustomDose(e.target.value)}
                      placeholder="Ej. 500 mg"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block">Frecuencia</label>
                    <input
                      type="text"
                      value={customFreq}
                      onChange={(e) => setCustomFreq(e.target.value)}
                      placeholder="Ej. Cada 8 horas"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block">Duración</label>
                    <input
                      type="text"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="Ej. 7 días"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block">Indicaciones / Notas</label>
                    <input
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Ej. Con las comidas"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddMedToPrescriptionList}
                  className="w-full bg-brand-teal text-slate-900 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer hover:bg-brand-teal-pastel"
                >
                  <Plus className="w-4 h-4" /> Agregar a la Receta Activa
                </button>
              </div>
            )}
          </div>

          {/* Right Active Prescription List & Validated Output (Cols 7) */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <span className="font-bold text-white text-base font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-teal" /> Receta Médica en Elaboración ({currentPrescriptionList.length})
              </span>
              <span className="text-xs text-slate-400">
                Paciente: <strong className="text-white">{patient?.name || 'Seleccionado'}</strong>
              </span>
            </div>

            {/* Interaction Warnings Banner */}
            {interactionsFound.length > 0 && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl space-y-1 text-xs">
                <span className="font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> ¡ALERTA DE INTERACCIÓN GRAVE DETECTADA EN LA RECETA!
                </span>
                {interactionsFound.map((intr, i) => (
                  <p key={i} className="text-rose-200 text-[11px]">
                    • <strong>{intr.med1}</strong> + <strong>{intr.med2}</strong>: {intr.desc}
                  </p>
                ))}
              </div>
            )}

            {/* Prescribed Items Table */}
            {currentPrescriptionList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Aún no ha agregado ningún medicamento a la receta. Seleccione medicamentos del buscador a la izquierda.
              </div>
            ) : (
              <div className="space-y-2">
                {currentPrescriptionList.map(item => (
                  <div key={item.id} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-brand-teal font-mono">
                        {item.dose} - {item.frequency} por {item.duration}
                      </div>
                      {item.notes && <div className="text-[10px] text-slate-400">{item.notes}</div>}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Diagnosis & Observations Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Diagnóstico Asociado</label>
                <input
                  type="text"
                  value={diagnosisInput}
                  onChange={(e) => setDiagnosisInput(e.target.value)}
                  placeholder="Ej. Infección del Tracto Urinario (CIE-10 N39.0)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Observaciones e Indicaciones Generales</label>
                <textarea
                  rows={2}
                  value={observationsInput}
                  onChange={(e) => setObservationsInput(e.target.value)}
                  placeholder="Ej. Abundante hidratación oral, control en 72 horas si persiste fiebre."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="button"
                disabled={currentPrescriptionList.length === 0}
                onClick={() => onGeneratePrescription(currentPrescriptionList, diagnosisInput, observationsInput)}
                className="w-full bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-brand-teal/10 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Finalizar Receta y Generar Código QR
              </button>
            </div>

          </div>

        </div>
      )}

      {/* SUBTAB 2: VADEMECUM */}
      {subTab === 'vademecum' && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchDrug}
              onChange={(e) => setSearchDrug(e.target.value)}
              placeholder="Buscar en el Vademécum por Nombre Comercial, Genérico, Principio Activo o Categoría..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
            />
            <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
          </div>

          {/* Quick Categories Bar Vademecum */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                selectedCategoryFilter === 'all'
                  ? 'bg-brand-teal text-slate-900 font-bold border-brand-teal shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Todos ({medicationsList.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('psicotropicos')}
              className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                selectedCategoryFilter === 'psicotropicos'
                  ? 'bg-purple-500 text-white font-bold border-purple-400 shadow'
                  : 'bg-slate-900 border-slate-800 text-purple-300 hover:border-purple-500'
              }`}
            >
              🧠 Psicotrópicos
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('vasoactivos')}
              className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                selectedCategoryFilter === 'vasoactivos'
                  ? 'bg-amber-500 text-slate-900 font-bold border-amber-400 shadow'
                  : 'bg-slate-900 border-slate-800 text-amber-300 hover:border-amber-500'
              }`}
            >
              ⚡ Vasoactivos / Inotrópicos
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('antihipertensivos_iv')}
              className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                selectedCategoryFilter === 'antihipertensivos_iv'
                  ? 'bg-rose-500 text-white font-bold border-rose-400 shadow'
                  : 'bg-slate-900 border-slate-800 text-rose-300 hover:border-rose-500'
              }`}
            >
              💉 Antihipertensivos IV
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('antiarritmicos')}
              className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                selectedCategoryFilter === 'antiarritmicos'
                  ? 'bg-cyan-500 text-slate-900 font-bold border-cyan-400 shadow'
                  : 'bg-slate-900 border-slate-800 text-cyan-300 hover:border-cyan-500'
              }`}
            >
              ❤️ Antiarrítmicos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMeds.map(med => (
              <div key={med.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="font-bold text-base text-white font-display">{med.name}</h4>
                    <span className="text-xs text-brand-teal font-mono">{med.brandName || med.genericName}</span>
                  </div>
                  <span className="text-[10px] bg-brand-teal/20 text-brand-teal border border-brand-teal/30 px-2.5 py-1 rounded-xl font-bold">
                    {med.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-slate-800/60 rounded">
                    <span className="text-slate-400 text-[10px] block font-sans uppercase">Dosis Adulto:</span>
                    <span className="text-slate-200">{med.adultDose}</span>
                  </div>
                  <div className="p-2 bg-slate-800/60 rounded">
                    <span className="text-slate-400 text-[10px] block font-sans uppercase">Dosis Pediátrica:</span>
                    <span className="text-slate-200">{med.pediatricDosePerKg}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-300">
                  <p><strong>Presentación:</strong> {med.presentation || 'Tabletas / Jarabe'}</p>
                  <p><strong>Ajuste Renal:</strong> {med.renalAdjustment || 'Sin ajuste especificado'}</p>
                  <p><strong>Mecanismo de Acción:</strong> {med.mechanismOfAction || 'Inhibidor farmacológico selectivo'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: PEDIATRIC DOSAGE CALCULATOR */}
      {subTab === 'peds_calculator' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h4 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-brand-teal" /> Calculadora Automática de Dosis Pediátricas
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Peso Paciente (kg)</label>
              <input
                type="number"
                value={calcWeight}
                onChange={(e) => setCalcWeight(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Dosis (mg / kg / dosis)</label>
              <input
                type="number"
                value={calcMgPerKg}
                onChange={(e) => setCalcMgPerKg(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Concentración Jarabe (mg)</label>
              <input
                type="number"
                value={calcConcentrationMg}
                onChange={(e) => setCalcConcentrationMg(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">En Volumen (ml)</label>
              <input
                type="number"
                value={calcConcentrationMl}
                onChange={(e) => setCalcConcentrationMl(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Results Output Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-brand-teal/20 border border-brand-teal/40 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[10px] text-brand-teal uppercase font-bold block">Dosis Total mg / toma</span>
              <span className="text-2xl font-bold font-mono text-white">{totalSingleDoseMg.toFixed(1)} mg</span>
            </div>

            <div className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[10px] text-emerald-300 uppercase font-bold block">Volumen en ml / toma</span>
              <span className="text-2xl font-bold font-mono text-white">{totalMlPerDose.toFixed(2)} ml</span>
            </div>

            <div className="bg-cyan-500/20 border border-cyan-500/40 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[10px] text-cyan-300 uppercase font-bold block">Equivalente en Gotas</span>
              <span className="text-2xl font-bold font-mono text-white">{totalDropsPerDose.toFixed(0)} gotas</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

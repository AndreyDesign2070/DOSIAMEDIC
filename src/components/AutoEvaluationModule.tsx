import React, { useState } from 'react';
import { Activity, HeartPulse, Calculator, Sparkles, AlertTriangle, ShieldCheck, Thermometer, Droplet, Brain } from 'lucide-react';
import { Patient, VitalSigns } from '../types';

interface AutoEvaluationModuleProps {
  patient: Patient;
  onUpdateVitals?: (vitals: VitalSigns) => void;
}

export default function AutoEvaluationModule({ patient, onUpdateVitals }: AutoEvaluationModuleProps) {
  // Local state for vital signs input
  const [vitals, setVitals] = useState<VitalSigns>(patient.vitalSigns || {
    heartRate: 80,
    bloodPressure: '120/80',
    temperature: 36.5,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    painEva: 0,
    glycemia: 95,
    abdominalCircumference: 85,
    consciousnessAVPU: 'A',
    diuresisMlHr: 50,
    fluidBalanceMl: 200,
    chestPain: false,
    abdominalPain: false,
    respiratoryStatus: 'Eupneico'
  });

  // Glasgow 04VSM6 state
  const [glasgowOcular, setGlasgowOcular] = useState<number>(4);
  const [glasgowVerbal, setGlasgowVerbal] = useState<number>(5);
  const [glasgowMotor, setGlasgowMotor] = useState<number>(6);

  const glasgowTotal = glasgowOcular + glasgowVerbal + glasgowMotor;

  // Split BP
  const bpParts = (vitals?.bloodPressure || '120/80').split('/');
  const pas = parseInt(bpParts[0]) || 120;
  const pad = parseInt(bpParts[1]) || 80;

  // 1. BMI Calculation
  const heightM = patient.height ? patient.height / 100 : 1;
  const bmi = patient.weight && heightM > 0 ? (patient.weight / (heightM * heightM)).toFixed(1) : 'N/A';
  const bmiNum = parseFloat(bmi);

  let weightClass = 'Normal';
  let weightColor = 'text-emerald-400';
  if (!isNaN(bmiNum)) {
    if (bmiNum < 18.5) { weightClass = 'Bajo Peso'; weightColor = 'text-amber-400'; }
    else if (bmiNum < 25) { weightClass = 'Peso Normal'; weightColor = 'text-emerald-400'; }
    else if (bmiNum < 30) { weightClass = 'Sobrepeso'; weightColor = 'text-yellow-400'; }
    else if (bmiNum < 35) { weightClass = 'Obesidad Grado I'; weightColor = 'text-rose-400'; }
    else if (bmiNum < 40) { weightClass = 'Obesidad Grado II'; weightColor = 'text-rose-500'; }
    else { weightClass = 'Obesidad Mórbida (Grado III)'; weightColor = 'text-rose-600 font-extrabold'; }
  }

  // 2. Body Surface Area (BSA / Superficie Corporal - Mosteller Formula)
  const bsa = (patient.weight && patient.height)
    ? Math.sqrt((patient.weight * patient.height) / 3600).toFixed(2)
    : 'N/A';

  // 3. Mean Arterial Pressure (PAM / MAP)
  const pam = Math.round(pad + (pas - pad) / 3);
  let pamStatus = 'Normal (70-105 mmHg)';
  let pamColor = 'text-emerald-400';
  if (pam < 65) { pamStatus = '⚠️ Hipoperfusión / Hipotensión (PAM < 65)'; pamColor = 'text-rose-400 font-bold'; }
  else if (pam > 110) { pamStatus = '⚠️ Hipertensión Severa'; pamColor = 'text-amber-400 font-bold'; }

  // 4. Shock Index (FC / PAS)
  const shockIndex = (vitals.heartRate / (pas || 120)).toFixed(2);
  const shockNum = parseFloat(shockIndex);
  let shockStatus = 'Normal (0.5 - 0.7)';
  let shockColor = 'text-emerald-400';
  if (shockNum > 0.9) {
    shockStatus = '🚨 ALERTA: Índice de Shock Elevado (> 0.9) - Posible Choque Séptico / Hemorrágico';
    shockColor = 'text-rose-400 font-extrabold animate-pulse';
  }

  // DETAILED COMPREHENSIVE AUTOMATIC PATIENT CLINICAL DIAGNOSIS SUMMARY
  const generateDetailedClinicalState = () => {
    const issues: string[] = [];

    // Temperature
    if (vitals.temperature >= 38.0) issues.push(`Síndrome Febril (${vitals.temperature} °C)`);
    else if (vitals.temperature < 35.5) issues.push(`Hipotermia (${vitals.temperature} °C)`);

    // BP
    if (pas >= 140 || pad >= 90) issues.push(`Hipertensión Arterial (${vitals.bloodPressure} mmHg)`);
    else if (pas < 90) issues.push(`Hipotensión Arterial (${vitals.bloodPressure} mmHg)`);

    // Oxygen
    if (vitals.oxygenSaturation < 92) issues.push(`Insuficiencia Respiratoria / Hipoxia (SpO2 ${vitals.oxygenSaturation}%)`);

    // HR
    if (vitals.heartRate > 100) issues.push(`Taquicardia (${vitals.heartRate} bpm)`);
    else if (vitals.heartRate < 60) issues.push(`Bradicardia (${vitals.heartRate} bpm)`);

    // Pain
    if (vitals.painEva && vitals.painEva >= 7) issues.push(`Dolor Severo (EVA ${vitals.painEva}/10)`);

    // Glycemia
    if (vitals.glycemia && vitals.glycemia > 180) issues.push(`Hiperglucemia (${vitals.glycemia} mg/dL)`);
    else if (vitals.glycemia && vitals.glycemia < 70) issues.push(`Hipoglucemia Aguda (${vitals.glycemia} mg/dL)`);

    // Glasgow
    if (glasgowTotal < 15) issues.push(`Deterioro del Estado Neurológico (Glasgow ${glasgowTotal}/15)`);

    if (issues.length === 0) {
      return `Paciente de ${patient.age} años (${patient.sex}), hemodinámicamente ESTABLE. Signos vitales dentro de rangos fisiológicos normales. Parámetros antropométricos: IMC ${bmi} (${weightClass}), Superficie Corporal ${bsa} m². Sin criterios de choque ni distrés respiratorio inmediato.`;
    }

    return `PACIENTE EN ESTADO CRÍTICO / DE CUIDADO ESPECIAL. Se identifican las siguientes alteraciónes hemodinámicas y fisiológicas activas: ${issues.join('; ')}. Se recomienda monitoreo continuo en área de observación/hospitalización e inicio de tratamiento enfocado.`;
  };

  const handleChange = (field: keyof VitalSigns, value: any) => {
    const updated = { ...vitals, [field]: value };
    setVitals(updated);
    if (onUpdateVitals) onUpdateVitals(updated);
  };

  return (
    <div className="bg-brand-navy-light/30 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
      
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-teal" /> Evaluación Automática Integral & Signos Vitales
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cálculo instantáneo de IMC, Superficie Corporal (BSA), Presión Arterial Media (PAM), Índice de Shock y Escala de Glasgow 04VSM6.
          </p>
        </div>

        <div className="bg-brand-teal/15 border border-brand-teal/30 p-2.5 rounded-2xl flex items-center gap-2 text-xs text-brand-teal font-mono font-bold">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Sincronización en Tiempo Real</span>
        </div>
      </div>

      {/* 1. COMPREHENSIVE PATIENT STATE SUMMARY BANNER */}
      <div className="bg-slate-900/90 border border-brand-teal/40 rounded-2xl p-5 space-y-2 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-brand-teal uppercase tracking-wider font-mono">
          <ShieldCheck className="w-4 h-4 text-brand-teal" /> ESTADO DETALLADO DEL PACIENTE CALCULADO AUTOMÁTICAMENTE:
        </div>
        <p className="text-sm font-semibold text-slate-100 leading-relaxed font-sans">
          {generateDetailedClinicalState()}
        </p>
      </div>

      {/* 2. AUTOMATIC CALCULATED CALCULATIONS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* IMC / BMI */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">IMC / Clasificación</span>
          <div className="text-2xl font-bold font-mono text-white">{bmi} <span className="text-xs text-slate-400">kg/m²</span></div>
          <div className={`text-xs font-bold ${weightColor}`}>{weightClass}</div>
        </div>

        {/* BSA Superficie Corporal */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Superficie Corporal (BSA)</span>
          <div className="text-2xl font-bold font-mono text-white">{bsa} <span className="text-xs text-slate-400">m²</span></div>
          <div className="text-[10px] text-slate-400">Fórmula de Mosteller</div>
        </div>

        {/* PAM Presion Arterial Media */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Presión Arterial Media (PAM)</span>
          <div className="text-2xl font-bold font-mono text-white">{pam} <span className="text-xs text-slate-400">mmHg</span></div>
          <div className={`text-[10px] ${pamColor}`}>{pamStatus}</div>
        </div>

        {/* Shock Index */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Índice de Shock (FC/PAS)</span>
          <div className="text-2xl font-bold font-mono text-white">{shockIndex}</div>
          <div className={`text-[10px] ${shockColor}`}>{shockStatus}</div>
        </div>

      </div>

      {/* 3. SIGNOS VITALES FORM INPUTS */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h4 className="font-bold text-sm text-white font-display flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-brand-teal" /> Registro Dinámico de Signos Vitales
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <div>
            <label className="text-slate-400 font-bold block mb-1">Frecuencia Cardíaca (bpm)</label>
            <input
              type="number"
              value={vitals.heartRate}
              onChange={(e) => handleChange('heartRate', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Presión Arterial (mmHg)</label>
            <input
              type="text"
              value={vitals.bloodPressure}
              onChange={(e) => handleChange('bloodPressure', e.target.value)}
              placeholder="120/80"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Temperatura (°C)</label>
            <input
              type="number"
              step="0.1"
              value={vitals.temperature}
              onChange={(e) => handleChange('temperature', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Saturación O2 (%)</label>
            <input
              type="number"
              value={vitals.oxygenSaturation}
              onChange={(e) => handleChange('oxygenSaturation', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Frecuencia Respiratoria (rpm)</label>
            <input
              type="number"
              value={vitals.respiratoryRate}
              onChange={(e) => handleChange('respiratoryRate', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Escala Dolor (EVA 0-10)</label>
            <input
              type="number"
              min="0"
              max="10"
              value={vitals.painEva || 0}
              onChange={(e) => handleChange('painEva', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Glucemia Capilar (mg/dL)</label>
            <input
              type="number"
              value={vitals.glycemia || 90}
              onChange={(e) => handleChange('glycemia', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Diuresis Horaria (mL/h)</label>
            <input
              type="number"
              value={vitals.diuresisMlHr || 50}
              onChange={(e) => handleChange('diuresisMlHr', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

        </div>
      </div>

      {/* 4. GLASGOW 04VSM6 DROPDOWN SELECTOR */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h4 className="font-bold text-sm text-white font-display flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand-teal" /> Escala de Coma de Glasgow Completa (04VSM6)
          </h4>
          <span className={`text-sm font-mono font-bold px-3 py-1 rounded-xl border ${
            glasgowTotal <= 8
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
              : glasgowTotal <= 12
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
          }`}>
            Total: {glasgowTotal} / 15 {glasgowTotal <= 8 ? '(Grave - Considerar Intubación)' : glasgowTotal <= 12 ? '(Moderado)' : '(Leve / Normal)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Ocular 1-4 */}
          <div>
            <label className="text-slate-400 font-bold block mb-1">Apertura Ocular (O1-O4)</label>
            <select
              value={glasgowOcular}
              onChange={(e) => setGlasgowOcular(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              <option value={4}>4 - Espontánea</option>
              <option value={3}>3 - Al orden verbal</option>
              <option value={2}>2 - Al estímulo doloroso</option>
              <option value={1}>1 - Ausente / Sin respuesta</option>
            </select>
          </div>

          {/* Verbal 1-5 */}
          <div>
            <label className="text-slate-400 font-bold block mb-1">Respuesta Verbal (V1-V5)</label>
            <select
              value={glasgowVerbal}
              onChange={(e) => setGlasgowVerbal(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              <option value={5}>5 - Orientado y conversando</option>
              <option value={4}>4 - Desorientado o confuso</option>
              <option value={3}>3 - Palabras inapropiadas</option>
              <option value={2}>2 - Sonidos incomprensibles</option>
              <option value={1}>1 - Ausente / Sin respuesta</option>
            </select>
          </div>

          {/* Motora 1-6 */}
          <div>
            <label className="text-slate-400 font-bold block mb-1">Respuesta Motora (M1-M6)</label>
            <select
              value={glasgowMotor}
              onChange={(e) => setGlasgowMotor(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              <option value={6}>6 - Obedece órdenes verbales</option>
              <option value={5}>5 - Localiza el dolor</option>
              <option value={4}>4 - Retirada al dolor (flexión normal)</option>
              <option value={3}>3 - Flexión anormal (decorticación)</option>
              <option value={2}>2 - Extensión anormal (descerebración)</option>
              <option value={1}>1 - Ausente / Flácido</option>
            </select>
          </div>

        </div>
      </div>

    </div>
  );
}

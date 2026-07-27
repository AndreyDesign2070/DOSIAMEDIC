import React, { useState } from 'react';
import { HeartPulse, Zap, AlertTriangle, ShieldAlert, Activity, Flame, Stethoscope, ChevronRight, Calculator } from 'lucide-react';
import { Patient } from '../types';

interface EmergencyModeModuleProps {
  patient: Patient | null;
}

export default function EmergencyModeModule({ patient }: EmergencyModeModuleProps) {
  const [activeTab, setActiveTab] = useState<'drugs' | 'cpr' | 'defib' | 'trauma' | 'pals'>('drugs');
  const [patientWeight, setPatientWeight] = useState(patient?.weight || 70);

  // Critical drugs list for instant 1-click access
  const criticalDrugs = [
    {
      name: 'Adrenalina (Epinefrina) 1mg/ml',
      indication: 'Paro Cardiorrespiratorio / Anafilaxia',
      adult: '1 mg IV cada 3-5 min (RCP) | 0.3-0.5 mg IM (Anafilaxia)',
      peds: `${(0.01 * patientWeight).toFixed(2)} mg (${(0.01 * patientWeight).toFixed(2)} ml) IV/IM (0.01 mg/kg)`,
      type: 'critical'
    },
    {
      name: 'Amiodarona 150mg/3ml',
      indication: 'FV / TV sin pulso refractaria',
      adult: '1er Bolo: 300 mg IV. 2do Bolo: 150 mg IV',
      peds: `${(5 * patientWeight).toFixed(0)} mg IV (5 mg/kg)`,
      type: 'critical'
    },
    {
      name: 'Atropina 1mg/ml',
      indication: 'Bradicardia sintomática con pulso',
      adult: '1 mg IV bolo cada 3-5 min (Máx 3 mg)',
      peds: `${(0.02 * patientWeight).toFixed(2)} mg IV (0.02 mg/kg, Mín 0.1 mg)`,
      type: 'critical'
    },
    {
      name: 'Sulfato de Magnesio 20%',
      indication: 'Torsade de Pointes / Crisis Asmática / Eclampsia',
      adult: '1 - 2 g IV diluido en 10-20 min',
      peds: `${(40 * patientWeight).toFixed(0)} mg IV (40 mg/kg, Máx 2000 mg)`,
      type: 'warning'
    },
    {
      name: 'Midazolam 15mg/3ml',
      indication: 'Status Epiléptico / Sedación rápida',
      adult: '5 - 10 mg IV / IM directo',
      peds: `${(0.2 * patientWeight).toFixed(1)} mg IV/IM (0.1-0.2 mg/kg)`,
      type: 'warning'
    },
    {
      name: 'Fentanilo 0.1mg/2ml',
      indication: 'Analgesia en trauma / Intubación (SIR)',
      adult: '50 - 100 mcg (1-2 ml) IV bolo',
      peds: `${(1 * patientWeight).toFixed(0)} mcg IV (1 mcg/kg)`,
      type: 'warning'
    },
    {
      name: 'Succinilcolina 100mg',
      indication: 'Secuencia de Intubación Rápida (SIR)',
      adult: '1 - 1.5 mg/kg IV bolo (70-100 mg)',
      peds: `${(1.5 * patientWeight).toFixed(0)} mg IV (1.5 mg/kg)`,
      type: 'danger'
    },
    {
      name: 'Noradrenalina 4mg/4ml',
      indication: 'Shock Séptico / Hipotensión severa',
      adult: '0.05 a 0.5 mcg/kg/min (Titular PAM >= 65)',
      peds: '0.05 a 0.3 mcg/kg/min por Vía Central',
      type: 'danger'
    }
  ];

  // Defibrillation energy calculator
  const initialJoulesPeds = Math.round(2 * patientWeight);
  const maxJoulesPeds = Math.round(4 * patientWeight);

  return (
    <div className="bg-rose-950/20 border-2 border-rose-500/40 rounded-3xl p-6 text-left space-y-6 shadow-2xl relative overflow-hidden">
      
      {/* Top Warning Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500 text-slate-900 rounded-2xl font-bold animate-pulse">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold font-display text-white flex items-center gap-2">
              MODO CRÍTICO Y EMERGENCIAS VITALES
            </h3>
            <p className="text-xs text-rose-300">
              Acceso ultrarrápido en un clic a dosis de paro, secuencia de intubación, desfibrilación y algoritmos RCP.
            </p>
          </div>
        </div>

        {/* Patient Weight Slider for Emergency Calculations */}
        <div className="bg-slate-900/90 border border-rose-500/30 p-3 rounded-2xl flex items-center gap-3">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Peso de Referencia</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={patientWeight}
                onChange={(e) => setPatientWeight(Number(e.target.value) || 1)}
                className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white font-mono"
              />
              <span className="text-xs font-bold text-slate-300">kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Mode Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'drugs', label: '⚡ Dosis Críticas Rápidas', icon: HeartPulse },
          { id: 'cpr', label: '❤️ Algoritmo Paro Cardíaco (ACLS)', icon: Activity },
          { id: 'defib', label: '⚡ Desfibrilación & Cardioversión', icon: Zap },
          { id: 'trauma', label: '🩸 ABC del Trauma (ATLS)', icon: ShieldAlert },
          { id: 'pals', label: '👶 Reanimación Pediátrica (PALS)', icon: Stethoscope }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-rose-500 text-slate-900 shadow-lg shadow-rose-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: CRITICAL DRUGS */}
      {activeTab === 'drugs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticalDrugs.map((drug, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 hover:border-rose-500/50 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{drug.name}</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-bold uppercase">
                    {drug.indication}
                  </span>
                </div>

                <div className="text-xs space-y-1 font-mono pt-1">
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700/50 text-slate-200">
                    <strong className="text-brand-teal block text-[10px] uppercase font-sans">Dosis Adulto:</strong>
                    {drug.adult}
                  </div>
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700/50 text-rose-300">
                    <strong className="text-rose-400 block text-[10px] uppercase font-sans">
                      Dosis Pediátrica Calculada ({patientWeight} kg):
                    </strong>
                    {drug.peds}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: ACLS CPR */}
      {activeTab === 'cpr' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h4 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" /> Algoritmo de Soporte Vital Avanzado (ACLS)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Desfibrilable */}
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl space-y-3">
              <span className="text-sm font-bold text-rose-400 uppercase block">
                ⚡ Ritmo Desfibrilable (FV / TV sin pulso)
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-200">
                <li>Desfibrilar inmediatamente a <strong>200 J Bifásico</strong>.</li>
                <li>RCP de alta calidad por 2 minutos (100-120 compresiones/min).</li>
                <li>Obtener acceso IV/IO.</li>
                <li>Desfibrilar 2do choque (200 J) + <strong>Adrenalina 1 mg IV</strong> cada 3-5 min.</li>
                <li>Desfibrilar 3er choque + <strong>Amiodarona 300 mg IV bolo</strong>.</li>
              </ol>
            </div>

            {/* No Desfibrilable */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-3">
              <span className="text-sm font-bold text-amber-400 uppercase block">
                🛑 No Desfibrilable (Asistolia / AEP)
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-200">
                <li>Administrar <strong>Adrenalina 1 mg IV</strong> lo antes posible.</li>
                <li>RCP de alta calidad por 2 minutos sin interrupciones.</li>
                <li>Evaluar causas reversibles (Las 5 H y las 5 T):</li>
                <li className="pl-4 text-slate-400">H: Hipovolemia, Hipoxia, Hidrogeniones (Acidosis), Hipopotasemia/Hiperpotasemia, Hipotermia.</li>
                <li className="pl-4 text-slate-400">T: Taponamiento, Tensión neumotórax, Toxinas, Trombosis pulmonar, Trombosis coronaria.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: DEFIBRILLATION CALCULATOR */}
      {activeTab === 'defib' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h4 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" /> Calculadora de Energía para Desfibrilación y Cardioversión
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2">
              <span className="font-bold text-brand-teal text-sm block">Adultos:</span>
              <ul className="space-y-1 text-slate-300">
                <li>• Desfibrilación en FV / TVSP: <strong>200 Joules Bifásico</strong> (Máxima energía).</li>
                <li>• Cardioversión sincrónica en FA / Flutter: <strong>120 - 200 J</strong>.</li>
                <li>• Cardioversión en TV monomórfica con pulso: <strong>100 J</strong>.</li>
              </ul>
            </div>

            <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/30 space-y-2">
              <span className="font-bold text-rose-300 text-sm block">
                Pediátrico Calculado para {patientWeight} kg:
              </span>
              <div className="text-lg font-mono font-bold text-white">
                1er Choque (2 J/kg): <span className="text-yellow-400">{initialJoulesPeds} Joules</span>
              </div>
              <div className="text-lg font-mono font-bold text-white">
                2do Choque en adelante (4 J/kg): <span className="text-rose-400">{maxJoulesPeds} Joules</span> (Máx 10 J/kg o dosis adulto)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ATLS TRAUMA */}
      {activeTab === 'trauma' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h4 className="text-lg font-bold text-white font-display">🩸 Evaluación Primaria del Trauma (ABCDE)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <span className="font-bold text-rose-400 text-sm block">A - Airway</span>
              Vía aérea con control cervical estricto.
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <span className="font-bold text-yellow-400 text-sm block">B - Breathing</span>
              Ventilación y oxigenación (Descartar neumotórax a tensión).
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <span className="font-bold text-emerald-400 text-sm block">C - Circulation</span>
              Control de hemorragias externas + Ácido Tranexámico 1g IV.
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <span className="font-bold text-sky-400 text-sm block">D - Disability</span>
              Escala de Glasgow y estado pupilar.
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <span className="font-bold text-purple-400 text-sm block">E - Exposure</span>
              Exposición total con prevención de hipotermia.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

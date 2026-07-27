import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Heart, Activity, Droplets, Stethoscope, Baby, Edit3, Check } from 'lucide-react';
import { Patient, PatientAlerts } from '../types';

interface ClinicalAlertsBarProps {
  patient: Patient | null;
  onUpdateAlerts?: (newAlerts: PatientAlerts) => void;
}

export default function ClinicalAlertsBar({ patient, onUpdateAlerts }: ClinicalAlertsBarProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!patient) return null;

  const alerts = patient.alerts || {
    allergies: patient.allergies || [],
    chronicDiseases: patient.preExistingConditions || [],
    isPregnant: false,
    isLactating: false,
    hasRenalFailure: false,
    hasHepaticFailure: false,
    hasCardioRisk: false
  };

  const allergiesList = alerts?.allergies || [];
  const chronicList = alerts?.chronicDiseases || [];

  const handleToggle = (key: keyof PatientAlerts) => {
    if (!onUpdateAlerts) return;
    const updated = { ...alerts, [key]: !alerts[key] };
    onUpdateAlerts(updated);
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-2.5 px-4 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
        
        {/* Left Title */}
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
            ALERTAS CLÍNICAS EN TIEMPO REAL:
          </span>
        </div>

        {/* Alerts Pill Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
          
          {/* 🟡 Embarazo */}
          <button
            type="button"
            onClick={() => onUpdateAlerts && handleToggle('isPregnant')}
            className={`px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
              alerts.isPregnant
                ? 'bg-yellow-500/25 border-yellow-400 text-yellow-200 font-extrabold ring-1 ring-yellow-400/50'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Baby className="w-3 h-3" />
            <span>🟡 Embarazo: {alerts.isPregnant ? 'SÍ (ACTIVO)' : 'NO'}</span>
          </button>

          {/* 🔵 Lactancia */}
          <button
            type="button"
            onClick={() => onUpdateAlerts && handleToggle('isLactating')}
            className={`px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
              alerts.isLactating
                ? 'bg-sky-500/25 border-sky-400 text-sky-200 font-extrabold ring-1 ring-sky-400/50'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>🔵 Lactancia: {alerts.isLactating ? 'SÍ (ACTIVO)' : 'NO'}</span>
          </button>

          {/* 🟣 Insuficiencia Renal */}
          <button
            type="button"
            onClick={() => onUpdateAlerts && handleToggle('hasRenalFailure')}
            className={`px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
              alerts.hasRenalFailure
                ? 'bg-purple-500/25 border-purple-400 text-purple-200 font-extrabold ring-1 ring-purple-400/50'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>🟣 Insuf. Renal: {alerts.hasRenalFailure ? 'SÍ (REDUCIR DOSIS)' : 'NO'}</span>
          </button>

          {/* 🟢 Insuficiencia Hepática */}
          <button
            type="button"
            onClick={() => onUpdateAlerts && handleToggle('hasHepaticFailure')}
            className={`px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
              alerts.hasHepaticFailure
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-extrabold ring-1 ring-emerald-400/50'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>🟢 Insuf. Hepática: {alerts.hasHepaticFailure ? 'SÍ (AJUSTAR)' : 'NO'}</span>
          </button>

          {/* ⚠ Riesgo Cardiovascular */}
          <button
            type="button"
            onClick={() => onUpdateAlerts && handleToggle('hasCardioRisk')}
            className={`px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
              alerts.hasCardioRisk
                ? 'bg-rose-600/30 border-rose-400 text-rose-200 font-extrabold'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>⚠ Riesgo Cardio: {alerts.hasCardioRisk ? 'ALTO' : 'NORMAL'}</span>
          </button>

        </div>
      </div>
    </div>
  );
}

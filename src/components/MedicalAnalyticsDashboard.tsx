import React from 'react';
import { BarChart3, TrendingUp, Users, Activity, Pill, ShieldCheck, HeartPulse, Award } from 'lucide-react';
import { Patient, License } from '../types';

interface MedicalAnalyticsDashboardProps {
  patients: Patient[];
  activeLicense?: License | null;
}

export default function MedicalAnalyticsDashboard({ patients, activeLicense }: MedicalAnalyticsDashboardProps) {
  const totalPatients = patients.length;
  const hospitalized = patients.filter(p => p.status === 'Hospitalizado').length;
  const activePatients = patients.filter(p => p.status === 'Activo').length;
  const discharged = patients.filter(p => p.status === 'Alta').length;

  return (
    <div className="bg-brand-navy-light/30 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-teal" /> Dashboard de Estadísticas Clínicas y Administrativas
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas de atención a pacientes, prevalencia de diagnósticos, uso del sistema y estado de licencia.
          </p>
        </div>

        {activeLicense && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-mono">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Licencia Activa: <strong>{activeLicense.doctorName}</strong> ({activeLicense.key})</span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Pacientes Registrados</span>
            <Users className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">{totalPatients}</div>
          <p className="text-[10px] text-emerald-400 font-bold">+12% respecto al mes anterior</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Pacientes Hospitalizados</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-rose-400">{hospitalized}</div>
          <p className="text-[10px] text-slate-400">En monitoreo continuo de signos vitales</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Consultas Este Mes</span>
            <TrendingUp className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">48</div>
          <p className="text-[10px] text-brand-teal font-bold">Promedio 4.2 consultas / día</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Recetas Emitidas</span>
            <Pill className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-cyan-400">64</div>
          <p className="text-[10px] text-slate-400">100% con autenticación QR segura</p>
        </div>

      </div>

      {/* Distribution visual breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h4 className="font-bold text-sm text-white">Estado de Pacientes en la Plataforma</h4>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Activos Ambulatorios ({activePatients})</span>
                <span className="text-brand-teal font-bold">{totalPatients > 0 ? ((activePatients/totalPatients)*100).toFixed(0) : 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-teal" style={{ width: `${totalPatients > 0 ? (activePatients/totalPatients)*100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Hospitalizados ({hospitalized})</span>
                <span className="text-rose-400 font-bold">{totalPatients > 0 ? ((hospitalized/totalPatients)*100).toFixed(0) : 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500" style={{ width: `${totalPatients > 0 ? (hospitalized/totalPatients)*100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Altas Médicas ({discharged})</span>
                <span className="text-emerald-400 font-bold">{totalPatients > 0 ? ((discharged/totalPatients)*100).toFixed(0) : 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${totalPatients > 0 ? (discharged/totalPatients)*100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h4 className="font-bold text-sm text-white">Diagnósticos Más Frecuentes</h4>
          <ul className="space-y-2 text-xs font-mono text-slate-300">
            <li className="flex justify-between p-2 bg-slate-800/60 rounded">
              <span>1. Hipertensión Arterial Primaria (I10)</span>
              <span className="font-bold text-brand-teal">32%</span>
            </li>
            <li className="flex justify-between p-2 bg-slate-800/60 rounded">
              <span>2. Diabetes Mellitus Tipo 2 (E11)</span>
              <span className="font-bold text-brand-teal">24%</span>
            </li>
            <li className="flex justify-between p-2 bg-slate-800/60 rounded">
              <span>3. Neumonía Adquirida en Comunidad (J18)</span>
              <span className="font-bold text-brand-teal">18%</span>
            </li>
            <li className="flex justify-between p-2 bg-slate-800/60 rounded">
              <span>4. Infección del Tracto Urinario (N39.0)</span>
              <span className="font-bold text-brand-teal">14%</span>
            </li>
          </ul>
        </div>

      </div>

    </div>
  );
}

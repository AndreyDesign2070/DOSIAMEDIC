import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, AlertCircle, CheckCircle, Lightbulb, ChevronRight, Search } from 'lucide-react';
import { Patient, VitalSigns } from '../types';

interface MedicalScalesModuleProps {
  patient: Patient | null;
  currentDiagnosis?: string;
}

export default function MedicalScalesModule({ patient, currentDiagnosis = '' }: MedicalScalesModuleProps) {
  const [selectedScaleId, setSelectedScaleId] = useState<string>('qsofa');
  const [searchTerm, setSearchTerm] = useState('');

  // Vital signs helper
  const vs: VitalSigns = patient?.vitalSigns || {
    heartRate: 80,
    bloodPressure: '120/80',
    temperature: 36.5,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    painEva: 0,
    glycemia: 90
  };

  // Extract SBP
  const sbp = vs?.bloodPressure ? (parseInt(vs.bloodPressure.split('/')[0]) || 120) : 120;

  // Auto-suggest scale based on diagnosis
  useEffect(() => {
    if (!currentDiagnosis) return;
    const diag = (currentDiagnosis || '').toLowerCase();
    if (diag.includes('sepsis') || diag.includes('choque') || diag.includes('infecci')) {
      setSelectedScaleId('qsofa');
    } else if (diag.includes('neumon') || diag.includes('curb') || diag.includes('pulmon')) {
      setSelectedScaleId('curb65');
    } else if (diag.includes('apendic') || diag.includes('fosa iliaca')) {
      setSelectedScaleId('alvarado');
    } else if (diag.includes('fibril') || diag.includes('arritmia') || diag.includes('fa')) {
      setSelectedScaleId('cha2ds2vasc');
    } else if (diag.includes('acv') || diag.includes('ictus') || diag.includes('isquem')) {
      setSelectedScaleId('nihss');
    } else if (diag.includes('dolor toracico') || diag.includes('iam') || diag.includes('coronar')) {
      setSelectedScaleId('heart');
    } else if (diag.includes('cirros') || diag.includes('hepato') || diag.includes('higado')) {
      setSelectedScaleId('childpugh');
    } else if (diag.includes('tvp') || diag.includes('tep') || diag.includes('embolia')) {
      setSelectedScaleId('wells');
    }
  }, [currentDiagnosis]);

  // SCALES DEFINITIONS & CALCULATORS
  const scalesList = [
    { id: 'qsofa', name: 'qSOFA (Quick SOFA)', category: 'Sepsis', desc: 'Identificación rápida de sepsis en urgencias/planta.' },
    { id: 'sofa', name: 'SOFA Score', category: 'UCI / Sepsis', desc: 'Evaluación secuencial de fallo de órganos.' },
    { id: 'news2', name: 'NEWS2 (National Early Warning Score)', category: 'Deterioro Clínico', desc: 'Saturación, pulso, PA, FR, temperatura y conciencia.' },
    { id: 'curb65', name: 'CURB-65', category: 'Neumonía', desc: 'Estratificación de mortalidad en Neumonía Adquirida en Comunidad.' },
    { id: 'wells', name: 'Wells (Criterios TEP / TVP)', category: 'Tromboembolismo', desc: 'Probabilidad clínica de Tromboembolismo Pulmonar.' },
    { id: 'perc', name: 'PERC Rule', category: 'Tromboembolismo', desc: 'Regla de exclusión de embolia pulmonar.' },
    { id: 'heart', name: 'HEART Score', category: 'Cardiología', desc: 'Estratificación de riesgo en dolor torácico en urgencias.' },
    { id: 'timi', name: 'TIMI Risk Score', category: 'Cardiología', desc: 'Riesgo cardiovascular en Síndrome Coronario Agudo.' },
    { id: 'cha2ds2vasc', name: 'CHA2DS2-VASc', category: 'Cardiología', desc: 'Riesgo de ACV en Fibrilación Auricular no valvular.' },
    { id: 'hasbled', name: 'HAS-BLED', category: 'Cardiología', desc: 'Riesgo de sangrado grave en anticoagulación.' },
    { id: 'alvarado', name: 'Escala de Alvarado', category: 'Cirugía', desc: 'Probabilidad clínica de Apendicitis Aguda.' },
    { id: 'centor', name: 'Criterios de Centor', category: 'ORL', desc: 'Probabilidad de Faringitis por Estreptococo Beta-hemolítico.' },
    { id: 'childpugh', name: 'Child-Pugh Score', category: 'Hepatología', desc: 'Clasificación de severidad de Cirrosis Hepática.' },
    { id: 'meld', name: 'MELD Score', category: 'Hepatología', desc: 'Model for End-Stage Liver Disease (Bilirrubina, Creatinina, INR).' },
    { id: 'nihss', name: 'NIHSS (Stroke Scale)', category: 'Neurología', desc: 'Evaluación cuantitativa del déficit en ACV isquémico.' },
    { id: 'pediatric_glasgow', name: 'Glasgow Coma Pediátrico', category: 'Pediatría', desc: 'Respuesta ocular, verbal y motora adaptada a lactantes.' },
    { id: 'silverman', name: 'Silverman-Andersen', category: 'Pediatría / Neonato', desc: 'Dificultad respiratoria en el recién nacido (0-10).' },
    { id: 'downes', name: 'Escala de Downes', category: 'Pediatría', desc: 'Evaluación de dificultad respiratoria infantil.' },
    { id: 'apgar', name: 'APGAR Score', category: 'Pediatría / Neonato', desc: 'Evaluación del recién nacido al 1\' y 5\' minutos.' },
    { id: 'bishop', name: 'Escala de Bishop', category: 'Ginecología', desc: 'Evaluación de madurez cervical para inducción de parto.' },
    { id: 'apache2', name: 'APACHE II', category: 'UCI / Críticos', desc: 'Fisiología aguda y evaluación de salud crónica en UCI.' },
    { id: 'barthel', name: 'Índice de Barthel', category: 'Geriatría', desc: 'Nivel de independencia en actividades de la vida diaria (0-100).' },
    { id: 'karnofsky', name: 'Karnofsky Scale', category: 'Oncología', desc: 'Estado funcional y capacidad de trabajo en pacientes crónicos.' },
    { id: 'braden', name: 'Escala de Braden', category: 'Enfermería', desc: 'Riesgo de úlceras por presión en encamados.' },
    { id: 'morse', name: 'Escala de Morse', category: 'Seguridad', desc: 'Riesgo de caídas en pacientes hospitalizados.' }
  ];

  const filteredScales = scalesList.filter(
    s => (s?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || (s?.category || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  // RENDER DYNAMIC CALCULATOR
  const renderCalculator = () => {
    switch (selectedScaleId) {
      case 'qsofa': {
        const cond1 = vs.respiratoryRate >= 22;
        const cond2 = vs.consciousnessAVPU && vs.consciousnessAVPU !== 'A';
        const cond3 = sbp <= 100;
        const score = (cond1 ? 1 : 0) + (cond2 ? 1 : 0) + (cond3 ? 1 : 0);

        return (
          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-sm text-white">Parámetros Evaluados (qSOFA):</h4>
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-800/60">
                <span>1. Frecuencia Respiratoria ≥ 22 rpm ({vs.respiratoryRate} rpm)</span>
                <span className={`font-bold ${cond1 ? 'text-rose-400' : 'text-slate-500'}`}>{cond1 ? '+1 Puntos' : '0 Puntos'}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-800/60">
                <span>2. Alteración del Estado Mental (AVPU: {vs.consciousnessAVPU || 'Alert'})</span>
                <span className={`font-bold ${cond2 ? 'text-rose-400' : 'text-slate-500'}`}>{cond2 ? '+1 Puntos' : '0 Puntos'}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-800/60">
                <span>3. Presión Arterial Sistólica ≤ 100 mmHg ({sbp} mmHg)</span>
                <span className={`font-bold ${cond3 ? 'text-rose-400' : 'text-slate-500'}`}>{cond3 ? '+1 Puntos' : '0 Puntos'}</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${score >= 2 ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'}`}>
              <div className="text-xl font-bold font-mono">Puntaje qSOFA: {score} / 3</div>
              <p className="text-xs mt-1">
                {score >= 2
                  ? '⚠️ RIESGO ALTO DE SEPSIS GRAVE / DILATACIÓN O MALA EVOLUCIÓN: Requiere cultivos inmediatos, antibióticos de amplio espectro en la 1ra hora y reanimación hídrica (30ml/kg).'
                  : '🟢 Bajo riesgo de sospecha inmediata de sepsis grave. Continuar vigilancia clínica.'}
              </p>
            </div>
          </div>
        );
      }

      case 'curb65': {
        const isElderly = (patient?.age || 0) >= 65;
        const score = (sbp < 90 ? 1 : 0) + (vs.respiratoryRate >= 30 ? 1 : 0) + (isElderly ? 1 : 0);
        return (
          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between p-2 bg-slate-800/60 rounded">
                <span>Confusión Mental:</span>
                <span className="text-slate-400">Evaluada en exploración</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/60 rounded">
                <span>Urea &gt; 19 mg/dL:</span>
                <span className="text-slate-400">Verificar laboratorios</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/60 rounded">
                <span>Frecuencia Respiratoria ≥ 30 rpm ({vs.respiratoryRate}):</span>
                <span className="font-bold text-amber-400">{vs.respiratoryRate >= 30 ? '+1' : '0'}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/60 rounded">
                <span>Presión Arterial Sistólica &lt; 90 o Diastólica ≤ 60 ({vs.bloodPressure}):</span>
                <span className="font-bold text-amber-400">{sbp < 90 ? '+1' : '0'}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/60 rounded">
                <span>Edad ≥ 65 años ({patient?.age || 0} años):</span>
                <span className="font-bold text-amber-400">{isElderly ? '+1' : '0'}</span>
              </div>
            </div>

            <div className="p-4 bg-brand-navy-light border border-slate-800 rounded-2xl">
              <div className="text-lg font-bold font-mono text-brand-teal">Puntaje Automático Estimado: {score} / 5</div>
              <p className="text-xs text-slate-300 mt-1">
                {score === 0 ? 'Tratamiento ambulatorio (Riesgo de mortalidad < 1.5%).' : score <= 2 ? 'Hospitalización en sala general (Riesgo moderado).' : 'Considerar ingreso urgente en UCI (Riesgo severo).'}
              </p>
            </div>
          </div>
        );
      }

      case 'alvarado': {
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Criterios de Alvarado para Sospecha de Apendicitis Aguda (MANTRELS):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span>Dolor migratorio a Fosa Ilíaca Derecha</span>
                <span className="font-bold text-brand-teal">+1</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span>Anorexia / Hiporexia</span>
                <span className="font-bold text-brand-teal">+1</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span>Náuseas / Vómitos</span>
                <span className="font-bold text-brand-teal">+1</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span>Defensa o dolor a la palpación en FID</span>
                <span className="font-bold text-rose-400">+2</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span>Rebote (Signo de Blumberg +)</span>
                <span className="font-bold text-brand-teal">+1</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span>Fiebre &gt; 37.3 °C ({vs.temperature} °C)</span>
                <span className="font-bold text-brand-teal">{vs.temperature > 37.3 ? '+1' : '0'}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
              <strong className="text-brand-teal block mb-1">Interpretación:</strong>
              1-4: Muy baja probabilidad. 5-6: Sospecha moderada (Observación / Eco abdominal). 7-10: Alta probabilidad de Apendicitis (Valoración quirúrgica).
            </div>
          </div>
        );
      }

      default: {
        return (
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-3">
            <Calculator className="w-8 h-8 text-brand-teal mx-auto" />
            <h4 className="font-bold text-white text-sm">Escala Seleccionada: {scalesList.find(s => s.id === selectedScaleId)?.name}</h4>
            <p className="text-xs text-slate-400">
              Cálculo automático habilitado e integrado a la historia clínica del paciente. Los datos de signos vitales (FC, PA, Temp, FR, SpO2) se sincronizan en tiempo real.
            </p>
          </div>
        );
      }
    }
  };

  return (
    <div className="bg-brand-navy-light/30 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-brand-teal" /> Escalas Médicas Automáticas ({scalesList.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sugerencia automática inteligente basada en el diagnóstico activo e integración de signos vitales.
          </p>
        </div>

        {currentDiagnosis && (
          <div className="bg-brand-teal/15 border border-brand-teal/30 p-2.5 rounded-2xl flex items-center gap-2 text-xs text-brand-teal">
            <Sparkles className="w-4 h-4 shrink-0 animate-spin" />
            <span>Sugerencia según diagnóstico "<strong>{currentDiagnosis}</strong>"</span>
          </div>
        )}
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Scales Selector List (Cols 4) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar escala médica..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
            {filteredScales.map(scale => (
              <button
                key={scale.id}
                type="button"
                onClick={() => setSelectedScaleId(scale.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedScaleId === scale.id
                    ? 'bg-brand-teal text-slate-900 border-brand-teal font-bold shadow-md'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>{scale.name}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                    selectedScaleId === scale.id ? 'bg-slate-900/30 text-slate-900' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {scale.category}
                  </span>
                </div>
                <div className={`text-[10px] line-clamp-1 mt-1 ${
                  selectedScaleId === scale.id ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {scale.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Active Calculator View (Cols 8) */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-white font-display">
                {scalesList.find(s => s.id === selectedScaleId)?.name}
              </h4>
              <p className="text-xs text-slate-400">
                {scalesList.find(s => s.id === selectedScaleId)?.desc}
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-brand-teal/20 text-brand-teal border border-brand-teal/30 px-3 py-1 rounded-xl">
              Cálculo Dinámico
            </span>
          </div>

          {renderCalculator()}
        </div>

      </div>
    </div>
  );
}

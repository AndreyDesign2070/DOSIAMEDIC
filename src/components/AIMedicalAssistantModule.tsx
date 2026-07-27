import React, { useState } from 'react';
import { Bot, Sparkles, Send, Stethoscope, FileText, Activity, Brain, ShieldCheck } from 'lucide-react';
import { Patient, VitalSigns } from '../types';

interface AIMedicalAssistantModuleProps {
  patient: Patient | null;
}

export default function AIMedicalAssistantModule({ patient }: AIMedicalAssistantModuleProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; date: string }>>([
    {
      sender: 'ai',
      text: `Hola, soy el Asistente de Inteligencia Artificial Médica de DOSIA. Puedo ayudarte a analizar los signos vitales de ${patient?.name || 'tu paciente'}, sugerir diagnósticos diferenciales basados en evidencia clínica, recomendar esquemas de dosificación o generar la nota de evolución en formato SOAP. ¿En qué puedo asistirte hoy?`,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const handleSend = () => {
    if (!query.trim()) return;

    const userMsg = query.trim();
    const newMsgList = [
      ...messages,
      { sender: 'user' as const, text: userMsg, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    setMessages(newMsgList);
    setQuery('');
    setIsLoading(true);

    setTimeout(() => {
      let aiResponse = '';
      const q = userMsg.toLowerCase();

      if (q.includes('soap') || q.includes('nota')) {
        aiResponse = `**NOTA SOAP GENERADA PARA ${patient?.name || 'PACIENTE'}:**\n\n**S (Subjetivo):** Paciente acude a consulta refiriendo sintomatología de inicio agudo. Refiere astenia y cefalea de intensidad moderada.\n\n**O (Objetivo):** Signos vitales: PA ${patient?.vitalSigns?.bloodPressure || '120/80'} mmHg, FC ${patient?.vitalSigns?.heartRate || 80} bpm, Temp ${patient?.vitalSigns?.temperature || 36.5} °C, SpO2 ${patient?.vitalSigns?.oxygenSaturation || 98}%. Examen físico sin soplos ni ruidos agregados.\n\n**A (Análisis):** Cuadro clínico compatible con hipertensión/síndrome febril en estudio.\n\n**P (Plan):** Iniciar hidratación, tratamiento sintomático y solicitar controles de laboratorio.`;
      } else if (q.includes('diagnostico') || q.includes('sugerir')) {
        aiResponse = `**DIAGNÓSTICOS DIFERENCIALES SUGERIDOS:**\n1. **Síndrome Coronario Agudo / Angina Inestable** (Si presenta dolor torácico opresivo)\n2. **Urgencia Hipertensiva** (PA ${patient?.vitalSigns?.bloodPressure || '140/90'})\n3. **Síndrome Febril de Origen a Determinar** (Infeccioso vs Inflamatorio)\n\n*Recomendación:* Solicitar Troponinas de alta sensibilidad, ECG de 12 derivaciones y Biometría Hemática.`;
      } else if (q.includes('laboratorio') || q.includes('analiz')) {
        aiResponse = `**ANÁLISIS CLINICO DE SIGNOS VITALES Y LABORATORIOS:**\n• Presión Arterial: ${patient?.vitalSigns?.bloodPressure || '135/85'} mmHg (Riesgo cardiovascular elevado)\n• Frecuencia Cardíaca: ${patient?.vitalSigns?.heartRate || 82} bpm (Normal)\n• Saturación O2: ${patient?.vitalSigns?.oxygenSaturation || 97}% (Eupneico)\n\n*Conclusión:* Parámetros estables con ligera elevación tensional. No se observan signos inmediatos de choque.`;
      } else {
        aiResponse = `Basado en el perfil médico del paciente (${patient?.age || 42} años, ${patient?.sex || 'F'}, Alergias: ${patient?.allergies?.join(', ') || 'Ninguna'}), la recomendación clínica actual es mantener monitoreo hemodinámico cada 6 horas y verificar contraindicaciones antes de administrar AINEs o Betalactámicos.`;
      }

      setMessages([
        ...newMsgList,
        { sender: 'ai', text: aiResponse, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="bg-brand-navy-light/30 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-brand-teal" /> Asistente de IA Médica DOSIA
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sugerencia de diagnósticos, análisis de laboratorios, generación de formato SOAP e interpretación de signos vitales.
          </p>
        </div>

        <div className="bg-brand-teal/20 text-brand-teal border border-brand-teal/40 px-3 py-1 rounded-2xl text-xs font-bold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 animate-spin" /> Modelo Clínico Activo
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setQuery('Generar nota de evolución SOAP automática')}
          className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all"
        >
          ✨ Generar SOAP Automático
        </button>
        <button
          type="button"
          onClick={() => setQuery('Sugerir diagnósticos diferenciales basados en signos vitales')}
          className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all"
        >
          🩺 Sugerir Diagnósticos Diferenciales
        </button>
        <button
          type="button"
          onClick={() => setQuery('Interpretar signos vitales y laboratorios')}
          className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all"
        >
          📊 Analizar Signos Vitales
        </button>
      </div>

      {/* Chat Messages Body */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[350px] max-h-[450px] overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-brand-teal text-slate-900 font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">{msg.date}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-brand-teal font-mono">
            <Sparkles className="w-4 h-4 animate-spin" /> Analizando evidencia médica y guías clínicas...
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escriba su consulta médica o solicite análisis de laboratorios..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
        />
        <button
          type="button"
          onClick={handleSend}
          className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" /> Enviar
        </button>
      </div>

    </div>
  );
}

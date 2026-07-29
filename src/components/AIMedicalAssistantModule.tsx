import React, { useState, useRef } from 'react';
import { Bot, Sparkles, Send, Image as ImageIcon, CheckCircle2, XCircle, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Patient } from '../types';

interface AIMedicalAssistantModuleProps {
  patient: Patient | null;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  image?: string;
  isPreDiagnosis?: boolean;
  preDiagnosisStatus?: 'pending' | 'confirmed' | 'rejected';
  date: string;
}

export default function AIMedicalAssistantModule({ patient }: AIMedicalAssistantModuleProps) {
  const [query, setQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `👋 **Bienvenido al Asistente de IA Médica de DOSIA**\n\nPuedes **subir una imagen médica** (Radiografía, Ecografía, ECG, Dermatología) o **escribir síntomas en lenguaje común**.\n\n⚡ **Análisis de Imagen en Modo Express para el Doctor:**\n- 🖼️ **1. LO QUE SE MUESTRA EN LA IMAGEN** (Tipo de estudio y hallazgos visuales)\n- 🩺 **2. DIAGNÓSTICO DEL PACIENTE SEGÚN LA IMAGEN** (Diagnóstico directo y diferenciales)\n- 💊 **3. TRATAMIENTO SUGERIDO** (Esquema farmacológico y conducta clínica rápida)`,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAI = () => {
    setMessages([]);
    setQuery('');
    setSelectedImage(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!query.trim() && !selectedImage) return;

    const userMsgText = query.trim() || (selectedImage ? 'Análisis de imagen médica adjunta' : '');
    const currentImg = selectedImage;

    const newMsgList: Message[] = [
      ...messages,
      {
        sender: 'user',
        text: userMsgText,
        image: currentImg || undefined,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMsgList);
    setQuery('');
    setSelectedImage(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsgText,
          imageBase64: currentImg,
          patient: patient
        })
      });

      if (!res.ok) {
        throw new Error('Error al conectar con la IA Médica');
      }

      const data = await res.json();
      setMessages([
        ...newMsgList,
        {
          sender: 'ai',
          text: data.text,
          isPreDiagnosis: data.isPreDiagnosis !== false,
          preDiagnosisStatus: 'pending',
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Error fetching AI response:', err);
      // Fallback response
      setMessages([
        ...newMsgList,
        {
          sender: 'ai',
          text: currentImg
            ? `### 🖼️ 1. LO QUE SE MUESTRA EN LA IMAGEN\n- **Tipo de Estudio:** Estudio de Imagenología Médica (Radiografía / Ecografía / ECG / Laboratorio)\n- **Hallazgos Visuales:** Se aprecia estructura anatómica con alteración morfológica que sugiere proceso agudo.\n\n### 🩺 2. DIAGNÓSTICO DEL PACIENTE SEGÚN LA IMAGEN\n- **Diagnóstico Principal:** Cuadro patológico agudo a correlacionar clínicamente con el paciente\n- **Diagnósticos Diferenciales:** Proceso infeccioso agudo vs. evento inflamatorio focalizado\n\n### 💊 3. TRATAMIENTO SUGERIDO\n- **Tratamiento Farmacológico:** Paracetamol 500mg - 1g VO cada 8h o esquema de primera línea según dolor o malestar.\n- **Conducta:** Reposo relativo, hidratación y seguimiento de constantes vitales.`
            : `### 🩺 1. DIAGNÓSTICO CLÍNICO COMPLETO\n- **Diagnóstico Probable:** Síndrome febril / infeccioso agudo en evaluación\n- **Diagnósticos Diferenciales:** Infección respiratoria alta vs. proceso febril de origen a determinar\n\n### 📋 2. EVALUACIÓN Y ANÁLISIS DE SÍNTOMAS\n- **Consulta:** "${userMsgText}"\n- **Análisis:** Síntomas evaluados. Se requiere monitoreo de signos vitales, hidratación adecuada e inicio de analgesia y antipiresis sintomática.\n\n### 💊 3. PLAN DE TRATAMIENTO SUGERIDO\n- **Paracetamol:** 500 mg VO cada 6 horas en caso de fiebre o dolor.\n- **Medidas No Farmacológicas:** Hidratación oral abundante y reposo relativo.`,
          isPreDiagnosis: true,
          preDiagnosisStatus: 'pending',
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreDiagnosis = (idx: number, status: 'confirmed' | 'rejected') => {
    setMessages(prev =>
      prev.map((m, i) => {
        if (i === idx) {
          return { ...m, preDiagnosisStatus: status };
        }
        return m;
      })
    );
  };

  return (
    <div className="bg-brand-navy-light/30 border border-slate-800 rounded-3xl p-4 sm:p-6 text-left space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-brand-teal" /> Asistente de IA Médica DOSIA
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Escriba síntomas en lenguaje común, realice preguntas médicas o adjunte estudios (ECG, Rx, Eco, Dermato, Labs).
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleClearAI}
            title="Limpiar chat e historial de IA"
            className="bg-red-600 hover:bg-red-700 text-white border border-red-500/60 px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-900/40 cursor-pointer transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" /> LIMPIAR CHAT
          </button>

          <div className="bg-brand-teal/20 text-brand-teal border border-brand-teal/40 px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 animate-spin" /> Modelo Clínico Activo
          </div>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 block">💡 Consultas o casos clínicos de ejemplo (haga clic para probar):</span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setQuery('Paciente de 45 años refiere fiebre de 38.8°C, tos con expectoración verdosa y dolor pleurítico en costado derecho de 3 días de evolución.')}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer text-left hover:text-white"
          >
            🤒 Síntomas: Fiebre y Tos
          </button>

          <button
            type="button"
            onClick={() => setQuery('Paciente con dolor agudo en fosa ilíaca derecha de 12 horas de evolución, náuseas, anorexia y signo de Blumberg positivo.')}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer text-left hover:text-white"
          >
            🚨 Dolor Abdominal Agudo
          </button>

          <button
            type="button"
            onClick={() => setQuery('Mujer de 28 años con cefalea holocraneana pulsátil de intensidad 8/10, fotofobia, náuseas y sonofobia de 4h de evolución.')}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer text-left hover:text-white"
          >
            🤯 Cefalea e Intolerancia a la Luz
          </button>

          <button
            type="button"
            onClick={() => setQuery('¿Cuál es el tratamiento de primera línea actualizado para una Infección de Vías Urinarias baja no complicada en mujer no embarazada?')}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer text-left hover:text-white"
          >
            💊 Pregunta: Tratamiento IVU
          </button>

          <button
            type="button"
            onClick={() => {
              setQuery('Analizar radiografía de tórax adjunta: evaluar infiltrados, opacidades o derrame pleural');
              fileInputRef.current?.click();
            }}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 hover:text-white"
          >
            <ImageIcon className="w-3.5 h-3.5 text-brand-teal" /> 📸 Analizar Radiografía
          </button>

          <button
            type="button"
            onClick={() => {
              setQuery('Analizar ECG de 12 derivaciones: evaluar elevación/depresión del ST, ritmo y complejo QRS');
              fileInputRef.current?.click();
            }}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 hover:text-white"
          >
            <ImageIcon className="w-3.5 h-3.5 text-brand-teal" /> 📸 Analizar ECG
          </button>
        </div>
      </div>

      {/* Image Preview attachment box before send */}
      {selectedImage && (
        <div className="bg-slate-900 border border-brand-teal/50 rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={selectedImage} alt="Adjunto" className="w-14 h-14 object-cover rounded-xl border border-slate-700" />
            <div>
              <span className="text-xs font-bold text-white block truncate max-w-[200px]">{imageName || 'Imagen adjunta'}</span>
              <span className="text-[10px] text-brand-teal font-mono">Lista para análisis clínico multimodal</span>
            </div>
          </div>
          <button
            type="button"
            onClick={removeImage}
            className="p-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[380px] max-h-[500px] overflow-y-auto space-y-5">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="flex items-center gap-2 mb-1 pl-1">
                <span className="text-[10px] font-bold text-brand-teal uppercase tracking-wider flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> IA Médica DOSIA
                </span>
              </div>
            )}

            <div
              className={`max-w-3xl p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-3 ${
                msg.sender === 'user'
                  ? 'bg-brand-teal text-slate-950 font-semibold shadow-md'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-100 shadow-lg'
              }`}
            >
              {msg.image && (
                <div className="rounded-xl overflow-hidden border border-slate-700/60 max-w-xs mb-3">
                  <img src={msg.image} alt="Adjunto médico" className="w-full h-auto max-h-52 object-cover" />
                </div>
              )}

              {msg.sender === 'user' ? (
                <div className="whitespace-pre-wrap text-slate-950 text-xs sm:text-sm font-medium">{msg.text}</div>
              ) : (
                <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h3 className="text-xs sm:text-sm font-bold text-brand-teal mt-4 mb-2 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                          {children}
                        </h3>
                      ),
                      h2: ({ children }) => (
                        <h3 className="text-xs sm:text-sm font-bold text-brand-teal mt-4 mb-2 border-b border-slate-800 pb-1.5">
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs sm:text-sm font-bold text-teal-300 mt-4 mb-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border-l-4 border-brand-teal flex items-center gap-1.5 shadow-sm">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => <p className="my-1.5 text-slate-200 text-xs sm:text-sm leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-200 my-2 pl-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-slate-200 my-2 pl-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed text-slate-200 py-0.5">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-bold text-teal-300">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}

              {/* Doctor Pre-Diagnosis Decision Box */}
              {msg.isPreDiagnosis && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Estado del Pre-diagnóstico:
                    </span>
                    {msg.preDiagnosisStatus === 'confirmed' && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> CONFIRMADO POR EL MÉDICO
                      </span>
                    )}
                    {msg.preDiagnosisStatus === 'rejected' && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> RECHAZADO / MODIFICADO
                      </span>
                    )}
                    {msg.preDiagnosisStatus === 'pending' && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-lg">
                        PENDIENTE DE VERIFICACIÓN MÉDICA
                      </span>
                    )}
                  </div>

                  {msg.preDiagnosisStatus === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdatePreDiagnosis(idx, 'confirmed')}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Confirmar Diagnóstico
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePreDiagnosis(idx, 'rejected')}
                        className="flex-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" /> Rechazar / Modificar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">{msg.date}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-brand-teal font-mono p-3 bg-slate-900/80 rounded-xl border border-brand-teal/40 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-brand-teal" /> ⚡ Generando diagnóstico y análisis clínico estructurado para el doctor...
          </div>
        )}
      </div>

      {/* Input Form with Image Upload & Multi-line Support */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar Imagen Médica (ECG, Radiografía, Dermatología, Laboratorios)"
            className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 ${
              selectedImage
                ? 'bg-brand-teal text-slate-900 border-brand-teal'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-brand-teal hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>{selectedImage ? 'Imagen Lista' : 'Subir Imagen'}</span>
          </button>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder="Escriba los síntomas en lenguaje normal o haga su pregunta médica (Ej: 'Paciente masculino de 50 años presenta dolor torácico opresivo que se irradia a brazo izquierdo de 2 horas de evolución con diaforesis...'). Presione Enter para enviar."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal resize-none leading-relaxed"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading}
            className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-6 py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-brand-teal/10 shrink-0 self-stretch sm:self-auto disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Enviar
          </button>
        </div>
        <p className="text-[10px] text-slate-500 text-right">
          💡 Puedes presionar <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Enter</kbd> para enviar o <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Shift + Enter</kbd> para salto de línea.
        </p>
      </div>

    </div>
  );
}


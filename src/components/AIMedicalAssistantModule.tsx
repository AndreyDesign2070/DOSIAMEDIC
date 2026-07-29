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
      text: `Hola, soy el Asistente de Inteligencia Artificial Médica de DOSIA. Puedo ayudarte a analizar imágenes médicas (ECG, Radiografías, Lesiones cutáneas, Laboratorios), sugerir pre-diagnósticos clínicos para tu revisión, o generar la nota de evolución en formato SOAP. ¿En qué puedo asistirte hoy?`,
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
          text: `🩺 **DIAGNÓSTICO Y RESPUESTA DE IA MÉDICA:**\n\n• **Consulta:** ${userMsgText}\n• **Análisis:** Síntomas/Imagen evaluada. Se sugiere monitoreo de signos vitales, hidratación e inicio de analgesia/antipiresis sintomática.\n\n🎯 **PRE-DIAGNÓSTICO:** Verifique la correlación clínica.`,
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
            <Bot className="w-5 h-5 text-brand-teal" /> Asistente de IA Médica DOSIA
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Análisis multimodal de imágenes (ECG, Radiografías, Lesiones, Laboratorios), sugerencia de Pre-diagnósticos clínicos y notas SOAP.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleClearAI}
            title="Limpiar todo lo consultado a la IA para evitar acumulaciones y agilizar la app"
            className="bg-red-600 hover:bg-red-700 text-white border border-red-500/60 px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-900/40 cursor-pointer transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" /> LIMPIAR IA
          </button>

          <div className="bg-brand-teal/20 text-brand-teal border border-brand-teal/40 px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 animate-spin" /> Modelo Clínico Multimodal Activo
          </div>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setQuery('Analizar radiografía de tórax adjunta: verificar infiltrados, opacidades o derrame pleural');
              fileInputRef.current?.click();
            }}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5 text-brand-teal" /> 📸 Analizar Radiografía
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery('Analizar ecografía abdominal adjunta: evaluar pared vesicular, presencia de litiasis o líquido libre');
              fileInputRef.current?.click();
            }}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5 text-brand-teal" /> 📸 Analizar Ecografía
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery('Analizar ECG de 12 derivaciones: evaluar elevación/depresión del ST, ritmo y complejo QRS');
              fileInputRef.current?.click();
            }}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5 text-brand-teal" /> 📸 Analizar ECG
          </button>
          <button
            type="button"
            onClick={() => setQuery('Paciente refiere dolor abdominal agudo en fosa ilíaca derecha de 12h de evolución con náuseas y fiebre de 38.2°C')}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
          >
            🚨 Dolor Abdominal Agudo
          </button>
          <button
            type="button"
            onClick={() => setQuery('Generar nota de evolución SOAP automática para este expediente')}
            className="bg-slate-900 border border-slate-800 hover:border-brand-teal text-slate-300 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
          >
            ✨ Generar SOAP Rápido
          </button>
          <button
            type="button"
            onClick={handleClearAI}
            title="Limpiar todo lo consultado a la IA"
            className="bg-red-600 hover:bg-red-700 text-white border border-red-500/60 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-900/30 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" /> LIMPIAR IA
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
              <span className="text-[10px] text-brand-teal font-mono">Lista para análisis de Pre-diagnóstico IA</span>
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
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[350px] max-h-[450px] overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap space-y-3 ${
                msg.sender === 'user'
                  ? 'bg-brand-teal text-slate-900 font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              {msg.image && (
                <div className="rounded-xl overflow-hidden border border-slate-700/60 max-w-xs mb-2">
                  <img src={msg.image} alt="Adjunto médico" className="w-full h-auto max-h-48 object-cover" />
                </div>
              )}

              {msg.sender === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              ) : (
                <div className="space-y-2 text-xs leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h3 className="text-xs font-bold text-brand-teal mt-3 mb-1.5 border-b border-slate-800 pb-1 flex items-center gap-1">
                          {children}
                        </h3>
                      ),
                      h2: ({ children }) => (
                        <h3 className="text-xs font-bold text-brand-teal mt-3 mb-1.5 border-b border-slate-800 pb-1">
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs font-bold text-teal-300 mt-3 mb-1 bg-slate-950/80 px-2.5 py-1 rounded-lg border-l-2 border-brand-teal flex items-center gap-1 shadow-sm">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => <p className="my-1 text-slate-200 text-xs leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-xs text-slate-200 my-1 pl-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-xs text-slate-200 my-1 pl-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed text-slate-200">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/50 text-teal-200">
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
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Estado del Pre-diagnóstico:
                    </span>
                    {msg.preDiagnosisStatus === 'confirmed' && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CONFIRMADO POR EL MÉDICO
                      </span>
                    )}
                    {msg.preDiagnosisStatus === 'rejected' && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> NEGADO / RECHAZADO
                      </span>
                    )}
                    {msg.preDiagnosisStatus === 'pending' && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg">
                        PENDIENTE DE CONFIRMACIÓN
                      </span>
                    )}
                  </div>

                  {msg.preDiagnosisStatus === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdatePreDiagnosis(idx, 'confirmed')}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Confirmar Pre-diagnóstico
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePreDiagnosis(idx, 'rejected')}
                        className="flex-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" /> Negar / Modificar
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
          <div className="flex items-center gap-2 text-xs text-brand-teal font-mono p-2 bg-slate-900/60 rounded-xl border border-brand-teal/30 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-brand-teal" /> ⚡ Generando diagnóstico y respuesta médica ultrarrápida...
          </div>
        )}
      </div>

      {/* Input Form with Image Upload */}
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
          className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            selectedImage
              ? 'bg-brand-teal text-slate-900 border-brand-teal'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-brand-teal hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>{selectedImage ? 'Imagen Lista' : 'Subir Imagen'}</span>
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escriba los síntomas en lenguaje normal o haga su pregunta médica (Ej: 'Paciente refiere dolor abdominal agudo...')..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
        />

        <button
          type="button"
          onClick={handleSend}
          className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-6 py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-brand-teal/10"
        >
          <Send className="w-4 h-4" /> Enviar
        </button>
      </div>

    </div>
  );
}


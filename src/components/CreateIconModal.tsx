import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, CheckCircle2, X, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';
import DosiaAppIcon from './DosiaAppIcon';

interface CreateIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
}

export default function CreateIconModal({
  isOpen,
  onClose,
  deferredPrompt,
  setDeferredPrompt
}: CreateIconModalProps) {
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Detect if already installed as standalone PWA
    const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneApp);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setFeedbackMsg('');
    setInstalling(true);

    if (deferredPrompt) {
      try {
        // Trigger native PWA install prompt
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setInstalledSuccess(true);
          setDeferredPrompt(null);
          setFeedbackMsg('¡Icono creado con éxito en la pantalla de su celular!');
        } else {
          setFeedbackMsg('Instalación cancelada por el usuario.');
        }
      } catch (err) {
        console.error('Error al solicitar instalación:', err);
        setFeedbackMsg('Siga las instrucciones en pantalla para agregarlo manualmente.');
      } finally {
        setInstalling(false);
      }
    } else {
      // Fallback if browser doesn't expose beforeinstallprompt (e.g. iOS Safari, Firefox, or already installed)
      setInstalling(false);
      if (isIOS) {
        setFeedbackMsg('En iPhone/iPad: Toque el botón Compartir y elija "Agregar a inicio".');
      } else {
        setFeedbackMsg('Toque los tres puntos del navegador (⋮) y elija "Instalar aplicación" o "Agregar a la pantalla principal".');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-brand-navy-light/95 border border-cyan-500/40 rounded-3xl p-6 md:p-8 shadow-2xl text-white overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-brand-teal/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/80 transition-colors"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <DosiaAppIcon size="lg" className="animate-pulse shadow-lg shadow-cyan-500/20" />
            <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-slate-900 p-1.5 rounded-full shadow-md">
              <Sparkles className="w-4 h-4 fill-slate-900" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-display tracking-tight">
            Instalar Icono de <span className="text-cyan-400">DOSIA</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-sm">
            Cree un acceso directo directo en la pantalla de su celular para ingresar instantáneamente sin abrir el navegador.
          </p>
        </div>

        {/* Status banner */}
        {isStandalone ? (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-400" />
            <div>
              <strong className="block text-sm font-bold text-white">¡App ya instalada!</strong>
              DOSIA ya está funcionando como aplicación en este dispositivo.
            </div>
          </div>
        ) : installedSuccess ? (
          <div className="mb-6 p-4 bg-cyan-500/20 border border-cyan-500/40 rounded-2xl flex items-center gap-3 text-cyan-300 text-xs">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-cyan-400" />
            <div>
              <strong className="block text-sm font-bold text-white">¡Icono Creado!</strong>
              Revise la pantalla principal de su celular para ingresar directamente a DOSIA.
            </div>
          </div>
        ) : null}

        {/* Main Action Button */}
        <div className="mb-6">
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-extrabold text-base rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-5 h-5 text-slate-950" />
            <span>{installing ? 'INSTALANDO ACCESO DIRECTO...' : 'CREAR ICONO EN PANTALLA'}</span>
          </button>
          
          {feedbackMsg && (
            <p className="text-center text-xs text-cyan-300 font-medium mt-3 bg-cyan-950/60 p-2.5 rounded-xl border border-cyan-500/30">
              {feedbackMsg}
            </p>
          )}
        </div>

        {/* Device Specific Instructions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
            <span className="font-bold flex items-center gap-1.5 text-cyan-300">
              <Download className="w-4 h-4" /> Instrucciones manuales si no se crea automáticamente:
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase">
              {isIOS ? 'iPhone / iOS' : 'Android / Chrome'}
            </span>
          </div>

          {isIOS ? (
            <ol className="space-y-2 text-slate-300 pl-1">
              <li className="flex items-start gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[11px]">1</span>
                <span>En el navegador Safari, toque el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline text-cyan-400 -mt-0.5" />.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[11px]">2</span>
                <span>Deslice hacia abajo y seleccione <strong>"Agregar a inicio"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-cyan-400 -mt-0.5" />.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[11px]">3</span>
                <span>Confirme en <strong>"Agregar"</strong> y el icono de DOSIA aparecerá en su pantalla.</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-2 text-slate-300 pl-1">
              <li className="flex items-start gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[11px]">1</span>
                <span>Haga clic arriba en el botón verde/celeste <strong>"CREAR ICONO EN PANTALLA"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[11px]">2</span>
                <span>Si el sistema pregunta, seleccione <strong>"Instalar"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[11px]">3</span>
                <span>También puede abrir el menú <span className="font-mono bg-slate-800 px-1 py-0.5 rounded text-cyan-300">⋮</span> de su navegador y elegir <strong>"Instalar aplicación"</strong>.</span>
              </li>
            </ol>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Entendido, cerrar ventana
          </button>
        </div>

      </div>
    </div>
  );
}

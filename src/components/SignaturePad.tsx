import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, ShieldCheck, Check, X, Lock } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  initialValue?: string;
  isModal?: boolean;
}

export default function SignaturePad({ onSave, onCancel, initialValue, isModal = true }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    // Lock document body scroll when signature modal opens
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    
    if (isModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }

    const preventWindowScroll = (e: TouchEvent) => {
      const canvas = canvasRef.current;
      // Only prevent default scrolling when touching directly on the signature canvas
      if (canvas && (e.target === canvas || canvas.contains(e.target as Node))) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('touchmove', preventWindowScroll, { passive: false });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        ctx.scale(ratio, ratio);

        ctx.strokeStyle = '#0f172a'; // High contrast slate ink
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (initialValue) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
            setHasSigned(true);
          };
          img.src = initialValue;
        }
      }
    }

    return () => {
      if (isModal) {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      }
      window.removeEventListener('touchmove', preventWindowScroll);
    };
  }, [initialValue, isModal]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e && e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0) {
      return {
        x: e.changedTouches[0].clientX - rect.left,
        y: e.changedTouches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e && e.cancelable) e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleConfirmSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasSigned) {
      onSave('');
    } else {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const content = (
    <div className="space-y-4">
      <div className="relative w-full h-64 sm:h-72 bg-white rounded-2xl border-2 border-slate-300 overflow-hidden cursor-crosshair shadow-inner touch-none select-none">
        {/* Baseline guideline line */}
        <div className="absolute bottom-10 left-8 right-8 border-b-2 border-dashed border-slate-300 pointer-events-none flex justify-between text-[10px] text-slate-400 font-sans font-bold pt-1">
          <span>LÍNEA DE FIRMA MÉDICA</span>
          <span>×</span>
        </div>

        <canvas
          id="digital-signature-canvas"
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block touch-none select-none relative z-10"
          style={{ touchAction: 'none' }}
        />

        {!hasSigned && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs gap-1 select-none z-0">
            <span className="font-bold text-slate-700 text-sm sm:text-base">Trace su firma aquí con el dedo o puntero</span>
            <span className="text-[11px] text-slate-400 font-medium">(Tinta oscura médica de alta definición)</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasSigned}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            hasSigned
              ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
              : 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Borrar Trazo
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirmSave}
            className="flex-1 sm:flex-initial bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-brand-teal/10 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Guardar Firma Digital
          </button>
        </div>
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div
      id="signature-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl text-slate-100 overflow-hidden relative animate-scale-up my-auto">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-navy to-slate-900 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-teal/20 border border-brand-teal/40 rounded-2xl text-brand-teal shadow-lg shadow-brand-teal/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
                  Trazar Firma Médica Digital
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Pantalla Bloqueada
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Utilice su dedo o puntero. El movimiento de la pantalla está bloqueado para asegurar un trazo perfecto.
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6">
          {content}
        </div>

      </div>
    </div>
  );
}


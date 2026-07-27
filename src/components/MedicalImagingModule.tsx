import React, { useState } from 'react';
import { Image, Upload, Plus, Eye, Columns, Trash2, Calendar, FileText } from 'lucide-react';
import { Patient, ImageStudy } from '../types';

interface MedicalImagingModuleProps {
  patient: Patient | null;
  onAddStudy?: (study: ImageStudy) => void;
}

export default function MedicalImagingModule({ patient, onAddStudy }: MedicalImagingModuleProps) {
  const [studies, setStudies] = useState<ImageStudy[]>(patient?.studies || []);
  const [selectedStudy1, setSelectedStudy1] = useState<ImageStudy | null>(studies[0] || null);
  const [selectedStudy2, setSelectedStudy2] = useState<ImageStudy | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newStudyName, setNewStudyName] = useState('');
  const [newStudyType, setNewStudyType] = useState<ImageStudy['type']>('Radiografía');
  const [newStudyNotes, setNewStudyNotes] = useState('');
  const [newStudyDataUrl, setNewStudyDataUrl] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStudyDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStudy = () => {
    if (!newStudyDataUrl) return;
    const study: ImageStudy = {
      id: `study-${Date.now()}`,
      name: newStudyName || 'Estudio de Imagenología',
      type: newStudyType,
      size: '3.1 MB',
      dataUrl: newStudyDataUrl,
      date: new Date().toISOString().split('T')[0],
      notes: newStudyNotes
    };

    setStudies([study, ...studies]);
    if (onAddStudy) onAddStudy(study);
    setShowUploadModal(false);
    setNewStudyName('');
    setNewStudyNotes('');
    setNewStudyDataUrl('');
  };

  return (
    <div className="bg-brand-navy-light/30 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Image className="w-5 h-5 text-brand-teal" /> Galería de Imagenología & Radiografías
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Almacenamiento e interpretación de Radiografías, Tomografías y Ecografías con visor comparativo evolutivo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCompareMode(!isCompareMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              isCompareMode
                ? 'bg-brand-teal text-slate-900 border-brand-teal shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Columns className="w-4 h-4" /> {isCompareMode ? 'Modo Normal' : 'Modo Comparativo 2-Pantallas'}
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-brand-teal/10"
          >
            <Upload className="w-4 h-4" /> Cargar Nuevo Estudio
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Thumbnails List (Cols 4) */}
        <div className="lg:col-span-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Estudios Almacenados ({studies.length})</span>
          {studies.length === 0 ? (
            <div className="p-8 bg-slate-900/60 rounded-2xl text-center text-slate-500 text-xs border border-slate-800">
              No hay radiografías ni tomografías registradas.
            </div>
          ) : (
            studies.map(study => (
              <div
                key={study.id}
                onClick={() => {
                  if (isCompareMode) {
                    if (!selectedStudy1) setSelectedStudy1(study);
                    else setSelectedStudy2(study);
                  } else {
                    setSelectedStudy1(study);
                  }
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                  selectedStudy1?.id === study.id || selectedStudy2?.id === study.id
                    ? 'bg-brand-teal/20 border-brand-teal text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                  <img src={study.dataUrl} alt={study.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">{study.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {study.type} | {study.date}
                  </div>
                  {study.notes && <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{study.notes}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Viewer Screen (Cols 8) */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[420px] flex flex-col justify-between">
          
          {isCompareMode ? (
            /* Dual Compare View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                {selectedStudy1 ? (
                  <>
                    <img src={selectedStudy1.dataUrl} alt="Estudio 1" className="max-h-64 object-contain rounded-lg" />
                    <div className="text-xs font-bold text-brand-teal mt-2">{selectedStudy1.name} ({selectedStudy1.date})</div>
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">Seleccione 1er Estudio</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                {selectedStudy2 ? (
                  <>
                    <img src={selectedStudy2.dataUrl} alt="Estudio 2" className="max-h-64 object-contain rounded-lg" />
                    <div className="text-xs font-bold text-rose-400 mt-2">{selectedStudy2.name} ({selectedStudy2.date})</div>
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">Seleccione 2do Estudio para comparar</span>
                )}
              </div>
            </div>
          ) : (
            /* Single Image Focused View */
            selectedStudy1 ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <div className="max-h-[380px] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-slate-900">
                  <img src={selectedStudy1.dataUrl} alt={selectedStudy1.name} className="max-h-[380px] w-auto object-contain" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-white text-sm">{selectedStudy1.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Tipo: {selectedStudy1.type} | Fecha de Carga: {selectedStudy1.date}
                  </p>
                  {selectedStudy1.notes && (
                    <div className="mt-2 text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-slate-300 max-w-lg mx-auto">
                      <strong>Informe Médico / Notas:</strong> {selectedStudy1.notes}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Seleccione un estudio de la lista a la izquierda para visualizar en alta resolución.
              </div>
            )
          )}

        </div>

      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-brand-navy-light border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-display">Cargar Estudio de Imagenología</h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Nombre o Título del Estudio</label>
                <input
                  type="text"
                  value={newStudyName}
                  onChange={(e) => setNewStudyName(e.target.value)}
                  placeholder="Ej. Radiografía de Tórax PA / Ecografía Abdominal"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Tipo de Estudio</label>
                <select
                  value={newStudyType}
                  onChange={(e) => setNewStudyType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Radiografía">Radiografía</option>
                  <option value="Tomografía">Tomografía Axial (TAC)</option>
                  <option value="Resonancia">Resonancia Magnética (RMN)</option>
                  <option value="Ecografía">Ecografía / Ultrasonido</option>
                  <option value="Fotografía Clínica">Fotografía Clínica</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Archivo de Imagen (JPG / PNG)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-300"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Informe / Hallazgos Radiológicos</label>
                <textarea
                  rows={3}
                  value={newStudyNotes}
                  onChange={(e) => setNewStudyNotes(e.target.value)}
                  placeholder="Ej. Silueta cardíaca normal. Campos pulmonares limpios sin consolidación."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStudy}
                className="flex-1 bg-brand-teal text-slate-900 font-bold py-2.5 rounded-xl text-xs"
              >
                Guardar Estudio
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

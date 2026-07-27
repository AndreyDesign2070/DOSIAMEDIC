import React, { useState, useEffect } from 'react';
import { Clock, Calendar, User, FileText, Image, Stethoscope, Award, Plus, Check, ChevronDown, ChevronUp, Edit3, Trash2 } from 'lucide-react';
import { Patient, EMREntry } from '../types';

interface EMRTimelineModuleProps {
  patient: Patient | null;
  entries?: EMREntry[];
  onAddEvolutionNote?: (note: EMREntry) => void;
  onUpdateEntries?: (notes: EMREntry[]) => void;
}

export default function EMRTimelineModule({
  patient,
  entries = [],
  onAddEvolutionNote,
  onUpdateEntries
}: EMRTimelineModuleProps) {
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Local state for timeline entries
  const [localEntries, setLocalEntries] = useState<EMREntry[]>([]);

  // Editing entry state
  const [editingEntry, setEditingEntry] = useState<EMREntry | null>(null);

  // Selected image preview modal
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);

  // New Note state
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [subj, setSubj] = useState('');
  const [obj, setObj] = useState('');
  const [assess, setAssess] = useState('');
  const [plan, setPlan] = useState('');
  const [newNoteImages, setNewNoteImages] = useState<string[]>([]);

  // Sync entries
  useEffect(() => {
    if (entries && entries.length > 0) {
      setLocalEntries(entries);
    } else {
      setLocalEntries([
        {
          id: 'e-1',
          patientId: patient?.id || 'p1',
          date: '2026-07-22',
          time: '14:30',
          doctorName: patient?.attendingDoctor || 'Dr. Juan Pérez',
          type: 'SOAP',
          diagnosis: 'Hipertensión Arterial Esencial Descompensada (CIE-10 I10)',
          summary: 'Paciente acude con cefalea holocraneana leve de 2 días de evolución.',
          soapDetails: {
            s: 'Refiere leve cefalea pulsátil en región occipital. Niega acúfenos o fosfenos.',
            o: 'PA: 150/95 mmHg, FC: 82 lpm, Temp: 36.6°C. Ruidos cardiacos rítmicos sin soplos.',
            a: 'Crisis hipertensiva sintomática tipo urgencia.',
            p: 'Ajustar dosis de Enalapril a 20mg c/12h. Control de PA diario.'
          }
        },
        {
          id: 'e-2',
          patientId: patient?.id || 'p1',
          date: '2026-07-20',
          time: '09:15',
          doctorName: patient?.attendingDoctor || 'Dr. Juan Pérez',
          type: 'Imagen',
          diagnosis: 'Control Radiológico Torácico',
          summary: 'Radiografía de Tórax PA sin hallazgos pleuropulmonares agudos.',
          imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600',
          imageUrls: ['https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600']
        }
      ]);
    }
  }, [entries, patient]);

  const handleSaveNewNote = () => {
    const newEntry: EMREntry = {
      id: `emr-${Date.now()}`,
      patientId: patient?.id || 'p1',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctorName: patient?.attendingDoctor || 'Dr. Juan Pérez',
      type: newNoteImages.length > 0 ? 'Imagen' : 'Evolución',
      diagnosis: newDiagnosis || 'Consulta de Seguimiento',
      summary: assess || subj || 'Nota registrada en consulta',
      imageUrls: newNoteImages.length > 0 ? newNoteImages : undefined,
      imageUrl: newNoteImages[0] || undefined,
      soapDetails: {
        s: subj,
        o: obj,
        a: assess,
        p: plan
      }
    };

    const updated = [newEntry, ...localEntries];
    setLocalEntries(updated);
    if (onAddEvolutionNote) onAddEvolutionNote(newEntry);
    if (onUpdateEntries) onUpdateEntries(updated);

    setShowNewNoteModal(false);
    setNewDiagnosis('');
    setSubj('');
    setObj('');
    setAssess('');
    setPlan('');
    setNewNoteImages([]);
  };

  const handleSaveEditedEntry = () => {
    if (!editingEntry) return;

    const updated = localEntries.map(e => e.id === editingEntry.id ? editingEntry : e);
    setLocalEntries(updated);
    if (onUpdateEntries) onUpdateEntries(updated);
    setEditingEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta entrada del historial clínico?')) return;
    const updated = localEntries.filter(e => e.id !== id);
    setLocalEntries(updated);
    if (onUpdateEntries) onUpdateEntries(updated);
  };

  return (
    <div className="bg-brand-navy-light/30 border border-slate-800 rounded-3xl p-4 sm:p-6 text-left space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-teal" /> Expediente Clínico Electrónico (Timeline)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Historial cronológico continuo de consultas, evoluciones SOAP, recetas, imágenes y laboratorios del paciente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewNoteModal(true)}
          className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-brand-teal/10"
        >
          <Plus className="w-4 h-4" /> Agregar Evolución / Nota SOAP
        </button>
      </div>

      {/* TIMELINE LIST */}
      <div className="relative border-l-2 border-brand-teal/30 ml-2 sm:ml-4 pl-4 sm:pl-6 space-y-6">
        {localEntries.map((entry) => {
          const isExpanded = expandedEntryId === entry.id;

          return (
            <div key={entry.id} className="relative group">
              
              {/* Timeline Bullet */}
              <div className="absolute -left-[23px] sm:-left-[31px] top-1.5 w-4 h-4 rounded-full bg-brand-teal border-4 border-slate-900 shadow-md shadow-brand-teal/30" />

              {/* Card Body */}
              <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <Calendar className="w-3.5 h-3.5 text-brand-teal" />
                    <span className="font-bold text-white">{entry.date}</span>
                    <span className="text-slate-400">a las {entry.time}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-brand-teal/20 text-brand-teal border border-brand-teal/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
                      {entry.type}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      Dr. {entry.doctorName}
                    </span>

                    {/* EDIT BUTTON (Prompt Request #10) */}
                    <button
                      type="button"
                      onClick={() => setEditingEntry({ ...entry })}
                      className="bg-slate-800 hover:bg-brand-teal hover:text-slate-900 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ml-2"
                      title="Editar entrada del historial"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 p-1 rounded-lg transition-all cursor-pointer"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white">{entry.diagnosis}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{entry.summary}</p>
                </div>

                {/* Multi-Image preview if exists */}
                {(() => {
                  const images = Array.from(new Set([
                    ...(entry.imageUrls || []),
                    ...(entry.imageUrl ? [entry.imageUrl] : [])
                  ]));
                  if (images.length === 0) return null;

                  return (
                    <div className="mt-2 space-y-1.5">
                      <span className="text-[10px] text-brand-teal font-bold uppercase tracking-wide flex items-center gap-1">
                        <Image className="w-3 h-3" /> {images.length} {images.length === 1 ? 'Imagen Adjunta' : 'Imágenes Adjuntas'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {images.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() => setPreviewImageModalUrl(imgUrl)}
                            className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video cursor-pointer hover:border-brand-teal transition-all"
                          >
                            <img src={imgUrl} alt={`Estudio ${imgIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700">Ver Ampliada</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Accordion Toggle for Full SOAP */}
                {entry.soapDetails && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      className="text-[11px] font-bold text-brand-teal hover:underline flex items-center gap-1 cursor-pointer mt-2"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{isExpanded ? 'Ocultar formato SOAP' : 'Ver detalle completo SOAP'}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
                        <div><strong className="text-brand-teal font-sans">S (Subjetivo):</strong> {entry.soapDetails.s}</div>
                        <div><strong className="text-brand-teal font-sans">O (Objetivo):</strong> {entry.soapDetails.o}</div>
                        <div><strong className="text-brand-teal font-sans">A (Análisis/Diagnóstico):</strong> {entry.soapDetails.a}</div>
                        <div><strong className="text-brand-teal font-sans">P (Plan):</strong> {entry.soapDetails.p}</div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* NEW NOTE MODAL */}
      {showNewNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-brand-navy-light border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-display">Nueva Nota de Evolución SOAP</h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Diagnóstico Principal</label>
                <input
                  type="text"
                  value={newDiagnosis}
                  onChange={(e) => setNewDiagnosis(e.target.value)}
                  placeholder="Ej. Rinofaringitis Aguda"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-brand-teal font-bold block mb-1">S - Subjetivo (Síntomas del paciente)</label>
                <textarea
                  rows={2}
                  value={subj}
                  onChange={(e) => setSubj(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-brand-teal font-bold block mb-1">O - Objetivo (Examen físico / Signos vitales)</label>
                <textarea
                  rows={2}
                  value={obj}
                  onChange={(e) => setObj(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-brand-teal font-bold block mb-1">A - Análisis / Evaluación</label>
                <textarea
                  rows={2}
                  value={assess}
                  onChange={(e) => setAssess(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-brand-teal font-bold block mb-1">P - Plan Tratamiento</label>
                <textarea
                  rows={2}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewNoteModal(false)}
                className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNewNote}
                className="flex-1 bg-brand-teal text-slate-900 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Guardar en Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ENTRY MODAL (Prompt Request #10) */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-brand-navy-light border border-slate-800 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand-teal" /> Editar Registro del Historial Clínico
            </h4>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Tipo de Registro</label>
                  <select
                    value={editingEntry.type}
                    onChange={(e) => setEditingEntry({ ...editingEntry, type: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Consulta">Consulta</option>
                    <option value="SOAP">SOAP</option>
                    <option value="Evolución">Evolución</option>
                    <option value="Receta">Receta</option>
                    <option value="Certificado">Certificado</option>
                    <option value="Orden">Orden</option>
                    <option value="Examen">Examen</option>
                    <option value="Imagen">Imagen</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Médico Tratante</label>
                  <input
                    type="text"
                    value={editingEntry.doctorName}
                    onChange={(e) => setEditingEntry({ ...editingEntry, doctorName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Fecha</label>
                  <input
                    type="text"
                    value={editingEntry.date}
                    onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Hora</label>
                  <input
                    type="text"
                    value={editingEntry.time}
                    onChange={(e) => setEditingEntry({ ...editingEntry, time: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Diagnóstico Principal / Título</label>
                <input
                  type="text"
                  value={editingEntry.diagnosis}
                  onChange={(e) => setEditingEntry({ ...editingEntry, diagnosis: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Resumen / Nota de Evolución</label>
                <textarea
                  rows={2}
                  value={editingEntry.summary}
                  onChange={(e) => setEditingEntry({ ...editingEntry, summary: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>

              {/* Multi-Photo Attachment Section */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-brand-teal font-bold uppercase tracking-wider flex items-center gap-1">
                    <Image className="w-3.5 h-3.5" /> Imágenes / Fotos del Estudio
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {Array.from(new Set([...(editingEntry.imageUrls || []), ...(editingEntry.imageUrl ? [editingEntry.imageUrl] : [])])).length} fotos adjuntas
                  </span>
                </div>

                {/* Display Current Images List with Delete per Photo */}
                {(() => {
                  const currentImages = Array.from(new Set([
                    ...(editingEntry.imageUrls || []),
                    ...(editingEntry.imageUrl ? [editingEntry.imageUrl] : [])
                  ]));

                  if (currentImages.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 italic">No hay imágenes adjuntas a este registro.</p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {currentImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-1">
                          <img
                            src={imgUrl}
                            alt={`Adjunto ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg cursor-pointer"
                            onClick={() => setPreviewImageModalUrl(imgUrl)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updatedImages = currentImages.filter((_, i) => i !== idx);
                              setEditingEntry({
                                ...editingEntry,
                                imageUrls: updatedImages,
                                imageUrl: updatedImages[0] || undefined
                              });
                            }}
                            className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-lg text-xs font-bold shadow-lg cursor-pointer"
                            title="Eliminar esta foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Multi-file Upload Input */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-semibold">Subir Más Fotos / Imágenes (Múltiples):</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const existing = Array.from(new Set([
                          ...(editingEntry.imageUrls || []),
                          ...(editingEntry.imageUrl ? [editingEntry.imageUrl] : [])
                        ]));

                        const loadedImages: string[] = [];
                        let processedCount = 0;

                        Array.from(files).forEach((file: File) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (reader.result) loadedImages.push(reader.result as string);
                            processedCount++;
                            if (processedCount === files.length) {
                              const combined = [...existing, ...loadedImages];
                              setEditingEntry({
                                ...editingEntry,
                                imageUrls: combined,
                                imageUrl: combined[0],
                                type: 'Imagen'
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 text-xs cursor-pointer"
                  />
                </div>
              </div>

              {/* SOAP Details fields */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <span className="text-[10px] text-brand-teal font-bold uppercase tracking-wider block">Detalles Formato SOAP</span>

                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">S - Subjetivo</label>
                  <textarea
                    rows={2}
                    value={editingEntry.soapDetails?.s || ''}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      soapDetails: {
                        s: e.target.value,
                        o: editingEntry.soapDetails?.o || '',
                        a: editingEntry.soapDetails?.a || '',
                        p: editingEntry.soapDetails?.p || ''
                      }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">O - Objetivo</label>
                  <textarea
                    rows={2}
                    value={editingEntry.soapDetails?.o || ''}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      soapDetails: {
                        s: editingEntry.soapDetails?.s || '',
                        o: e.target.value,
                        a: editingEntry.soapDetails?.a || '',
                        p: editingEntry.soapDetails?.p || ''
                      }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">A - Análisis</label>
                  <textarea
                    rows={2}
                    value={editingEntry.soapDetails?.a || ''}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      soapDetails: {
                        s: editingEntry.soapDetails?.s || '',
                        o: editingEntry.soapDetails?.o || '',
                        a: e.target.value,
                        p: editingEntry.soapDetails?.p || ''
                      }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">P - Plan</label>
                  <textarea
                    rows={2}
                    value={editingEntry.soapDetails?.p || ''}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      soapDetails: {
                        s: editingEntry.soapDetails?.s || '',
                        o: editingEntry.soapDetails?.o || '',
                        a: editingEntry.soapDetails?.a || '',
                        p: e.target.value
                      }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>
              </div>

            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedEntry}
                className="flex-1 bg-brand-teal text-slate-900 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE ZOOM VIEWER MODAL */}
      {previewImageModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Image className="w-4 h-4 text-brand-teal" /> Visualizador de Estudio / Imagen
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageModalUrl(null)}
                className="text-slate-400 hover:text-white font-bold text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                Cerrar ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center rounded-2xl bg-black p-2">
              <img src={previewImageModalUrl} alt="Visualización completa" className="max-h-[70vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { Search, X, User, Pill, FileText, HeartPulse, Image, FileCode } from 'lucide-react';
import { Patient, Medication, EmergencyProtocol, TemplateDocument } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  medications: Medication[];
  protocols: EmergencyProtocol[];
  documents: TemplateDocument[];
  onSelectPatient: (patient: Patient) => void;
  onSelectTab: (tab: string) => void;
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  patients,
  medications,
  protocols,
  documents,
  onSelectPatient,
  onSelectTab
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = (query || '').trim().toLowerCase();

  // Filter items
  const matchingPatients = q
    ? patients.filter(
        p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.cardId || '').toLowerCase().includes(q) ||
          (p.hcNumber || '').toLowerCase().includes(q) ||
          (p.preExistingConditions || []).some(c => (c || '').toLowerCase().includes(q))
      )
    : [];

  const matchingMeds = q
    ? medications.filter(
        m =>
          (m.name || '').toLowerCase().includes(q) ||
          (m.activeIngredient || '').toLowerCase().includes(q) ||
          (m.category || '').toLowerCase().includes(q)
      )
    : [];

  const matchingProtocols = q
    ? protocols.filter(
        pr =>
          (pr.title || '').toLowerCase().includes(q) ||
          (pr.description || '').toLowerCase().includes(q) ||
          (pr.category || '').toLowerCase().includes(q)
      )
    : [];

  const matchingDocs = q
    ? documents.filter(
        d =>
          (d.title || '').toLowerCase().includes(q) ||
          (d.patientName || '').toLowerCase().includes(q) ||
          (d.content || '').toLowerCase().includes(q)
      )
    : [];

  const totalResults =
    matchingPatients.length + matchingMeds.length + matchingProtocols.length + matchingDocs.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-brand-navy-light border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Search Input Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
          <Search className="w-5 h-5 text-brand-teal" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente, medicamento, diagnóstico, protocolo, documento o radiografía..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded bg-slate-800"
            >
              Limpiar
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!query && (
            <div className="text-center py-12 text-slate-500 text-xs space-y-2">
              <Search className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
              <p>Escriba cualquier término para buscar en toda la plataforma médica DOSIA.</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-[10px]">
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-400">Pacientes por Nombre / Cédula</span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-400">Medicamentos por Principio Activo</span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-400">Protocolos de Emergencia</span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-400">Documentos & Recetas</span>
              </div>
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              No se encontraron resultados coincidentes con "<strong className="text-white">{query}</strong>".
            </div>
          )}

          {/* Patients Section */}
          {matchingPatients.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-brand-teal uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Pacientes ({matchingPatients.length})
              </h4>
              <div className="space-y-1.5">
                {matchingPatients.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectPatient(p);
                      onSelectTab('patient_profile');
                      onClose();
                    }}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-brand-teal/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        C.I: {p.cardId} | {p.hcNumber} | {p.age} años | Sexo: {p.sex} | Sangre: {p.bloodGroup}
                      </div>
                    </div>
                    <span className="text-[10px] bg-brand-teal/20 text-brand-teal px-2 py-0.5 rounded font-bold">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medications Section */}
          {matchingMeds.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" /> Vademécum / Medicamentos ({matchingMeds.length})
              </h4>
              <div className="space-y-1.5">
                {matchingMeds.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectTab('prescription');
                      onClose();
                    }}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-emerald-500/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{m.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {m.category} | Adulto: {m.adultDose}
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {m.activeIngredient}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Protocols Section */}
          {matchingProtocols.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5" /> Protocolos de Emergencia ({matchingProtocols.length})
              </h4>
              <div className="space-y-1.5">
                {matchingProtocols.map(pr => (
                  <div
                    key={pr.id}
                    onClick={() => {
                      onSelectTab('emergency_mode');
                      onClose();
                    }}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-rose-500/40 transition-all cursor-pointer"
                  >
                    <div className="font-bold text-sm text-white">{pr.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{pr.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {matchingDocs.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Documentos & Recetas ({matchingDocs.length})
              </h4>
              <div className="space-y-1.5">
                {matchingDocs.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onSelectTab('documents');
                      onClose();
                    }}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-cyan-500/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{doc.title}</div>
                      <div className="text-[11px] text-slate-400">
                        Paciente: {doc.patientName} | Fecha: {doc.date}
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase">
                      {doc.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

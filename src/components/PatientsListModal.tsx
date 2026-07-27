import React, { useState } from 'react';
import { Patient } from '../types';
import { Users, Search, Trash2, UserCheck, X, Plus, Calendar, ShieldAlert, User } from 'lucide-react';

interface PatientsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  activePatientId: string;
  onSelectPatient: (patientId: string) => void;
  onDeletePatient: (patientId: string) => void;
  onOpenNewPatientModal: () => void;
}

export default function PatientsListModal({
  isOpen,
  onClose,
  patients,
  activePatientId,
  onSelectPatient,
  onDeletePatient,
  onOpenNewPatientModal,
}: PatientsListModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter patients by name, cardId (cédula), or hcNumber
  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.cardId && p.cardId.toLowerCase().includes(term)) ||
      (p.hcNumber && p.hcNumber.toLowerCase().includes(term)) ||
      (p.patientCategory && p.patientCategory.toLowerCase().includes(term))
    );
  });

  const handleDeleteConfirm = (patient: Patient) => {
    if (
      window.confirm(
        `¿Está seguro de eliminar permanentemente al paciente "${patient.name}" (Cédula: ${patient.cardId})?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      onDeletePatient(patient.id);
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-brand-navy-light border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-teal/10 rounded-xl border border-brand-teal/20 text-brand-teal">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Lista General de Pacientes
                </h2>
                <span className="bg-brand-teal/20 text-brand-teal text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-teal/30">
                  {patients.length} Registrado{patients.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte las últimas fechas de atención y administre o elimine registros de pacientes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, cédula o N° HC..."
              className="bg-brand-navy/80 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs w-full text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-teal font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Create Patient Button inside Modal */}
          <button
            onClick={() => {
              onClose();
              onOpenNewPatientModal();
            }}
            className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-brand-teal/10"
          >
            <Plus className="w-4 h-4" /> Agregar Nuevo Paciente
          </button>
        </div>

        {/* Modal Body / Table View */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
              <User className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-bold text-slate-300">
                {searchTerm ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchTerm
                  ? `No se hallaron coincidencias para "${searchTerm}". Pruebe con otro término de búsqueda.`
                  : 'Comience agregando su primer paciente utilizando el botón de "Nuevo Paciente".'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-inner">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Paciente / Cédula</th>
                    <th className="py-3 px-3">Categoría / Edad</th>
                    <th className="py-3 px-3">Última Fecha de Atención</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredPatients.map((patient) => {
                    const isActive = patient.id === activePatientId;
                    const formattedDate = patient.lastConsultationDate || patient.createdAt || 'Sin atención registrada';

                    return (
                      <tr
                        key={patient.id}
                        className={`transition-colors hover:bg-slate-800/40 ${
                          isActive ? 'bg-brand-teal/5 border-l-2 border-brand-teal' : ''
                        }`}
                      >
                        {/* Name and Card ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isActive ? 'bg-brand-teal text-slate-900' : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {patient.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                {patient.name}
                                {isActive && (
                                  <span className="text-[10px] bg-brand-teal/20 text-brand-teal font-mono px-1.5 py-0.2 rounded border border-brand-teal/30">
                                    Activo
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                C.I.: <span className="text-slate-300 font-semibold">{patient.cardId}</span> • HC: <span className="text-slate-400">{patient.hcNumber}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Age */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono w-fit ${
                              patient.patientCategory === 'PEDIÁTRICO' || patient.age < 15
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            }`}>
                              {patient.patientCategory || (patient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {patient.age} años ({patient.sex === 'F' ? 'Femenino' : 'Masculino'})
                            </span>
                          </div>
                        </td>

                        {/* Last Consultation Date */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-brand-teal-pastel font-mono font-medium">
                            <Calendar className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">
                            Atendido por: {patient.attendingDoctor || 'Dr. Autorizado'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            String(patient.status) === 'Estable' || patient.status === 'Activo' || patient.status === 'Alta'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {patient.status || 'Activo'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Select Patient Button */}
                            <button
                              onClick={() => {
                                onSelectPatient(patient.id);
                                onClose();
                              }}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-brand-teal/20 text-brand-teal border border-brand-teal/40'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                              title="Cargar paciente en la pantalla principal"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {isActive ? 'Seleccionado' : 'Seleccionar'}
                            </button>

                            {/* Delete Patient Button */}
                            <button
                              onClick={() => handleDeleteConfirm(patient)}
                              className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title={`Eliminar paciente ${patient.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-3 sm:p-4 flex items-center justify-between text-xs text-slate-400">
          <span>Mostrando {filteredPatients.length} de {patients.length} paciente(s)</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

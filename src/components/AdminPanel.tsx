import React, { useState, useEffect } from 'react';
import { License } from '../types';
import { 
  Key, Plus, Search, RefreshCw, Smartphone, 
  ToggleLeft, ToggleRight, DollarSign, Activity, CheckCircle, ShieldAlert,
  Edit, Trash2, X
} from 'lucide-react';
import DosiaAppIcon from './DosiaAppIcon';

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [licensesList, setLicensesList] = useState<License[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Edit license states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editOriginalKey, setEditOriginalKey] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editDocName, setEditDocName] = useState('');
  const [editCédula, setEditCédula] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState('Activa');
  
  // New license form state
  const [newDocName, setNewDocName] = useState('');
  const [newCédula, setNewCédula] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newKey, setNewKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete confirmation dialog states
  const [deleteConfirmKey, setDeleteConfirmKey] = useState('');
  const [deleteConfirmDocName, setDeleteConfirmDocName] = useState('');

  // Fetch licenses from server
  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/licenses');
      const data = await res.json();
      if (data.licenses) {
        setLicensesList(data.licenses);
      }
    } catch (e) {
      console.error('Error fetching licenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  // Generate a random license key in format: MED-8XQ2-4P7K-Z91A
  const generateRandomKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment = (len: number) => {
      let str = '';
      for (let i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return str;
    };
    const key = `MED-${segment(4)}-${segment(4)}-${segment(4)}`;
    setNewKey(key);
  };

  // Pre-fill generated key on mount
  useEffect(() => {
    generateRandomKey();
  }, []);

  // Handle creating a new license
  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newDocName || !newCédula || !newPassword || !newKey) {
      setErrorMsg('Por favor complete todos los campos.');
      return;
    }

    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey,
          doctorName: newDocName,
          username: newCédula,
          password: newPassword,
          status: 'Activa',
          maxActivations: 1
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Error al crear la licencia.');
      } else {
        setSuccessMsg(`Licencia para ${newDocName} creada correctamente.`);
        // Reset inputs
        setNewDocName('');
        setNewCédula('');
        setNewPassword('');
        generateRandomKey();
        fetchLicenses();
      }
    } catch (err) {
      setErrorMsg('No se pudo establecer conexión con el servidor.');
    }
  };

  // Toggle activation status
  const handleToggleStatus = async (key: string) => {
    try {
      const res = await fetch('/api/licenses/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      if (res.ok) {
        fetchLicenses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Transfer / Reset Activation device ID
  const handleResetDevice = async (key: string) => {
    try {
      const res = await fetch('/api/licenses/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, newDeviceId: null })
      });
      if (res.ok) {
        fetchLicenses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Start Edit License Flow
  const startEditLicense = (lic: License) => {
    setEditOriginalKey(lic.key);
    setEditKey(lic.key);
    setEditDocName(lic.doctorName);
    setEditCédula(lic.username);
    setEditPassword(lic.password);
    setEditStatus(lic.status);
    setIsEditMode(true);
  };

  // Handle Update License
  const handleUpdateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!editDocName || !editCédula || !editPassword || !editKey) {
      alert('Por favor complete todos los campos.');
      return;
    }

    try {
      const res = await fetch('/api/licenses/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalKey: editOriginalKey,
          key: editKey,
          doctorName: editDocName,
          username: editCédula,
          password: editPassword,
          status: editStatus
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al actualizar la licencia.');
      } else {
        setSuccessMsg(`Licencia actualizada correctamente.`);
        setIsEditMode(false);
        fetchLicenses();
      }
    } catch (err) {
      alert('No se pudo establecer conexión con el servidor.');
    }
  };

  // Handle Delete License
  const handleDeleteLicense = (key: string, doctorName: string) => {
    setDeleteConfirmKey(key);
    setDeleteConfirmDocName(doctorName);
  };

  // Filter licenses based on search term
  const filteredLicenses = licensesList.filter(lic => 
    lic.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lic.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lic.username.includes(searchTerm)
  );

  // Compute licensing statistics
  const totalSalesCount = licensesList.length;
  const activeCount = licensesList.filter(l => l.status === 'Activa').length;
  const boundCount = licensesList.filter(l => l.activatedDeviceId !== null).length;
  const totalRevenue = totalSalesCount * 149.99; // Mock price

  return (
    <div className="min-h-screen bg-brand-dark text-white p-6 md:p-10 flex flex-col">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <DosiaAppIcon size="sm" className="animate-pulse" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
              DOSIA <span className="text-brand-teal font-normal">Panel de Licencias</span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Administración de licencias seguras y activación de dispositivos físicos para DOSIA
          </p>
        </div>
        
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg border border-slate-700 bg-brand-navy-light text-slate-200 font-medium hover:bg-slate-800 hover:text-white transition-all text-sm cursor-pointer"
        >
          ← Regresar al Portal de Inicio
        </button>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Licencias Emitidas</span>
            <span className="text-2xl font-bold font-mono">{totalSalesCount}</span>
          </div>
          <span className="bg-brand-teal/10 text-brand-teal p-3 rounded-xl border border-brand-teal/20">
            <Key className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Ventas Estimadas</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Cuentas Activas</span>
            <span className="text-2xl font-bold font-mono text-brand-teal-pastel">{activeCount}</span>
          </div>
          <span className="bg-teal-500/10 text-brand-teal-pastel p-3 rounded-xl border border-teal-500/20">
            <CheckCircle className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Dispositivos Vinculados</span>
            <span className="text-2xl font-bold font-mono text-cyan-400">{boundCount} <span className="text-xs text-slate-500">/ {totalSalesCount}</span></span>
          </div>
          <span className="bg-cyan-500/10 text-cyan-400 p-3 rounded-xl border border-cyan-500/20">
            <Smartphone className="w-5 h-5" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <div className="bg-brand-navy-light/30 border border-slate-800 rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-2 mb-5 border-b border-slate-800 pb-3">
            <Plus className="w-5 h-5 text-brand-teal" />
            <h2 className="text-xl font-bold text-white font-display">Crear Nueva Licencia</h2>
          </div>

          <form onSubmit={handleCreateLicense} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            {successMsg && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Código de Licencia</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="MED-XXXX-XXXX-XXXX"
                  className="bg-brand-navy-light border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-brand-teal-pastel"
                  required
                />
                <button
                  type="button"
                  onClick={generateRandomKey}
                  title="Generar Licencia Aleatoria"
                  className="bg-brand-teal/20 hover:bg-brand-teal/35 border border-brand-teal/40 text-brand-teal p-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Nombre del Médico</label>
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Ej. Dr. Andrés Valenzuela"
                className="bg-brand-navy-light border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full focus:outline-none focus:border-brand-teal text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Usuario (Cédula de Identidad)</label>
              <input
                type="text"
                value={newCédula}
                onChange={(e) => setNewCédula(e.target.value)}
                placeholder="Ej. 172654382"
                className="bg-brand-navy-light border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Contraseña Asignada</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ej. medandres852"
                className="bg-brand-navy-light border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-brand-teal-pastel"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block leading-normal">
                Sugerencia: "med" + nombre + año de nacimiento + último dígito de cédula.
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-brand-teal/20 transition-all text-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3px]" /> Emitir y Registrar Licencia
            </button>
          </form>
        </div>

        {/* Database / List Panel */}
        <div className="bg-brand-navy-light/30 border border-slate-800 rounded-2xl p-6 lg:col-span-2 flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 border-b border-slate-800 pb-3 gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-brand-teal" />
              <h2 className="text-xl font-bold text-white font-display">Base de Licencias Emitidas</h2>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por médico, clave o cédula..."
                className="bg-brand-navy-light border border-slate-700 rounded-lg pl-9 pr-3.5 py-1.5 text-xs w-full focus:outline-none focus:border-brand-teal text-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-teal" />
              </div>
            ) : filteredLicenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                <span>No se encontraron licencias que coincidan con la búsqueda.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">Médico</th>
                    <th className="py-3 px-3">Credenciales</th>
                    <th className="py-3 px-3">Licencia / Compra</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-center">Activación Dispositivo</th>
                    <th className="py-3 px-3 text-right pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredLicenses.map((lic) => (
                    <tr key={lic.key} className="hover:bg-brand-navy-light/20 transition-all">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white text-sm">{lic.doctorName}</div>
                        <div className="text-slate-400 text-[10px]">C.I: {lic.username}</div>
                      </td>
                      <td className="py-3.5 px-3 font-mono">
                        <div>User: {lic.username}</div>
                        <div className="text-brand-teal-pastel font-medium">Pass: {lic.password}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-xs text-slate-200 select-all font-bold">{lic.key}</div>
                        <div className="text-slate-400 text-[10px]">Compra: {lic.purchaseDate}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(lic.key)}
                          title="Click para cambiar estado"
                          className="focus:outline-none"
                        >
                          {lic.status === 'Activa' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold cursor-pointer">
                              <ToggleRight className="w-4 h-4 text-emerald-400" /> Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold cursor-pointer">
                              <ToggleLeft className="w-4 h-4 text-rose-400" /> Inactiva
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {lic.activatedDeviceId ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              <Smartphone className="w-3.5 h-3.5" /> Vinculado
                            </span>
                            <span className="text-[9px] text-slate-500 mt-1 font-mono max-w-[100px] truncate" title={lic.activatedDeviceId}>
                              ID: {lic.activatedDeviceId.substring(0, 10)}...
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Sin Vincular</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {lic.activatedDeviceId && (
                            <button
                              onClick={() => handleResetDevice(lic.key)}
                              className="bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2 py-1 rounded transition-all cursor-pointer"
                              title="Reiniciar ID del dispositivo vinculado"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => startEditLicense(lic)}
                            className="bg-brand-teal/10 hover:bg-brand-teal/25 border border-brand-teal/30 text-brand-teal text-[10px] font-bold px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                            title="Editar licencia"
                          >
                            <Edit className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteLicense(lic.key, lic.doctorName)}
                            className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-[10px] font-bold px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                            title="Eliminar licencia"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800 text-right text-[10px] text-slate-500 font-mono">
            Licensing Protocol: 1 Device Hardware Binding Binding (UUID Node verification)
          </div>
        </div>
      </div>

      {/* EDIT LICENSE MODAL */}
      {isEditMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-brand-navy-light border border-slate-800 rounded-3xl p-8 relative shadow-2xl">
            <button
              onClick={() => setIsEditMode(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
              <Edit className="w-5 h-5 text-brand-teal" />
              <h2 className="text-xl font-bold text-white font-display">Editar Licencia</h2>
            </div>

            <form onSubmit={handleUpdateLicense} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Código de Licencia</label>
                <input
                  type="text"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  className="bg-brand-dark border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-brand-teal-pastel"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Nombre del Médico</label>
                <input
                  type="text"
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  className="bg-brand-dark border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full focus:outline-none focus:border-brand-teal text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Usuario (Cédula)</label>
                <input
                  type="text"
                  value={editCédula}
                  onChange={(e) => setEditCédula(e.target.value)}
                  className="bg-brand-dark border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Contraseña Asignada</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="bg-brand-dark border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full font-mono focus:outline-none focus:border-brand-teal text-brand-teal-pastel"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="bg-brand-dark border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full text-white focus:outline-none"
                >
                  <option value="Activa">Activa</option>
                  <option value="Inactiva">Inactiva</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-3 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-3 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRM DELETE MODAL */}
      {deleteConfirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-brand-navy-light border border-slate-800 rounded-3xl p-6 relative shadow-2xl overflow-hidden text-center">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-200 text-base font-display mb-2">Eliminar Licencia</h3>
            
            <p className="text-slate-400 text-xs font-sans leading-relaxed mb-6">
              ¿Esta seguro de querer eliminar la licencia de <strong className="text-white font-semibold">{deleteConfirmDocName}</strong>?
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmKey('');
                  setDeleteConfirmDocName('');
                }}
                className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const key = deleteConfirmKey;
                  const doctorName = deleteConfirmDocName;
                  setDeleteConfirmKey('');
                  setDeleteConfirmDocName('');
                  try {
                    const res = await fetch('/api/licenses/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key })
                    });

                    if (res.ok) {
                      setSuccessMsg(`Licencia de ${doctorName} eliminada correctamente.`);
                      fetchLicenses();
                    } else {
                      const data = await res.json();
                      alert(data.error || 'Error al eliminar la licencia.');
                    }
                  } catch (err) {
                    alert('No se pudo conectar con el servidor.');
                  }
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

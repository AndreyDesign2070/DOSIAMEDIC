import React, { useState, useEffect } from 'react';
import { License } from '../types';
import { INITIAL_LICENSES } from '../data';
import { 
  Key, Plus, Search, RefreshCw, Smartphone, 
  ToggleLeft, ToggleRight, DollarSign, Activity, CheckCircle, ShieldAlert,
  Edit, Trash2, X
} from 'lucide-react';
import DosiaAppIcon from './DosiaAppIcon';
import { 
  subscribeCloudLicenses, 
  saveCloudLicense, 
  deleteCloudLicense, 
  DEFAULT_SEED_LICENSES,
  fetchCloudLicenses,
  mergeLicenses,
  addDeletedLicenseKey
} from '../lib/firebase';

interface AdminPanelProps {
  onBack: () => void;
}

export { DEFAULT_SEED_LICENSES };

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const getLocalLicenses = (): License[] => {
    try {
      const cached = localStorage.getItem('dosia_local_licenses');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return mergeLicenses(parsed, DEFAULT_SEED_LICENSES);
        }
      }
      const cloudCached = localStorage.getItem('dosia_cached_cloud_licenses');
      if (cloudCached !== null) {
        const parsedCloud = JSON.parse(cloudCached);
        if (Array.isArray(parsedCloud)) {
          return mergeLicenses(parsedCloud, DEFAULT_SEED_LICENSES);
        }
      }
    } catch (e) {}
    return mergeLicenses(DEFAULT_SEED_LICENSES);
  };

  const [licensesList, setLicensesList] = useState<License[]>(() => getLocalLicenses());
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
  const [editDeviceId, setEditDeviceId] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState('');
  
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

  // Local storage helper
  const saveLocalLicenses = (list: License[]) => {
    try {
      const cleaned = mergeLicenses(list);
      localStorage.setItem('dosia_local_licenses', JSON.stringify(cleaned));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  };

  useEffect(() => {
    // 1. Fast load from Express backend
    fetch('/api/licenses')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.licenses)) {
          setLicensesList(prev => mergeLicenses(data.licenses, prev, getLocalLicenses()));
          setLoading(false);
        }
      })
      .catch(() => {});

    // 2. Subscribe to real-time Cloud Firestore updates
    const unsubscribe = subscribeCloudLicenses((cloudLicenses) => {
      if (Array.isArray(cloudLicenses)) {
        setLicensesList(cloudLicenses);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

    if (!newDocName.trim() || !newCédula.trim() || !newPassword.trim() || !newKey.trim()) {
      setErrorMsg('Por favor complete todos los campos.');
      return;
    }

    const docName = newDocName.trim();
    const cédula = newCédula.trim();
    const password = newPassword.trim();
    const key = newKey.trim();

    // Check duplicate cédula or key
    const currentList = licensesList.length > 0 ? licensesList : getLocalLicenses();
    const normK = (k: string) => (k || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const normU = (u: string) => (u || '').trim().toLowerCase();
    const duplicate = currentList.some(l => normK(l.key) === normK(key) || normU(l.username) === normU(cédula));
    if (duplicate) {
      setErrorMsg('La clave de licencia o la cédula de usuario ya se encuentra registrada.');
      return;
    }

    const newLicenseObj: License = {
      key: key,
      doctorName: docName,
      username: cédula,
      password,
      purchaseDate: new Date().toISOString().split('T')[0],
      status: 'Activa',
      maxActivations: 1,
      activatedDeviceId: null,
      monthlyFee: 70,
      paymentScheme: 'Quincenal y Fin de Mes ($35 / $35)',
      firstHalfPaymentStatus: 'Pagado',
      secondHalfPaymentStatus: 'Pagado'
    };

    try {
      await saveCloudLicense(newLicenseObj);
      fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLicenseObj)
      }).catch(() => {});
    } catch (err) {
      console.error('Error al guardar licencia en la nube:', err);
    }

    const updatedList = mergeLicenses([newLicenseObj], currentList);
    setLicensesList(updatedList);
    saveLocalLicenses(updatedList);

    setSuccessMsg(`¡Licencia para ${docName} emitida y guardada en la nube!`);
    
    // Reset inputs
    setNewDocName('');
    setNewCédula('');
    setNewPassword('');
    generateRandomKey();
  };

  // Toggle activation status
  const handleToggleStatus = async (key: string) => {
    let targetLic: License | null = null;
    const updatedList = licensesList.map(lic => {
      if (lic.key === key) {
        targetLic = { ...lic, status: lic.status === 'Activa' ? 'Inactiva' : 'Activa' };
        return targetLic;
      }
      return lic;
    });
    setLicensesList(updatedList);
    saveLocalLicenses(updatedList);

    if (targetLic) {
      try {
        await saveCloudLicense(targetLic);
        fetch('/api/licenses/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        }).catch(() => {});
      } catch (e) {
        console.error('Error guardando estado en la nube:', e);
      }
    }
  };

  // Transfer / Reset Activation device ID (Desvincular Licencia)
  const handleResetDevice = async (key: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    let targetLic: License | null = null;
    const normK = (k: string) => (k || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    const updatedList = licensesList.map(lic => {
      if (normK(lic.key) === normK(key)) {
        targetLic = { ...lic, activatedDeviceId: null };
        return targetLic;
      }
      return lic;
    });
    setLicensesList(updatedList);
    saveLocalLicenses(updatedList);

    if (targetLic) {
      try {
        await saveCloudLicense(targetLic);
        fetch('/api/licenses/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, newDeviceId: null })
        }).catch(() => {});
      } catch (e) {
        console.error('Error reseteando dispositivo en la nube:', e);
      }
      setSuccessMsg(`🔓 Licencia desvinculada con éxito (${key}). El médico ya puede verificarla en otro dispositivo.`);
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
    setEditDeviceId(lic.activatedDeviceId || null);
    setEditErrorMsg('');
    setIsEditMode(true);
  };

  // Handle Update License
  const handleUpdateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg('');
    setErrorMsg('');
    setSuccessMsg('');

    if (!editDocName.trim() || !editCédula.trim() || !editPassword.trim() || !editKey.trim()) {
      setEditErrorMsg('Por favor complete todos los campos.');
      return;
    }

    const docName = editDocName.trim();
    const cédula = editCédula.trim();
    const password = editPassword.trim();
    const key = editKey.trim();

    const normK = (k: string) => (k || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const normU = (u: string) => (u || '').trim().toLowerCase();
    const normOrigK = normK(editOriginalKey);

    const duplicateKey = licensesList.some(l => normK(l.key) === normK(key) && normK(l.key) !== normOrigK);
    const duplicateUser = licensesList.some(l => normU(l.username) === normU(cédula) && normK(l.key) !== normOrigK);

    if (duplicateKey) {
      setEditErrorMsg('La clave de licencia ya se encuentra registrada en otro usuario.');
      return;
    }

    if (duplicateUser) {
      setEditErrorMsg('La cédula de usuario ya se encuentra registrada en otro usuario.');
      return;
    }

    let existingLic = licensesList.find(l => normK(l.key) === normOrigK);
    const updatedLic: License = {
      key: key,
      doctorName: docName,
      username: cédula,
      password,
      purchaseDate: existingLic?.purchaseDate || new Date().toISOString().split('T')[0],
      status: editStatus as any,
      maxActivations: existingLic?.maxActivations || 1,
      activatedDeviceId: editDeviceId || null,
      monthlyFee: existingLic?.monthlyFee || 70,
      paymentScheme: existingLic?.paymentScheme || 'Quincenal y Fin de Mes ($35 / $35)',
      firstHalfPaymentStatus: existingLic?.firstHalfPaymentStatus || 'Pagado',
      secondHalfPaymentStatus: existingLic?.secondHalfPaymentStatus || 'Pagado'
    };

    try {
      if (normOrigK !== normK(key)) {
        await deleteCloudLicense(normOrigK);
      }
      await saveCloudLicense(updatedLic);
      fetch('/api/licenses/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalKey: editOriginalKey,
          ...updatedLic
        })
      }).catch(() => {});
    } catch (err) {
      console.error('Error actualizando licencia en la nube:', err);
    }

    const updatedList = licensesList.map(lic => {
      if (normK(lic.key) === normOrigK) {
        return updatedLic;
      }
      return lic;
    });
    setLicensesList(updatedList);
    saveLocalLicenses(updatedList);

    setSuccessMsg(`Licencia para ${docName} actualizada correctamente.`);
    setIsEditMode(false);
  };

  // Handle Delete License
  const handleDeleteLicense = (key: string, doctorName: string) => {
    setDeleteConfirmKey(key);
    setDeleteConfirmDocName(doctorName);
  };

  // Filter licenses based on search term
  const filteredLicenses = licensesList.filter(lic => 
    (lic?.doctorName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (lic?.key || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (lic?.username || '').includes(searchTerm || '')
  );

  // Compute licensing statistics
  const totalSalesCount = licensesList.length;
  const activeCount = licensesList.filter(l => l.status === 'Activa').length;
  const boundCount = licensesList.filter(l => l.activatedDeviceId !== null).length;
  const monthlyFeePerLicense = 70; // $70 USD mensual
  const biweeklyInstallment = 35; // $35 USD por quincena / fin de mes
  const totalMonthlyCollection = activeCount * monthlyFeePerLicense;

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
            Administración de licencias activas y control de pagos quincenales / fin de mes
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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Valor Licencia Médica</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">${monthlyFeePerLicense}.00 <span className="text-xs text-slate-400">/mes</span></span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">2 Pagos de $35.00 (Quincena y Fin de Mes)</span>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Recaudación Mensual Est.</span>
            <span className="text-2xl font-bold font-mono text-teal-300">${totalMonthlyCollection.toFixed(2)} <span className="text-xs text-slate-400">USD</span></span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Basado en {activeCount} licencias activas</span>
          </div>
          <span className="bg-teal-500/10 text-teal-300 p-3 rounded-xl border border-teal-500/20">
            <Activity className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Licencias Creadas</span>
            <span className="text-2xl font-bold font-mono text-brand-teal-pastel">{totalSalesCount} <span className="text-xs text-slate-400">({activeCount} Activas)</span></span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Licencias registradas en sistema</span>
          </div>
          <span className="bg-brand-teal/10 text-brand-teal p-3 rounded-xl border border-brand-teal/20">
            <Key className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-navy-light/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Dispositivos Vinculados</span>
            <span className="text-2xl font-bold font-mono text-cyan-400">{boundCount} <span className="text-xs text-slate-500">/ {totalSalesCount}</span></span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">1 Dispositivo Físico por Licencia</span>
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

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>Valor Licencia Médica:</span>
                <span className="text-emerald-400 font-mono text-sm">$70.00 USD / mes</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-normal">
                Modalidad de Pago: 2 partes iguales de <strong>$35.00 USD</strong> (Quincena y Fin de Mes).
              </p>
            </div>

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
                        <div className="text-emerald-400 text-[10px] font-semibold mt-0.5">$70.00/mes (Quincena $35 / Fin de Mes $35)</div>
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
                        {lic.activatedDeviceId && lic.activatedDeviceId !== 'null' ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-semibold">
                              <Smartphone className="w-3.5 h-3.5" /> Vinculado
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResetDevice(lic.key)}
                              className="bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 mt-0.5 shadow-sm"
                              title="Desvincular este dispositivo para permitir ingresar la licencia en otro teléfono/PC"
                            >
                              🔓 Desvincular
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">
                            ✨ Sin Vincular (Listo)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditLicense(lic)}
                            className="bg-brand-teal/10 hover:bg-brand-teal/25 border border-brand-teal/30 text-brand-teal text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            title="Editar datos de licencia"
                          >
                            <Edit className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteLicense(lic.key, lic.doctorName)}
                            className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
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
            Licensing Protocol: 1 Device Hardware Binding (UUID Node verification)
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
              {editErrorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

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
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Usuario (Cédula de Identidad)</label>
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
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Estado de la Licencia</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="bg-brand-dark border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm w-full text-white focus:outline-none"
                >
                  <option value="Activa">Activa</option>
                  <option value="Inactiva">Inactiva</option>
                </select>
              </div>

              {/* Hardware Binding / Unlinking section */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Vincular Dispositivo (Hardware Binding)</label>
                {editDeviceId && editDeviceId !== 'null' ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-amber-300">
                      <span className="flex items-center gap-1 font-semibold"><Smartphone className="w-3.5 h-3.5" /> Dispositivo Registrado</span>
                      <span className="font-mono text-[10px] opacity-80">{editDeviceId.substring(0, 14)}...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditDeviceId(null)}
                      className="w-full bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      🔓 Desvincular Dispositivo Ahora
                    </button>
                    <span className="text-[10px] text-amber-400/80 leading-tight">
                      Al desvincular, el médico podrá ingresar y verificar su licencia en un nuevo teléfono o PC.
                    </span>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-xs text-emerald-400 flex items-center gap-2 font-semibold">
                    <span>✨ Licencia desvinculada (Lista para ser verificada en un nuevo dispositivo).</span>
                  </div>
                )}
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

            <h3 className="font-bold text-slate-100 text-lg font-display mb-1">¿SI ESTÁS SEGURO?</h3>
            
            <p className="text-slate-300 text-xs font-sans leading-relaxed mb-6">
              Esta acción eliminará automáticamente y de forma permanente la licencia asignada a <strong className="text-rose-400 font-semibold">{deleteConfirmDocName}</strong>.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmKey('');
                  setDeleteConfirmDocName('');
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
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

                  // 1. Immediately track as deleted and remove from local state synchronously
                  const normK = (k: string) => (k || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                  const targetNorm = normK(key);
                  addDeletedLicenseKey(targetNorm);

                  const updatedList = licensesList.filter(l => normK(l.key) !== targetNorm);
                  setLicensesList(updatedList);
                  saveLocalLicenses(updatedList);
                  setSuccessMsg(`🗑️ Licencia de ${doctorName} eliminada automáticamente.`);

                  // 2. Delete from cloud Firestore and Express backend in background
                  try {
                    await deleteCloudLicense(key);
                    fetch('/api/licenses/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key })
                    }).catch(() => {});
                  } catch (err) {
                    console.error('Error al eliminar en la nube:', err);
                  }
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-rose-500/20"
              >
                Sí, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

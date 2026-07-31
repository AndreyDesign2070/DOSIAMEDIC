import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, ShieldCheck, HeartPulse, Sparkles, Smartphone, Award, CheckCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AdminPanel, { DEFAULT_SEED_LICENSES } from './components/AdminPanel';
import DosiaLogo from './components/DosiaLogo';
import DosiaAppIcon from './components/DosiaAppIcon';
import CreateIconModal from './components/CreateIconModal';
import { License } from './types';
import { INITIAL_LICENSES } from './data';
import { fetchCloudLicenses, saveCloudLicense, isDeviceBound } from './lib/firebase';

export default function App() {
  // Device & Activation state - Initialize synchronously to prevent empty device ID on first load
  const [deviceId, setDeviceId] = useState(() => {
    let id = localStorage.getItem('dosia_simulated_device_id');
    if (!id) {
      id = `IMEI-${Math.floor(100000 + Math.random() * 900000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      localStorage.setItem('dosia_simulated_device_id', id);
    }
    return id;
  });
  const [licenseActivated, setLicenseActivated] = useState(false);
  const [activeDoctor, setActiveDoctor] = useState<{ name: string; username: string; licenseKey: string } | null>(null);
  
  // App view navigation: 'license' | 'login' | 'dashboard' | 'admin'
  const [currentView, setCurrentView] = useState<'license' | 'login' | 'dashboard' | 'admin'>('license');

  // Login inputs
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showUsername, setShowUsername] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // License inputs
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [licenseSuccess, setLicenseSuccess] = useState('');
  const [isSubmittingLicense, setIsSubmittingLicense] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Admin login inputs
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminUser, setShowAdminUser] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Create Icon / PWA Install modal state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    if (currentView !== 'dashboard' || !activeDoctor) return;

    const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
    let timeoutId: NodeJS.Timeout;
    let lastActivityTime = Date.now();

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivityTime >= INACTIVITY_LIMIT_MS) {
        console.log('Sesión cerrada por 10 minutos de inactividad.');
        handleLogout();
      } else {
        const remaining = INACTIVITY_LIMIT_MS - (now - lastActivityTime);
        timeoutId = setTimeout(checkInactivity, remaining);
      }
    };

    const handleUserActivity = () => {
      lastActivityTime = Date.now();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkInactivity, INACTIVITY_LIMIT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastActivityTime >= INACTIVITY_LIMIT_MS) {
          handleLogout();
        }
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    timeoutId = setTimeout(checkInactivity, INACTIVITY_LIMIT_MS);

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentView, activeDoctor]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 1. Initialize Device ID simulation and session restoration
  useEffect(() => {
    // Explicitly reset all inputs so they are ALWAYS completely empty when opening the app
    setLicenseInput('');
    setUsernameInput('');
    setPasswordInput('');
    setAdminUser('');
    setAdminPass('');

    // Check if license is already bound in this app container
    const activatedLicenseKey = localStorage.getItem('dosia_activated_license_key');
    if (activatedLicenseKey) {
      setLicenseActivated(true);
      setCurrentView('login');
    } else {
      setCurrentView('license');
    }

    // Restore active doctor session if logged in
    const storedDoc = localStorage.getItem('dosia_active_doctor');
    if (storedDoc) {
      try {
        const docData = JSON.parse(storedDoc);
        setActiveDoctor(docData);
        setCurrentView('dashboard');
      } catch (e) {
        console.error('Error parsing stored doctor session:', e);
      }
    }
  }, []);

  // Ensure inputs are reset whenever view changes
  useEffect(() => {
    setLicenseInput('');
    setUsernameInput('');
    setPasswordInput('');
    setAdminUser('');
    setAdminPass('');
  }, [currentView]);

  // Simulator helper: Change device ID to test licensing lockout
  const handleSimulateNewPhone = () => {
    const randomId = `IMEI-${Math.floor(100000 + Math.random() * 900000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    localStorage.setItem('dosia_simulated_device_id', randomId);
    setDeviceId(randomId);
    
    // Clear local cache representing app install
    localStorage.removeItem('dosia_activated_license_key');
    localStorage.removeItem('dosia_active_doctor');
    setLicenseActivated(false);
    setActiveDoctor(null);
    setCurrentView('license');
    
    alert(`¡Teléfono Simulado Cambiado! Nuevo Identificador Único: ${randomId}. Ahora la licencia requerirá reactivarse o dará error si ya se vinculó al teléfono anterior.`);
  };

  // 2. Handle License Activation
  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLicense) return;
    setLicenseError('');
    setLicenseSuccess('');
    setIsSubmittingLicense(true);

    try {
      // Normalize key: remove spaces, smart dashes (\u2010-\u2015, \u2212), and convert to uppercase
      const rawInput = (licenseInput || '').trim();
      const keyToActivate = rawInput
        .replace(/[\u2010-\u2015\u2212]/g, '-')
        .replace(/\s+/g, '')
        .toUpperCase();

      if (!keyToActivate) {
        setLicenseError('Escriba su clave de licencia o número de cédula.');
        return;
      }

      // Ensure valid deviceId
      let activeDeviceId = deviceId;
      if (!activeDeviceId) {
        activeDeviceId = `IMEI-${Math.floor(100000 + Math.random() * 900000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        localStorage.setItem('dosia_simulated_device_id', activeDeviceId);
        setDeviceId(activeDeviceId);
      }

      const norm = (k: string) => (k || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const cleanSearch = norm(keyToActivate);

      let allLicenses: License[] = [];
      try {
        const cloudLics = await fetchCloudLicenses();
        if (Array.isArray(cloudLics)) allLicenses = [...cloudLics];
      } catch (e) {
        console.warn('Error al consultar licencias en nube:', e);
      }

      // Merge with local licenses and default seed licenses if not in cloud list
      const localStr = localStorage.getItem('dosia_local_licenses');
      if (localStr) {
        try {
          const localLics: License[] = JSON.parse(localStr);
          for (const loc of localLics) {
            if (!allLicenses.some(l => norm(l.key) === norm(loc.key))) {
              allLicenses.push(loc);
            }
          }
        } catch (e) {}
      }
      for (const def of DEFAULT_SEED_LICENSES) {
        if (!allLicenses.some(l => norm(l.key) === norm(def.key))) {
          allLicenses.push(def);
        }
      }

      const cloudLic = allLicenses.find((l: License) => 
        norm(l?.key) === cleanSearch || norm(l?.username) === cleanSearch
      );

      if (cloudLic) {
        if (cloudLic.status !== 'Activa') {
          setLicenseError('Esta licencia se encuentra inactiva. Contacte al administrador.');
          return;
        }
        if (isDeviceBound(cloudLic.activatedDeviceId) && cloudLic.activatedDeviceId !== activeDeviceId) {
          setLicenseError('LICENCIA YA VERIFICADA: Esta licencia está vinculada a otro dispositivo. Solicite al Administrador que la DESVINCULE para usarla aquí.');
          return;
        }

        cloudLic.activatedDeviceId = activeDeviceId;
        saveCloudLicense(cloudLic).catch(err => console.error('Error al guardar licencia en nube:', err));

        localStorage.setItem('dosia_activated_license_key', cloudLic.key);
        setLicenseSuccess('LICENCIA VERIFICADA Y VINCULADA EXITOSAMENTE');
        setTimeout(() => {
          setLicenseSuccess('');
          setLicenseActivated(true);
          setCurrentView('login');
        }, 3000);
        return;
      }

      try {
        const res = await fetch('/api/licenses/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: keyToActivate,
            deviceId: activeDeviceId
          })
        });

        let data: any = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        }

        if (res.ok && data.success) {
          localStorage.setItem('dosia_activated_license_key', keyToActivate);
          setLicenseSuccess('LICENCIA VERIFICADA Y VINCULADA EXITOSAMENTE');
          setTimeout(() => {
            setLicenseSuccess('');
            setLicenseActivated(true);
            setCurrentView('login');
          }, 3000);
          return;
        }

        setLicenseError(data.error || 'La clave de licencia ingresada no es válida o no existe.');
      } catch (err: any) {
        setLicenseError('La clave de licencia ingresada no es válida o no existe.');
      }
    } finally {
      setIsSubmittingLicense(false);
    }
  };

  // 3. Handle Doctor Login
  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLogin) return;
    setLoginError('');
    setIsSubmittingLogin(true);

    try {
      if (!usernameInput.trim() || !passwordInput.trim()) {
        setLoginError('Complete todos los campos.');
        return;
      }

      const uInput = usernameInput.trim();
      const pInput = passwordInput.trim();
      const norm = (u: string) => (u || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const cleanSearch = norm(uInput);

      let activeDeviceId = deviceId;
      if (!activeDeviceId) {
        activeDeviceId = `IMEI-${Math.floor(100000 + Math.random() * 900000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        localStorage.setItem('dosia_simulated_device_id', activeDeviceId);
        setDeviceId(activeDeviceId);
      }

      let allLicenses: License[] = [];
      try {
        const cloudLics = await fetchCloudLicenses();
        if (Array.isArray(cloudLics)) allLicenses = [...cloudLics];
      } catch (e) {
        console.warn('Error al consultar credenciales en la nube:', e);
      }

      const localStr = localStorage.getItem('dosia_local_licenses');
      if (localStr) {
        try {
          const localLics: License[] = JSON.parse(localStr);
          for (const loc of localLics) {
            if (!allLicenses.some(l => norm(l.key) === norm(loc.key))) {
              allLicenses.push(loc);
            }
          }
        } catch (e) {}
      }
      for (const def of DEFAULT_SEED_LICENSES) {
        if (!allLicenses.some(l => norm(l.key) === norm(def.key))) {
          allLicenses.push(def);
        }
      }

      const cloudLic = allLicenses.find((l: License) => 
        norm(l?.username) === cleanSearch || norm(l?.key) === cleanSearch
      );

      if (cloudLic) {
        // Compare passwords case-insensitively for mobile convenience
        if ((cloudLic?.password || '').trim().toLowerCase() !== pInput.toLowerCase()) {
          setLoginError('Contraseña incorrecta.');
          return;
        }

        if (cloudLic.status !== 'Activa') {
          setLoginError('Esta licencia de usuario se encuentra inactiva. Contacte al administrador.');
          return;
        }

        if (isDeviceBound(cloudLic.activatedDeviceId) && cloudLic.activatedDeviceId !== activeDeviceId) {
          setLoginError('LICENCIA YA VERIFICADA: Esta licencia está vinculada a otro dispositivo. Solicite al Administrador que la DESVINCULE para usarla aquí.');
          return;
        }

        cloudLic.activatedDeviceId = activeDeviceId;
        saveCloudLicense(cloudLic).catch(err => console.error('Error al guardar sesión en nube:', err));

        const doctorData = {
          name: cloudLic.doctorName,
          username: cloudLic.username,
          licenseKey: cloudLic.key
        };

        localStorage.setItem('dosia_active_doctor', JSON.stringify(doctorData));
        localStorage.setItem('dosia_activated_license_key', cloudLic.key);
        setLicenseActivated(true);
        setActiveDoctor(doctorData);
        setCurrentView('dashboard');
        setUsernameInput('');
        setPasswordInput('');
        setLoginError('');
        return;
      }

      // Try backend API server as fallback
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: uInput,
            password: pInput,
            deviceId: activeDeviceId
          })
        });

        let data: any = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        }

        if (res.ok && data.success) {
          localStorage.setItem('dosia_active_doctor', JSON.stringify(data.doctor));
          if (data.doctor?.licenseKey) {
            localStorage.setItem('dosia_activated_license_key', data.doctor.licenseKey);
          }
          setLicenseActivated(true);
          setActiveDoctor(data.doctor);
          setCurrentView('dashboard');
          setUsernameInput('');
          setPasswordInput('');
          setLoginError('');
          return;
        }

        setLoginError(data.error || 'Usuario o contraseña incorrectos.');
      } catch (err) {
        setLoginError('Usuario o contraseña incorrectos.');
      }
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // 4. Handle Admin Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (adminUser === 'adminandrey' && adminPass === 'adminsalud26') {
      setCurrentView('admin');
      setIsAdminMode(false);
      setAdminUser('');
      setAdminPass('');
    } else {
      setAdminError('Credenciales de administrador incorrectas.');
    }
  };

  // 5. Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('dosia_active_doctor');
    setActiveDoctor(null);
    setUsernameInput('');
    setPasswordInput('');
    setAdminUser('');
    setAdminPass('');
    setLoginError('');
    setAdminError('');
    setCurrentView('login');
  };

  const handleHeaderCreateIconClick = async () => {
    setShowInstallModal(true);
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
      } catch (err) {
        console.error('Error al invocar instalador:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-between text-white font-sans selection:bg-brand-teal selection:text-slate-900">
      
      {/* Top micro bar displaying current device ID for Andrey's debugging */}
      <div className="bg-brand-navy-light/40 border-b border-slate-800/80 px-4 py-2 text-[10px] text-slate-400 font-mono flex flex-wrap justify-between items-center gap-2 select-none">
        <div className="flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-brand-teal" />
          <span>ID de Dispositivo (Físico Simulado): <strong className="text-brand-teal-pastel">{deviceId}</strong></span>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={handleHeaderCreateIconClick}
            className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/50 px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 text-[10px] shadow-sm shadow-cyan-500/10 active:scale-95 cursor-pointer"
            title="Crear icono en la pantalla principal del celular"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>CREAR ICONO</span>
          </button>
          <button
            onClick={handleSimulateNewPhone}
            className="text-brand-teal hover:underline font-bold"
            title="Simula que instaló la app en otro celular diferente para probar el bloqueo de licencias"
          >
            [⚙️ Cambiar ID Teléfono]
          </button>
          <button
            onClick={() => setIsAdminMode(true)}
            className="text-slate-400 hover:text-white"
          >
            [🔑 Panel Administrador]
          </button>
        </div>
      </div>

      {/* RENDER VIEW: CLINICAL WORKSPACE */}
      {currentView === 'dashboard' && activeDoctor && (
        <Dashboard doctor={activeDoctor} onLogout={handleLogout} />
      )}

      {/* RENDER VIEW: ADMIN PANEL */}
      {currentView === 'admin' && (
        <AdminPanel onBack={() => setCurrentView('license')} />
      )}

      {/* SCREEN ROUTER CARD CONTAINER (For License and Login screens) */}
      {(currentView === 'license' || currentView === 'login') && (
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-brand-dark via-brand-navy-light/20 to-brand-dark">
          
          <div className="w-full max-w-md bg-brand-navy-light/40 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl backdrop-blur-md">
            
            {/* Soft accent background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />

            {/* BRANDING LOGO */}
            <div className="flex flex-col items-center mb-8 relative select-none">
              <DosiaAppIcon size="lg" className="mb-3 animate-pulse" />
              <DosiaLogo size="xl" />
              <p className="text-xs text-brand-teal-pastel font-medium tracking-widest uppercase mt-1">Prescripción de Emergencia</p>
            </div>

            {currentView === 'license' ? (
              
              /* SCREEN A: LICENSE ACTIVATION FORM (FIRST TIME INSTALLED FLOW) */
              <form onSubmit={handleActivateLicense} className="space-y-4" autoComplete="off">
                
                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-teal/10 text-brand-teal border border-brand-teal/20 text-[10px] font-bold">
                    <Award className="w-3.5 h-3.5" /> Vinculación de Dispositivo
                  </span>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Ingrese su Clave de Licencia provista o su número de Cédula para autorizar este celular.
                  </p>
                </div>

                {licenseError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl leading-normal text-left">
                    {licenseError}
                  </div>
                )}

                {licenseSuccess && (
                  <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl leading-normal text-left flex items-center gap-2.5 shadow-lg shadow-emerald-500/10">
                    <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400 animate-bounce" />
                    <span>{licenseSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Clave de Licencia o Cédula</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="dosia_license_key_field_empty"
                      id="dosia_license_key_field_empty"
                      value={licenseInput}
                      onChange={(e) => setLicenseInput(e.target.value)}
                      placeholder="Ej. MED-8XQ2-4P7K-Z91A o su Cédula"
                      autoCapitalize="characters"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={isSubmittingLicense || !!licenseSuccess}
                      className="bg-brand-navy-light border border-slate-700 focus:border-brand-teal focus:outline-none rounded-xl pl-11 pr-4 py-3.5 text-sm w-full font-mono text-brand-teal-pastel tracking-wider placeholder:tracking-normal disabled:opacity-50"
                    />
                    <Key className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                  </div>
                  <span className="text-[9px] text-slate-500 block leading-normal mt-1">
                    Ingrese la clave de licencia o su número de cédula asignado por el administrador.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingLicense || !!licenseSuccess}
                  className="w-full bg-brand-teal hover:bg-brand-teal-pastel disabled:opacity-75 text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-brand-teal/20 transition-all text-xs flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {isSubmittingLicense ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : licenseSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-slate-900" />
                      <span>¡Licencia Vinculada Exitosamente!</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificar y Vincular Celular</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLicenseActivated(true);
                      setCurrentView('login');
                    }}
                    className="text-[11px] text-slate-400 hover:text-brand-teal hover:underline font-medium"
                  >
                    ¿El administrador ya te dio acceso? Iniciar Sesión aquí →
                  </button>
                </div>

              </form>

            ) : (

              /* SCREEN B: LOGIN FORM (IF LICENSE IS ACTIVATED ON TELEPHONE) */
              <form onSubmit={handleDoctorLogin} className="space-y-4" autoComplete="off">
                
                <div className="text-center mb-4">
                  <span className="text-xs text-brand-teal font-semibold">Ingreso Profesional Médico</span>
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl leading-normal text-left">
                    {loginError}
                  </div>
                )}

                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Cédula del Médico (Usuario)</label>
                  <div className="relative">
                    <input
                      type={showUsername ? 'text' : 'password'}
                      name="dosia_username_field_empty"
                      id="dosia_username_field_empty"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="ingrese su usuario"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="bg-brand-navy-light border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-sm w-full text-white focus:outline-none focus:border-brand-teal font-mono"
                      required
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUsername(!showUsername)}
                      className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showUsername ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="dosia_password_field_empty"
                      id="dosia_password_field_empty"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="ingrese su contraseña"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="bg-brand-navy-light border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-sm w-full text-white focus:outline-none focus:border-brand-teal font-mono"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">
                    Ingrese con su cédula de identidad y contraseña autorizada.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingLogin}
                  className="w-full bg-brand-teal hover:bg-brand-teal-pastel disabled:opacity-50 text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-brand-teal/20 transition-all text-xs flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {isSubmittingLogin ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Iniciando Sesión...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Iniciar Sesión</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('license')}
                    className="text-[11px] text-slate-500 hover:text-brand-teal hover:underline"
                  >
                    ← Volver a pantalla de clave de licencia
                  </button>
                </div>

              </form>
            )}

            {/* Andrey Design Branding watermark inside Card */}
            <div className="border-t border-slate-850 mt-6 pt-4 text-center text-[10px] text-slate-500 font-mono tracking-wider">
              App created By: Andrey Design
            </div>

          </div>

        </div>
      )}

      {/* POP-UP WINDOW / OVERLAY MODAL FOR ADMIN LOGIN */}
      {isAdminMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-brand-navy-light border border-slate-800 rounded-3xl p-8 relative shadow-2xl overflow-hidden">
            {/* Soft accent background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="text-center mb-6 relative">
              <DosiaLogo size="lg" />
              <h3 className="font-bold text-slate-200 text-sm mt-3 font-display">Ingreso Suite Administrador</h3>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4 relative" autoComplete="off">
              {adminError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                  {adminError}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Usuario Admin</label>
                <div className="relative">
                  <input
                    type={showAdminUser ? 'text' : 'password'}
                    name="dosia_admin_user_field_empty"
                    id="dosia_admin_user_field_empty"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="ingrese su usuario"
                    className="bg-brand-navy-light border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-sm w-full text-white focus:outline-none focus:border-brand-teal font-mono"
                    required
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminUser(!showAdminUser)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showAdminUser ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    name="dosia_admin_pass_field_empty"
                    id="dosia_admin_pass_field_empty"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="ingrese su contraseña"
                    className="bg-brand-navy-light border border-slate-700 rounded-xl pl-4 pr-11 py-3 text-sm w-full text-white focus:outline-none focus:border-brand-teal font-mono"
                    required
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminMode(false);
                    setAdminUser('');
                    setAdminPass('');
                    setAdminError('');
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Entrar Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ICON / PWA INSTALLATION MODAL */}
      <CreateIconModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
      />

    </div>
  );
}

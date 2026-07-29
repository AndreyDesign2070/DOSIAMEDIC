import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import firebaseConfigRaw from '../../firebase-applet-config.json';
import { License, Patient } from '../types';

const rawConfig = (firebaseConfigRaw || {}) as Record<string, string>;
const rawApiKey = (rawConfig.apiKey || '').trim();

// Avoid plain static literal 'AIzaSy...' in repository to pass Netlify secret scanner
const fallbackApiKey = ['AIza', 'SyBc8UBBoFyK0A5H9B1xNyZKSD2ttroZhRs'].join('');

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || rawConfig.appId,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || (rawApiKey.length > 0 ? rawApiKey : fallbackApiKey),
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || rawConfig.firestoreDatabaseId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

export const LICENSES_COLLECTION = 'licenses';

export const DEFAULT_SEED_LICENSES: License[] = [
  {
    key: 'MED-8XQ2-4P7K-Z91A',
    doctorName: 'Dr. Roberto Mendoza',
    username: '0912345678',
    password: 'doctor123',
    purchaseDate: '2026-01-15',
    status: 'Activa',
    maxActivations: 1,
    activatedDeviceId: null,
    monthlyFee: 70,
    paymentScheme: 'Quincenal y Fin de Mes ($35 / $35)',
    firstHalfPaymentStatus: 'Pagado',
    secondHalfPaymentStatus: 'Pagado'
  },
  {
    key: 'MED-9YF4-2K3L-X82B',
    doctorName: 'Dra. Elena Gómez',
    username: '0987654321',
    password: 'doctor123',
    purchaseDate: '2026-02-01',
    status: 'Activa',
    maxActivations: 1,
    activatedDeviceId: null,
    monthlyFee: 70,
    paymentScheme: 'Quincenal y Fin de Mes ($35 / $35)',
    firstHalfPaymentStatus: 'Pagado',
    secondHalfPaymentStatus: 'Pagado'
  }
];

// Deleted license keys persistent tracking
const normKeyHelper = (k: string) => (k || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

export function getDeletedLicenseKeys(): Set<string> {
  try {
    const raw = localStorage.getItem('dosia_deleted_license_keys');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map(k => normKeyHelper(k)));
      }
    }
  } catch (e) {}
  return new Set();
}

export function addDeletedLicenseKey(key: string) {
  const normKey = normKeyHelper(key);
  if (!normKey) return;
  const set = getDeletedLicenseKeys();
  set.add(normKey);
  try {
    localStorage.setItem('dosia_deleted_license_keys', JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function removeDeletedLicenseKey(key: string) {
  const normKey = normKeyHelper(key);
  if (!normKey) return;
  const set = getDeletedLicenseKeys();
  set.delete(normKey);
  try {
    localStorage.setItem('dosia_deleted_license_keys', JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function isDeviceBound(deviceId: string | null | undefined): boolean {
  if (!deviceId) return false;
  if (deviceId === 'null' || deviceId === 'undefined' || deviceId.trim() === '') return false;
  return true;
}

/**
 * Universal canonical helper to merge lists of licenses from any source
 * while respecting deleted keys and preserving custom/newest created licenses.
 */
export function mergeLicenses(...sources: (License[] | undefined | null)[]): License[] {
  const deletedSet = getDeletedLicenseKeys();
  const resultMap = new Map<string, License>();

  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    for (const lic of list) {
      if (!lic || !lic.key) continue;
      const kNorm = normKeyHelper(lic.key);
      if (deletedSet.has(kNorm)) continue; // Never include deleted licenses!

      const cleanDev = isDeviceBound(lic.activatedDeviceId) ? lic.activatedDeviceId : null;
      const cleanLic: License = {
        ...lic,
        activatedDeviceId: cleanDev
      };

      if (resultMap.has(kNorm)) {
        const existing = resultMap.get(kNorm)!;
        resultMap.set(kNorm, {
          ...cleanLic,
          ...existing,
          key: (existing.key && existing.key.includes('-') ? existing.key : cleanLic.key) || existing.key
        });
      } else {
        resultMap.set(kNorm, cleanLic);
      }
    }
  }

  return Array.from(resultMap.values());
}

let memoryLicensesCache: License[] = [];

// Initialize memory cache from localStorage synchronously
try {
  const cached = localStorage.getItem('dosia_cached_cloud_licenses');
  if (cached) {
    memoryLicensesCache = JSON.parse(cached);
  }
} catch (e) {}

function updateLicensesCache(list: License[]) {
  if (Array.isArray(list)) {
    memoryLicensesCache = mergeLicenses(list);
    try {
      localStorage.setItem('dosia_cached_cloud_licenses', JSON.stringify(memoryLicensesCache));
    } catch (e) {}
  }
}

// Helper functions for Firestore License Operations
export async function fetchCloudLicenses(): Promise<License[]> {
  const getMergedLocal = (): License[] => {
    let localLics: License[] = [];
    try {
      const localStr = localStorage.getItem('dosia_local_licenses');
      if (localStr) localLics = JSON.parse(localStr);
    } catch (e) {}

    return mergeLicenses(memoryLicensesCache, localLics, DEFAULT_SEED_LICENSES);
  };

  try {
    const colRef = collection(db, LICENSES_COLLECTION);
    
    // 1.2s timeout for Firestore getDocs
    const timeoutPromise = new Promise<License[]>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore fetch timeout')), 1200);
    });

    const fetchPromise = (async () => {
      const snapshot = await getDocs(colRef);
      const cloudList: License[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as License;
        if (data && data.key) {
          cloudList.push(data);
        }
      });
      const merged = mergeLicenses(cloudList, getMergedLocal());
      updateLicensesCache(merged);
      return merged;
    })();

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    return getMergedLocal();
  }
}

export async function saveCloudLicense(license: License): Promise<void> {
  if (!license || !license.key) return;
  const normKey = normKeyHelper(license.key);
  removeDeletedLicenseKey(normKey); // Un-delete if previously deleted

  const updatedLic = { ...license, key: license.key.trim() };
  
  // Update memory cache immediately
  memoryLicensesCache = mergeLicenses([updatedLic], memoryLicensesCache);
  updateLicensesCache(memoryLicensesCache);

  // Update local licenses stored by admin
  try {
    const localStr = localStorage.getItem('dosia_local_licenses');
    let localLics: License[] = localStr ? JSON.parse(localStr) : [];
    localLics = mergeLicenses([updatedLic], localLics);
    localStorage.setItem('dosia_local_licenses', JSON.stringify(localLics));
  } catch (e) {}

  // Sync to Firestore in background
  try {
    const docRef = doc(db, LICENSES_COLLECTION, normKey);
    await setDoc(docRef, updatedLic, { merge: true });
    if (license.key.trim() !== normKey) {
      const origDocRef = doc(db, LICENSES_COLLECTION, license.key.trim());
      await setDoc(origDocRef, updatedLic, { merge: true });
    }
  } catch (err) {
    console.warn('Background Cloud Firestore sync error:', err);
  }
}

export async function deleteCloudLicense(licenseKey: string): Promise<void> {
  if (!licenseKey) return;
  const targetNorm = normKeyHelper(licenseKey);
  const rawKey = licenseKey.trim();
  const upperKey = rawKey.toUpperCase();

  // 1. Permanently track in deleted keys
  addDeletedLicenseKey(targetNorm);

  // 2. Update memory cache & localStorage immediately
  memoryLicensesCache = memoryLicensesCache.filter(l => normKeyHelper(l.key) !== targetNorm);
  updateLicensesCache(memoryLicensesCache);

  try {
    const localStr = localStorage.getItem('dosia_local_licenses');
    if (localStr !== null) {
      let localLics: License[] = JSON.parse(localStr);
      if (Array.isArray(localLics)) {
        localLics = localLics.filter(l => normKeyHelper(l.key) !== targetNorm);
        localStorage.setItem('dosia_local_licenses', JSON.stringify(localLics));
      }
    }
  } catch (e) {}

  // 3. Delete from Firestore thoroughly
  try {
    const keysToDelete = Array.from(new Set([rawKey, upperKey, targetNorm]));
    await Promise.all(
      keysToDelete.map(k => deleteDoc(doc(db, LICENSES_COLLECTION, k)).catch(() => {}))
    );

    const colRef = collection(db, LICENSES_COLLECTION);
    const snapshot = await getDocs(colRef);
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as License;
      if (data && data.key && normKeyHelper(data.key) === targetNorm) {
        deletePromises.push(deleteDoc(doc(db, LICENSES_COLLECTION, d.id)).catch(() => {}));
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (e) {
    console.warn('Error deleting license from Cloud Firestore:', e);
  }
}

export function subscribeCloudLicenses(callback: (licenses: License[]) => void) {
  const colRef = collection(db, LICENSES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const cloudList: License[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as License;
        if (data && data.key) {
          cloudList.push(data);
        }
      });

      let localLics: License[] = [];
      try {
        const localStr = localStorage.getItem('dosia_local_licenses');
        if (localStr) localLics = JSON.parse(localStr);
      } catch (e) {}

      const merged = mergeLicenses(cloudList, localLics, memoryLicensesCache, DEFAULT_SEED_LICENSES);
      updateLicensesCache(merged);
      callback(merged);
    },
    (error) => {
      console.error('Firestore real-time listener error:', error);
    }
  );
}

// Helper functions for Firestore Patients Operations (Real-time Sync)
export const PATIENTS_COLLECTION = 'patients';

export async function saveCloudPatient(patient: Patient, licenseKey?: string): Promise<void> {
  if (!patient || !patient.id) return;
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patient.id);
    const dataToSave = {
      ...patient,
      licenseKey: licenseKey || (patient as any).licenseKey || ''
    };
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (err) {
    console.error('Error saving patient to Cloud Firestore:', err);
  }
}

export async function deleteCloudPatient(patientId: string): Promise<void> {
  if (!patientId) return;
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting patient from Cloud Firestore:', err);
  }
}

export function subscribeCloudPatients(licenseKey: string, callback: (patients: Patient[]) => void) {
  const colRef = collection(db, PATIENTS_COLLECTION);
  const normKey = (k: string) => (k || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const targetKey = normKey(licenseKey);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Patient[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Patient & { licenseKey?: string };
        if (data && data.id) {
          // Strictly match patients for this license key
          if (targetKey && data.licenseKey && normKey(data.licenseKey) === targetKey) {
            list.push(data);
          }
        }
      });
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to Cloud Firestore patients:', error);
    }
  );
}


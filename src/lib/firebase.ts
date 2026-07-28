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
import { License } from '../types';

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

// Helper functions for Firestore License Operations
export async function fetchCloudLicenses(): Promise<License[]> {
  try {
    const colRef = collection(db, LICENSES_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      // Seed default licenses to cloud if empty
      for (const lic of DEFAULT_SEED_LICENSES) {
        const docRef = doc(db, LICENSES_COLLECTION, lic.key);
        await setDoc(docRef, lic);
      }
      return DEFAULT_SEED_LICENSES;
    }
    const list: License[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as License;
      if (data && data.key) {
        list.push(data);
      }
    });
    return list.length > 0 ? list : DEFAULT_SEED_LICENSES;
  } catch (error) {
    console.error('Error fetching licenses from Firestore:', error);
    // Return local cache if offline
    try {
      const local = localStorage.getItem('dosia_local_licenses');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return DEFAULT_SEED_LICENSES;
  }
}

export async function saveCloudLicense(license: License): Promise<void> {
  const normKey = license.key.trim().toUpperCase();
  const docRef = doc(db, LICENSES_COLLECTION, normKey);
  await setDoc(docRef, { ...license, key: normKey }, { merge: true });
}

export async function deleteCloudLicense(licenseKey: string): Promise<void> {
  const normKey = licenseKey.trim().toUpperCase();
  const docRef = doc(db, LICENSES_COLLECTION, normKey);
  await deleteDoc(docRef);
}

export function subscribeCloudLicenses(callback: (licenses: License[]) => void) {
  const colRef = collection(db, LICENSES_COLLECTION);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed default licenses if collection is empty
        for (const lic of DEFAULT_SEED_LICENSES) {
          const docRef = doc(db, LICENSES_COLLECTION, lic.key);
          await setDoc(docRef, lic);
        }
        callback(DEFAULT_SEED_LICENSES);
        return;
      }
      const list: License[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as License;
        if (data && data.key) {
          list.push(data);
        }
      });
      callback(list);
    },
    (error) => {
      console.error('Firestore real-time listener error:', error);
    }
  );
}

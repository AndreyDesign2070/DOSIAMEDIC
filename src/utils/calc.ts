import { Medication } from '../types';

/**
 * Calculates Body Surface Area (BSA) using the Mosteller Formula:
 * BSA (m²) = square root of ([Weight (kg) * Height (cm)] / 3600)
 */
export function calculateBSA(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm) return 0;
  return Math.sqrt((weightKg * heightCm) / 3600);
}

/**
 * Calculates Body Mass Index (BMI / IMC):
 * BMI = Weight (kg) / (Height (m))²
 */
export function calculateIMC(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getIMCCategory(imc: number): { label: string; color: string } {
  if (imc < 18.5) return { label: 'Bajo Peso', color: 'text-amber-400' };
  if (imc < 25) return { label: 'Normal (Saludable)', color: 'text-emerald-400' };
  if (imc < 30) return { label: 'Sobrepeso', color: 'text-amber-400' };
  return { label: 'Obesidad', color: 'text-rose-500' };
}

/**
 * Generates a mock QR code SVG as a base64 or inline data uri representing
 * prescription validation.
 */
export function generatePrescriptionQR(prescriptionId: string): string {
  // Simple SVG representation of a clinical QR code
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="white"/>
    <!-- Outer markers -->
    <rect x="5" y="5" width="25" height="25" fill="black" stroke="white" stroke-width="4"/>
    <rect x="11" y="11" width="13" height="13" fill="white"/>
    <rect x="14" y="14" width="7" height="7" fill="black"/>
    
    <rect x="70" y="5" width="25" height="25" fill="black" stroke="white" stroke-width="4"/>
    <rect x="76" y="11" width="13" height="13" fill="white"/>
    <rect x="79" y="79" width="7" height="7" fill="black"/>
    
    <rect x="5" y="70" width="25" height="25" fill="black" stroke="white" stroke-width="4"/>
    <rect x="11" y="76" width="13" height="13" fill="white"/>
    <rect x="14" y="79" width="7" height="7" fill="black"/>
    
    <!-- Custom clinical logo in center -->
    <rect x="42" y="42" width="16" height="16" fill="#0A1128"/>
    <line x1="50" y1="45" x2="50" y2="55" stroke="#48CAE4" stroke-width="4"/>
    <line x1="45" y1="50" x2="55" y2="50" stroke="#48CAE4" stroke-width="4"/>
    
    <!-- Random mock matrix dots -->
    <rect x="35" y="5" width="6" height="6" fill="black"/>
    <rect x="45" y="15" width="6" height="6" fill="black"/>
    <rect x="55" y="5" width="10" height="6" fill="black"/>
    <rect x="5" y="40" width="6" height="12" fill="black"/>
    <rect x="20" y="45" width="12" height="6" fill="black"/>
    <rect x="70" y="40" width="12" height="6" fill="black"/>
    <rect x="85" y="50" width="6" height="18" fill="black"/>
    <rect x="40" y="75" width="18" height="6" fill="black"/>
    <rect x="45" y="85" width="6" height="10" fill="black"/>
    <rect x="75" y="75" width="15" height="15" fill="black"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Calculates dose by weight and gives safe warnings
 */
export function calculateDoseByWeight(
  med: Medication,
  weight: number,
  age: number
): {
  recommendedDoseText: string;
  maxDoseLimitAlert: string | null;
  hasOverdose: boolean;
} {
  if (!weight) {
    return {
      recommendedDoseText: 'Ingrese peso del paciente para calcular',
      maxDoseLimitAlert: null,
      hasOverdose: false
    };
  }

  // Parse medication per-kg dose info
  // Amoxicilina e.g. "40-90 mg/kg/día"
  const isPediatric = age < 12;

  if (isPediatric && med.pediatricDosePerKg) {
    // Basic estimation: Extract range if possible
    const match = med.pediatricDosePerKg.match(/(\d+)-(\d+)\s*mg\/kg/i);
    if (match) {
      const minMgKg = Number(match[1]);
      const maxMgKg = Number(match[2]);
      const minDoseTotal = minMgKg * weight;
      const maxDoseTotal = maxMgKg * weight;
      
      let recommendedDoseText = `Rango sugerido: ${minDoseTotal.toFixed(1)} mg - ${maxDoseTotal.toFixed(1)} mg por día`;
      let maxDoseLimitAlert: string | null = null;
      let hasOverdose = false;

      // Check max daily limits
      if (maxDoseTotal > med.maxDailyDoseMg) {
        recommendedDoseText += ` (Ajustado a dosis máxima de adulto)`;
        maxDoseLimitAlert = `Atención: El cálculo por peso (${maxDoseTotal.toFixed(0)} mg) supera la dosis máxima diaria recomendada de ${med.maxDailyDoseMg} mg. Reducir dosis total.`;
        hasOverdose = true;
      }

      return { recommendedDoseText, maxDoseLimitAlert, hasOverdose };
    }
  }

  return {
    recommendedDoseText: `Dosis estándar adulto: ${med.adultDose}`,
    maxDoseLimitAlert: null,
    hasOverdose: false
  };
}

import React, { useState, useEffect } from 'react';
import { 
  Pill, Activity, ShieldAlert, HeartPulse, Stethoscope, CheckCircle2, 
  Copy, Printer, X, Sparkles, AlertCircle, FileText, ChevronRight, 
  Edit3, Share2, Download, FolderPlus, Plus, Trash2, Save, Undo 
} from 'lucide-react';
import { EMREntry } from '../types';

export interface PatientTreatmentData {
  name: string;
  category: 'ADULTO' | 'PEDIÁTRICO';
  age: number;
  weight: number;
  height: number;
  bloodGroup: string;
  status: string;
  sex?: 'M' | 'F';
  cardId?: string;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
    painScale?: number;
    glycemia?: number;
    diuresis?: number;
    glasgow?: number;
  };
  allergies?: string[];
  chronicDiseases?: string[];
}

export interface MedicationItem {
  name: string;
  indication: string;
  doseMg: string;
  volumeMl?: string;
  route: string;
  frequency: string;
  duration: string;
  notes?: string;
}

interface TreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: PatientTreatmentData | null;
  onSaveToEMR?: (entry: EMREntry) => void;
}

export default function TreatmentModal({ isOpen, onClose, patientData, onSaveToEMR }: TreatmentModalProps) {
  const [copied, setCopied] = useState(false);
  const [savedToEmr, setSavedToEmr] = useState(false);
  const [activeTab, setActiveTab] = useState<'farmaco' | 'conducta' | 'pruebas' | 'alarmas'>('farmaco');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [conductText, setConductText] = useState<string>('');
  const [testsText, setTestsText] = useState<string>('');
  const [alarmsText, setAlarmsText] = useState<string>('');

  // Initial calculation when patientData changes
  useEffect(() => {
    if (!patientData) return;

    const isPediatric = patientData.category === 'PEDIÁTRICO' || patientData.age < 15;
    const weight = Number(patientData.weight) || (isPediatric ? 15 : 70);
    const vitals = patientData.vitalSigns || {};
    const temp = vitals.temperature ?? 36.5;
    const pain = vitals.painScale ?? 0;
    const spo2 = vitals.oxygenSaturation ?? 98;
    const glycemia = vitals.glycemia ?? 100;
    const allergies = patientData.allergies || [];
    const hasPenicillinAllergy = allergies.some(a => a.toLowerCase().includes('penicil') || a.toLowerCase().includes('amoxi'));

    let initialMeds: MedicationItem[] = [];

    if (isPediatric) {
      const paracetamolMg = Math.round(weight * 15);
      const paracetamolMl = ((paracetamolMg * 5) / 120).toFixed(1);
      const ibuprofenoMg = Math.round(weight * 10);
      const ibuprofenoMl = ((ibuprofenoMg * 5) / 100).toFixed(1);
      const amoxiMgPerDose = Math.round((weight * 45) / 3);
      const amoxiMlPerDose = ((amoxiMgPerDose * 5) / 250).toFixed(1);

      initialMeds.push({
        name: 'Paracetamol (Jarabe 120 mg / 5 mL)',
        indication: temp >= 37.8 ? 'Fiebre activa / Antipirético primera línea' : 'Analgésico / Antipirético sintomático',
        doseMg: `${paracetamolMg} mg`,
        volumeMl: `${paracetamolMl} mL`,
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 6 a 8 horas',
        duration: '3 a 5 días',
        notes: 'Administrar con T° > 37.5 °C o en caso de dolor.'
      });

      if (pain > 0 || temp >= 37.8) {
        initialMeds.push({
          name: 'Ibuprofeno (Suspensión 100 mg / 5 mL)',
          indication: 'Antiinflamatorio / Analgésico coadyuvante',
          doseMg: `${ibuprofenoMg} mg`,
          volumeMl: `${ibuprofenoMl} mL`,
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 8 horas con alimentos',
          duration: '3 días',
          notes: 'Alternar con paracetamol si persiste la fiebre.'
        });
      }

      if (!hasPenicillinAllergy) {
        initialMeds.push({
          name: 'Amoxicilina (Jarabe 250 mg / 5 mL)',
          indication: 'Antibiótico de amplio espectro (si hay foco infeccioso bacteriano)',
          doseMg: `${amoxiMgPerDose} mg`,
          volumeMl: `${amoxiMlPerDose} mL`,
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 8 horas',
          duration: '7 a 10 días',
          notes: 'Completar esquema completo según indicación del médico.'
        });
      } else {
        const azitroMg = Math.round(weight * 10);
        const azitroMl = ((azitroMg * 5) / 200).toFixed(1);
        initialMeds.push({
          name: 'Azitromicina (Suspensión 200 mg / 5 mL)',
          indication: 'Macrólido alternativo (Alergia a Penicilinas)',
          doseMg: `${azitroMg} mg`,
          volumeMl: `${azitroMl} mL`,
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 24 horas',
          duration: '3 a 5 días',
          notes: 'Tomar 1 hora antes o 2 horas después de comidas.'
        });
      }

      initialMeds.push({
        name: 'Sales de Rehidratación Oral (SRO)',
        indication: 'Mantenimiento hidroelectrolítico y prevención de deshidratación',
        doseMg: '50 - 100 mL / kg',
        volumeMl: 'A demanda',
        route: 'Vía Oral a sorbos pequeños',
        frequency: 'A libre demanda tras cada evacuación o episodio febril',
        duration: 'Durante el cuadro agudo',
        notes: 'Plan A de rehidratación oral.'
      });
    } else {
      // Adult
      initialMeds.push({
        name: 'Paracetamol Tabletas 500 mg - 1 g',
        indication: temp >= 37.8 ? 'Antipirético / Analgésico' : 'Analgésico de primera línea',
        doseMg: '500 mg a 1000 mg',
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 8 horas (Máx. 4g/día)',
        duration: '3 a 5 días',
        notes: 'Tomar con abundante agua.'
      });

      initialMeds.push({
        name: 'Ibuprofeno Tabletas 400 mg / Ketorolaco 10 mg',
        indication: 'Antiinflamatorio y analgésico sintomático',
        doseMg: '400 mg',
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 8 horas tras comidas',
        duration: '3 a 5 días',
        notes: 'Precaución en insuficiencia renal o úlcera gástrica.'
      });

      initialMeds.push({
        name: 'Omeprazol Cápsulas 20 mg',
        indication: 'Protector gástrico / Inhibidor de la bomba de protones',
        doseMg: '20 mg',
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 24 horas en ayunas',
        duration: '7 a 14 días',
        notes: 'Tomar 30 minutos antes del desayuno.'
      });

      if (!hasPenicillinAllergy) {
        initialMeds.push({
          name: 'Amoxicilina + Ácido Clavulánico 875/125 mg Tabletas',
          indication: 'Tratamiento antibiótico de cobertura amplia',
          doseMg: '1 Tableta (875/125 mg)',
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 12 horas',
          duration: '7 a 10 días',
          notes: 'Tomar al inicio de una comida principal.'
        });
      } else {
        initialMeds.push({
          name: 'Levofloxacino 500 mg / Azitromicina 500 mg',
          indication: 'Antibiótico alternativo para alérgicos a Penicilinas',
          doseMg: '500 mg',
          route: 'Vía Oral (V.O.)',
          frequency: 'Cada 24 horas',
          duration: '5 a 7 días',
          notes: 'Monitorear respuesta clínica.'
        });
      }
    }

    if (spo2 < 95) {
      initialMeds.unshift({
        name: 'Oxigenoterapia por Cánula Nasal',
        indication: 'Corrección de Hipoxemia (SpO2 < 95%)',
        doseMg: '2 a 4 Litros / minuto',
        route: 'Inhalatoria',
        frequency: 'Continua',
        duration: 'Hasta SpO2 ≥ 95%',
        notes: '🚨 Monitorear patrón respiratorio y pulsioximetría continua.'
      });
    }

    if (glycemia < 70) {
      initialMeds.unshift({
        name: 'Dextrosa al 10% / Solución Glucosada',
        indication: 'Corrección inmediata de Hipoglucemia (< 70 mg/dL)',
        doseMg: isPediatric ? `${(weight * 2).toFixed(0)} mL Dextrosa 10% IV bolus` : '50 mL Dextrosa 33% IV o oral',
        route: 'Intravenosa / Vía Oral',
        frequency: 'Inmediata',
        duration: 'Reevaluar en 15 minutos',
        notes: '🚨 Repetir glucometría capilar en 15 min.'
      });
    }

    setMedications(initialMeds);
    setConductText(
      `1. Mantener posición Semifowler (30°).\n` +
      `2. Monitorear signos vitales cada ${isPediatric ? '2' : '4'} horas.\n` +
      `3. Hydratación oral abundante (2.5L/día) o SRO a libre demanda.\n` +
      `4. Vigilancia de diuresis estricta (> ${isPediatric ? '1.5' : '0.5'} mL/kg/h).\n` +
      `5. Administrar antipiréticos/analgésicos si T° > 37.5°C o dolor EVA ≥ 3.`
    );
    setTestsText(
      `• Biometría Hemática Completa (BHC)\n` +
      `• Proteína C Reactiva (PCR) / VSG\n` +
      `• Química Sanguínea (Glucosa, Urea, Creatinina)\n` +
      `• Examen General de Orina (EGO)\n` +
      `• Radiografía de Tórax PA / Ecografía Abdominal (según sospecha clínica)`
    );
    setAlarmsText(
      `🚨 Dificultad Respiratoria (Tiraje, taquipnea o SpO2 < 92%)\n` +
      `🚨 Somnolencia marcada o alteración del estado mental (Glasgow < 14)\n` +
      `🚨 Fiebre persistente > 38.5°C resistente a antipiréticos por > 48h\n` +
      `🚨 Vómitos incoercibles o intolerancia completa a la vía oral`
    );
    setIsEditing(false);
    setSavedToEmr(false);
  }, [patientData]);

  if (!isOpen || !patientData) return null;

  const isPediatric = patientData.category === 'PEDIÁTRICO' || patientData.age < 15;
  const weight = Number(patientData.weight) || (isPediatric ? 15 : 70);
  const heightM = (Number(patientData.height) || 160) / 100;
  const bmi = weight && heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : '22.0';

  const vitals = patientData.vitalSigns || {};
  const temp = vitals.temperature ?? 36.5;
  const hr = vitals.heartRate ?? 80;
  const bp = vitals.bloodPressure ?? '120/80';
  const spo2 = vitals.oxygenSaturation ?? 98;
  const pain = vitals.painScale ?? 0;
  const glycemia = vitals.glycemia ?? 100;
  const glasgow = vitals.glasgow ?? 15;

  const allergies = patientData.allergies || [];
  const chronic = patientData.chronicDiseases || [];

  // Medication handlers in Edit mode
  const handleUpdateMedication = (index: number, field: keyof MedicationItem, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      {
        name: 'Nuevo Medicamento',
        indication: 'Sintomático',
        doseMg: isPediatric ? `${weight * 10} mg` : '500 mg',
        route: 'Vía Oral (V.O.)',
        frequency: 'Cada 8 horas',
        duration: '5 días',
        notes: ''
      }
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  // Generate plain text summary
  const generatePlainTextSummary = () => {
    let summary = `🩺 ESQUEMA DE TRATAMIENTO MÉDICO PRESCRITO - DOSIA CLINICAL 2026\n`;
    summary += `--------------------------------------------------------\n`;
    summary += `👤 Paciente: ${patientData.name}\n`;
    summary += `📋 Categoría: ${patientData.category} | Edad: ${patientData.age} años | Peso: ${weight} kg | Talla: ${patientData.height} cm (IMC: ${bmi})\n`;
    summary += `🩸 Grupo Sanguíneo: ${patientData.bloodGroup} | Estado: ${patientData.status}\n`;
    if (allergies.length > 0) summary += `🔴 Alergias: ${allergies.join(', ')}\n`;
    if (chronic.length > 0) summary += `🟠 Enferm. Crónicas: ${chronic.join(', ')}\n`;
    summary += `\n📊 SIGNOS VITALES BASE:\n`;
    summary += `• T°: ${temp}°C | FC: ${hr} bpm | PA: ${bp} | SpO2: ${spo2}% | Glasgow: ${glasgow}/15 | Dolor EVA: ${pain}/10 | Glucemia: ${glycemia} mg/dL\n\n`;
    summary += `💊 MEDICAMENTOS Y DOSIS PRESCRITAS:\n`;
    medications.forEach((m, idx) => {
      summary += `${idx + 1}. ${m.name}\n`;
      summary += `   • Indicación: ${m.indication}\n`;
      summary += `   • Dosis: ${m.doseMg} ${m.volumeMl ? `(${m.volumeMl})` : ''} | Vía: ${m.route}\n`;
      summary += `   • Frecuencia: ${m.frequency} | Duración: ${m.duration}\n`;
      if (m.notes) summary += `   • Nota: ${m.notes}\n`;
      summary += `\n`;
    });
    summary += `📋 CONDUCTA MÉDICA:\n${conductText}\n\n`;
    summary += `🔬 PRUEBAS RECOMENDADAS:\n${testsText}\n\n`;
    summary += `🚨 CRITERIOS DE ALARMA:\n${alarmsText}\n`;
    return summary;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatePlainTextSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = generatePlainTextSummary();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Tratamiento Médico - ${patientData.name}</title>
            <style>
              @page { size: letter; margin: 15mm; }
              body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px; }
              .header { border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
              .header h1 { color: #047857; margin: 0; font-size: 22px; }
              .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; }
              .med-item { border-bottom: 1px solid #e2e8f0; padding: 10px 0; font-size: 13px; }
              .med-title { font-weight: bold; color: #047857; font-size: 14px; }
              .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; }
              .section-title { font-size: 15px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #059669; margin-top: 20px; padding-bottom: 4px; }
              .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; pt-15px; font-size: 11px; color: #64748b; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1>🩺 DOSIA CLINICAL 2026</h1>
                <div style="font-size: 12px; color: #64748b;">Esquema de Tratamiento Médico y Prescripción</div>
              </div>
              <div style="text-align: right; font-size: 11px; color: #64748b;">
                Fecha: ${new Date().toLocaleDateString('es-ES')}<br/>
                HC: ${patientData.cardId || 'S/N'}
              </div>
            </div>

            <div class="box">
              <strong>Paciente:</strong> ${patientData.name} &nbsp;|&nbsp; <strong>Edad:</strong> ${patientData.age} años (${patientData.category})<br/>
              <strong>Peso:</strong> ${weight} kg &nbsp;|&nbsp; <strong>Talla:</strong> ${patientData.height} cm (IMC: ${bmi}) &nbsp;|&nbsp; <strong>Grupo S.:</strong> ${patientData.bloodGroup}<br/>
              <strong>Signos Vitales:</strong> T° ${temp}°C | FC ${hr} bpm | PA ${bp} | SpO2 ${spo2}% | Glasgow ${glasgow}/15
            </div>

            <div class="section-title">💊 MEDICAMENTOS Y PRESCRIPCIÓN</div>
            ${medications.map((m, i) => `
              <div class="med-item">
                <div class="med-title">${i + 1}. ${m.name}</div>
                <div><strong>Indicación:</strong> ${m.indication}</div>
                <div><strong>Dosis:</strong> <span class="badge">${m.doseMg} ${m.volumeMl ? `(${m.volumeMl})` : ''}</span> | <strong>Vía:</strong> ${m.route}</div>
                <div><strong>Frecuencia:</strong> ${m.frequency} | <strong>Duración:</strong> ${m.duration}</div>
                ${m.notes ? `<div style="color: #64748b; font-size: 12px; margin-top: 2px;"><em>Nota: ${m.notes}</em></div>` : ''}
              </div>
            `).join('')}

            <div class="section-title">📋 CONDUCTA MÉDICA GUÍA</div>
            <pre style="font-family: inherit; font-size: 12px; white-space: pre-wrap; background: #f8fafc; padding: 10px; border-radius: 6px;">${conductText}</pre>

            <div class="section-title">🚨 CRITERIOS DE ALARMA</div>
            <pre style="font-family: inherit; font-size: 12px; white-space: pre-wrap; color: #991b1b; background: #fef2f2; padding: 10px; border-radius: 6px;">${alarmsText}</pre>

            <div class="footer">
              <br/><br/>
              ___________________________________________<br/>
              Firma y Sello del Médico Tratante / Certificación DOSIA 2026
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const handleSaveToEMR = () => {
    const cardIdKey = patientData.cardId || patientData.name.toLowerCase().replace(/\s+/g, '_');
    
    const newEntry: EMREntry = {
      id: `emr-treat-${Date.now()}`,
      patientId: cardIdKey,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctorName: 'Dr. Médico Tratante',
      type: 'Receta',
      diagnosis: `Tratamiento Médico Prescrito (${patientData.category})`,
      summary: `Tratamiento registrado con ${medications.length} medicamento(s). Dosis ajustadas por peso (${weight} kg).`,
      soapDetails: {
        s: `Paciente ${patientData.name}, ${patientData.age} años. Alergias: ${allergies.join(', ') || 'Ninguna'}.`,
        o: `T°: ${temp}°C, FC: ${hr} bpm, PA: ${bp}, SpO2: ${spo2}%, Peso: ${weight} kg.`,
        a: `Esquema de tratamiento clínico prescrito y ajustado por el profesional de salud.`,
        p: medications.map(m => `${m.name}: ${m.doseMg} ${m.frequency} por ${m.duration}`).join('\n')
      },
      prescriptions: medications.map((m, idx) => ({
        id: `med-${idx}-${Date.now()}`,
        name: m.name,
        activeIngredient: m.name,
        dose: m.doseMg,
        frequency: m.frequency,
        duration: m.duration,
        notes: m.notes
      }))
    };

    // Save locally
    const storageKey = `dosia_emr_entries_${cardIdKey}`;
    try {
      const existing = localStorage.getItem(storageKey);
      const parsed = existing ? JSON.parse(existing) : [];
      localStorage.setItem(storageKey, JSON.stringify([newEntry, ...parsed]));
    } catch (e) {
      console.error('Error saving to localStorage EMR:', e);
    }

    if (onSaveToEMR) {
      onSaveToEMR(newEntry);
    }

    setSavedToEmr(true);
    setTimeout(() => setSavedToEmr(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-brand-navy-light border border-slate-700/80 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden relative">
        
        {/* Header Bar - Green Gradient with White EDITAR Button */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-brand-navy border-b border-emerald-500/40 p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shadow-lg shadow-emerald-950/50">
              <Pill className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Esquema de Tratamiento Clínico
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold">
                    {patientData.category}
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Dosis ajustadas para <strong className="text-emerald-300 font-mono">{weight} kg</strong> y constantes vitales.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* White EDITAR Button */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Permite modificar medicamentos, dosis y guía de tratamiento"
            >
              <Edit3 className="w-4 h-4 text-slate-800" />
              <span>{isEditing ? 'Vista Previa' : 'EDITAR'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Clinical Info Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-3 sm:p-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase text-[9px] font-sans">Paciente</span>
              <span className="text-white font-bold truncate block">{patientData.name}</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase text-[9px] font-sans">Edad / Categoría</span>
              <span className="text-amber-300 font-bold">{patientData.age} años ({patientData.category})</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase text-[9px] font-sans">Peso / Talla / IMC</span>
              <span className="text-brand-teal font-bold">{weight} kg | {patientData.height} cm ({bmi})</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase text-[9px] font-sans">Grupo S. / Estado</span>
              <span className="text-rose-300 font-bold">{patientData.bloodGroup} | {patientData.status}</span>
            </div>
          </div>

          {/* Clinical Alerts Strip if any */}
          {(temp >= 37.8 || spo2 < 95 || glasgow < 15 || glycemia < 70 || allergies.length > 0) && (
            <div className="mt-2.5 bg-rose-950/40 border border-rose-500/40 p-2.5 rounded-xl text-[11px] flex flex-wrap items-center gap-2 text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold">Hallazgos y Alertas Relevantes:</span>
              {temp >= 37.8 && <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">🔥 Fiebre ({temp}°C)</span>}
              {spo2 < 95 && <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">🫁 Hipoxemia ({spo2}%)</span>}
              {glasgow < 15 && <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">🧠 Glasgow ({glasgow}/15)</span>}
              {glycemia < 70 && <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">🩸 Hipoglucemia ({glycemia} mg/dL)</span>}
              {allergies.length > 0 && <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">🔴 Alergias: {allergies.join(', ')}</span>}
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 text-xs font-bold px-4 gap-1 pt-2">
          <button
            onClick={() => setActiveTab('farmaco')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'farmaco'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Pill className="w-4 h-4" /> 💊 Medicamentos ({medications.length})
          </button>

          <button
            onClick={() => setActiveTab('conducta')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'conducta'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4" /> 📋 Conducta Médica
          </button>

          <button
            onClick={() => setActiveTab('pruebas')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pruebas'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" /> 🔬 Pruebas Sugeridas
          </button>

          <button
            onClick={() => setActiveTab('alarmas')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'alarmas'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> 🚨 Criterios de Alarma
          </button>
        </div>

        {/* Modal Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 max-h-[50vh] scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* TAB 1: FARMACOS Y DOSIS */}
          {activeTab === 'farmaco' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Esquema farmacológico para <strong className="text-white">{weight} kg</strong>:</span>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Agregar Medicamento
                  </button>
                ) : (
                  <span className="text-emerald-400 font-bold">✓ Dosis validadas por peso</span>
                )}
              </div>

              <div className="space-y-3">
                {medications.map((med, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 p-4 rounded-2xl transition-all space-y-2 shadow-sm relative"
                  >
                    {isEditing ? (
                      /* EDITABLE MEDICATION ROW */
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => handleUpdateMedication(index, 'name', e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold text-sm w-full focus:outline-none focus:border-emerald-400"
                            placeholder="Nombre del Medicamento"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(index)}
                            className="p-2 bg-rose-950/60 text-rose-400 hover:bg-rose-900 rounded-lg border border-rose-800 transition-all cursor-pointer shrink-0"
                            title="Eliminar medicamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={med.indication}
                          onChange={(e) => handleUpdateMedication(index, 'indication', e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-emerald-300 text-xs w-full focus:outline-none focus:border-emerald-400"
                          placeholder="Indicación clínica"
                        />

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">Dosis (mg/vol)</label>
                            <input
                              type="text"
                              value={med.doseMg}
                              onChange={(e) => handleUpdateMedication(index, 'doseMg', e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs w-full"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">Vía</label>
                            <input
                              type="text"
                              value={med.route}
                              onChange={(e) => handleUpdateMedication(index, 'route', e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs w-full"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">Frecuencia</label>
                            <input
                              type="text"
                              value={med.frequency}
                              onChange={(e) => handleUpdateMedication(index, 'frequency', e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs w-full"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">Duración</label>
                            <input
                              type="text"
                              value={med.duration}
                              onChange={(e) => handleUpdateMedication(index, 'duration', e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs w-full"
                            />
                          </div>
                        </div>

                        <input
                          type="text"
                          value={med.notes || ''}
                          onChange={(e) => handleUpdateMedication(index, 'notes', e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-slate-300 text-xs w-full italic"
                          placeholder="Notas o precauciones..."
                        />
                      </div>
                    ) : (
                      /* VIEW ONLY MEDICATION CARD */
                      <>
                        <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="bg-emerald-500/20 text-emerald-300 font-mono text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                                {index + 1}
                              </span>
                              {med.name}
                            </h4>
                            <p className="text-xs text-emerald-400 font-medium mt-0.5">
                              🎯 {med.indication}
                            </p>
                          </div>

                          <span className="bg-slate-950 text-slate-300 border border-slate-700 text-[10px] font-mono px-2 py-1 rounded-lg shrink-0">
                            {med.route}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Dosis Calculada</span>
                            <span className="text-emerald-300 font-mono font-bold text-sm">
                              {med.doseMg} {med.volumeMl ? `(${med.volumeMl})` : ''}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Frecuencia</span>
                            <span className="text-white font-semibold">{med.frequency}</span>
                          </div>

                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Duración</span>
                            <span className="text-slate-200 font-semibold">{med.duration}</span>
                          </div>
                        </div>

                        {med.notes && (
                          <p className="text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl italic border border-slate-800/60">
                            💡 {med.notes}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CONDUCTA MEDICA */}
          {activeTab === 'conducta' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Stethoscope className="w-4 h-4 text-emerald-400" /> Guía de Actuación Médica Inmediata
                </h4>

                {isEditing ? (
                  <textarea
                    rows={6}
                    value={conductText}
                    onChange={(e) => setConductText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-400"
                  />
                ) : (
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                    {conductText}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRUEBAS SUGERIDAS */}
          {activeTab === 'pruebas' && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Estudios de Laboratorio e Imagenología Recomendados
                </h4>

                {isEditing ? (
                  <textarea
                    rows={6}
                    value={testsText}
                    onChange={(e) => setTestsText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-400"
                  />
                ) : (
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                    {testsText}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ALARMAS */}
          {activeTab === 'alarmas' && (
            <div className="space-y-3 text-xs">
              <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-2xl space-y-3">
                <h4 className="font-bold text-rose-300 text-sm flex items-center gap-2 border-b border-rose-500/30 pb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> Signos de Alarma y Criterios de Urgencia Inmediata
                </h4>

                {isEditing ? (
                  <textarea
                    rows={6}
                    value={alarmsText}
                    onChange={(e) => setAlarmsText(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-800/80 rounded-xl p-3 text-rose-200 font-mono text-xs focus:outline-none focus:border-rose-400"
                  />
                ) : (
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                    {alarmsText}
                  </pre>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Toast feedback for saving to EMR */}
        {savedToEmr && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 px-4 py-2 mx-4 text-xs rounded-xl flex items-center justify-center gap-2 animate-fade-in font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ¡Tratamiento guardado exitosamente en el Historial Clínico del paciente!
          </div>
        )}

        {/* Footer Actions Bar - Complete Actions Suite */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* COPY */}
            <button
              onClick={handleCopy}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar texto plano al portapapeles"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>

            {/* GREEN WHATSAPP BUTTON */}
            <button
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl border border-emerald-400/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/40"
              title="Compartir esquema de tratamiento por WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-100" />
              <span>WhatsApp</span>
            </button>

            {/* BLUE DESCARGAR PDF BUTTON */}
            <button
              onClick={handleDownloadPDF}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-xl border border-blue-400/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-950/40"
              title="Generar y descargar documento PDF"
            >
              <Download className="w-4 h-4 text-blue-100" />
              <span>Descargar PDF</span>
            </button>

            {/* PRINT BUTTON */}
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              title="Imprimir prescripción"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            {/* SAVE TO EMR BUTTON */}
            <button
              onClick={handleSaveToEMR}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl border border-indigo-400/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-950/40"
              title="Guardar como registro en el Historial Clínico del Paciente"
            >
              <FolderPlus className="w-4 h-4 text-indigo-100" />
              <span>{savedToEmr ? '✓ Guardado' : 'Guardar en Historial'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2 rounded-xl transition-all cursor-pointer border border-slate-700"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

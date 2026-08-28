import React, { useState, useEffect } from 'react';
import { 
  Pill, Activity, ShieldAlert, HeartPulse, Stethoscope, CheckCircle2, 
  Copy, Printer, Sparkles, AlertCircle, FileText, ChevronDown, ChevronUp,
  Edit3, Share2, Download, FolderPlus, Plus, Trash2, Save, Undo, Calculator,
  Search, Check, RefreshCw, Info, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Patient, Medication, EMREntry } from '../types';
import { INITIAL_MEDICATIONS } from '../data';

export interface MedicationItem {
  id?: string;
  name: string;
  indication: string;
  doseMg: string;
  volumeMl?: string;
  route: string;
  frequency: string;
  duration: string;
  notes?: string;
}

interface PatientTreatmentSectionProps {
  patient: Patient | null;
  onSaveToEMR?: (entry: EMREntry) => void;
  onUpdatePatient?: (updated: Patient) => void;
  onOpenNewPatientModal?: () => void;
}

export default function PatientTreatmentSection({
  patient,
  onSaveToEMR,
  onUpdatePatient,
  onOpenNewPatientModal
}: PatientTreatmentSectionProps) {
  if (!patient) {
    return (
      <div className="bg-brand-navy-light/40 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-5 max-w-xl mx-auto my-6 backdrop-blur-md animate-fade-in shadow-2xl">
        <div className="w-16 h-16 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal rounded-full flex items-center justify-center mx-auto">
          <Pill className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white font-display">Ningún Paciente Seleccionado</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Seleccione un paciente de la lista o registre un nuevo paciente para generar el diagnóstico, esquema terapéutico y cálculo de dosis automático.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          {onOpenNewPatientModal && (
            <button
              type="button"
              onClick={onOpenNewPatientModal}
              className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-5 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-teal/20"
            >
              <Plus className="w-4 h-4" /> Registrar Nuevo Paciente
            </button>
          )}
        </div>
      </div>
    );
  }

  const isPediatric = (patient.patientCategory || (patient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')) === 'PEDIÁTRICO';
  const weight = Number(patient.weight) || (isPediatric ? 15 : 70);
  const vitals = patient.vitalSigns;
  const temp = vitals?.temperature ?? 36.5;
  const pain = vitals?.painEva ?? 0;
  const spo2 = vitals?.oxygenSaturation ?? 98;
  const glycemia = vitals?.glycemia ?? 100;
  const hr = vitals?.heartRate ?? 80;
  const allergies = patient.allergies || patient.alerts?.allergies || [];
  const chronicDiseases = patient.preExistingConditions || patient.alerts?.chronicDiseases || [];

  // Active Tab within Treatment
  const [activeTab, setActiveTab] = useState<'farmacos' | 'conducta' | 'pruebas' | 'alarmas' | 'calculadora'>('farmacos');
  
  // Treatment components
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [conductText, setConductText] = useState<string>('');
  const [testsText, setTestsText] = useState<string>('');
  const [alarmsText, setAlarmsText] = useState<string>('');
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToEmr, setSavedToEmr] = useState(false);

  // Vademecum Dropdown State
  const [isVademecumOpen, setIsVademecumOpen] = useState(false);
  const [vademecumSearch, setVademecumSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS');

  // Dose Calculator State
  const [calcWeight, setCalcWeight] = useState<number>(weight);
  const [calcMgPerKg, setCalcMgPerKg] = useState<number>(15);
  const [calcConcentrationMg, setCalcConcentrationMg] = useState<number>(120);
  const [calcConcentrationMl, setCalcConcentrationMl] = useState<number>(5);
  const [calcFrequency, setCalcFrequency] = useState<string>('Cada 8 horas');
  const [calcDrugName, setCalcDrugName] = useState<string>('Paracetamol Jarabe');

  // Sync weight when patient changes
  useEffect(() => {
    setCalcWeight(Number(patient.weight) || (isPediatric ? 15 : 70));
  }, [patient.id, patient.weight, isPediatric]);

  // Initial Calculation based on patient data & vital signs
  const generateInitialScheme = () => {
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
      `3. Hidratación oral abundante (2.5L/día) o SRO a libre demanda.\n` +
      `4. Vigilancia de diuresis estricta (> ${isPediatric ? '1.5' : '0.5'} mL/kg/h).\n` +
      `5. Administrar antipiréticos/analgésicos si T° > 37.5°C o dolor EVA ≥ 3.`
    );
    setTestsText(
      `• Biometría Hemática Completa (BHC)\n` +
      `• Proteína C Reactiva (PCR) / VSG\n` +
      `• Química Sanguínea (Glucosa, Urea, Creatinina)\n` +
      `• Examen General de Orina (EGO)\n` +
      `• Radiografía de Tórax PA / Ecografía Abdominal (según criterio médico)`
    );
    setAlarmsText(
      `🚨 Dificultad Respiratoria (Tiraje intercostal, taquipnea o SpO2 < 92%)\n` +
      `🚨 Somnolencia marcada o alteración del estado mental (Glasgow < 14)\n` +
      `🚨 Fiebre persistente > 38.5°C resistente a antipiréticos por > 48h\n` +
      `🚨 Vómitos incoercibles o intolerancia completa a la vía oral\n` +
      `🚨 Convulsiones o rigidez de nuca`
    );
    setIsEditing(false);
    setSavedToEmr(false);
  };

  useEffect(() => {
    generateInitialScheme();
  }, [patient.id]);

  // Handler to add drug from Vademecum dropdown
  const handleSelectVademecumDrug = (med: Medication) => {
    let doseMg = med.adultDose;
    let volumeMl = '';
    let notes = med.mechanismOfAction ? `Mecanismo: ${med.mechanismOfAction.substring(0, 70)}...` : '';

    if (isPediatric && med.pediatricDosePerKg) {
      const match = med.pediatricDosePerKg.match(/(\d+)/);
      const doseNum = match ? parseInt(match[0]) : 15;
      const totalMg = Math.round(weight * doseNum);
      doseMg = `${totalMg} mg (${doseNum} mg/kg/dosis)`;
      
      // Auto estimate mL if suspension
      if (med.presentation.toLowerCase().includes('120 mg') || med.presentation.toLowerCase().includes('120mg')) {
        volumeMl = `${((totalMg * 5) / 120).toFixed(1)} mL`;
      } else if (med.presentation.toLowerCase().includes('250 mg') || med.presentation.toLowerCase().includes('250mg')) {
        volumeMl = `${((totalMg * 5) / 250).toFixed(1)} mL`;
      } else if (med.presentation.toLowerCase().includes('100 mg') || med.presentation.toLowerCase().includes('100mg')) {
        volumeMl = `${((totalMg * 5) / 100).toFixed(1)} mL`;
      } else if (med.presentation.toLowerCase().includes('200 mg') || med.presentation.toLowerCase().includes('200mg')) {
        volumeMl = `${((totalMg * 5) / 200).toFixed(1)} mL`;
      }
    }

    const newItem: MedicationItem = {
      name: `${med.name} (${med.presentation})`,
      indication: med.indications[0] || 'Indicación terapéutica',
      doseMg: doseMg,
      volumeMl: volumeMl,
      route: med.adminRoute || 'Vía Oral',
      frequency: isPediatric ? 'Cada 8 horas' : 'Cada 8 a 12 horas',
      duration: '5 a 7 días',
      notes: notes
    };

    setMedications(prev => [newItem, ...prev]);
    setIsVademecumOpen(false);
  };

  // Add calculated dose from Calculator
  const handleInsertCalculatedDose = () => {
    const singleDoseMg = Math.round(calcWeight * calcMgPerKg);
    const volumePerDoseMl = calcConcentrationMg > 0 ? ((singleDoseMg * calcConcentrationMl) / calcConcentrationMg).toFixed(1) : '0';

    const newItem: MedicationItem = {
      name: `${calcDrugName} (${calcConcentrationMg}mg/${calcConcentrationMl}mL)`,
      indication: 'Dosificación calculada por peso exacto',
      doseMg: `${singleDoseMg} mg por toma (${calcMgPerKg} mg/kg)`,
      volumeMl: `${volumePerDoseMl} mL por toma`,
      route: 'Vía Oral',
      frequency: calcFrequency,
      duration: '3 a 5 días',
      notes: `Peso base: ${calcWeight} kg. Dosis total calculada.`
    };

    setMedications(prev => [newItem, ...prev]);
    setActiveTab('farmacos');
  };

  // Filtered Vademecum list
  const filteredVademecum = INITIAL_MEDICATIONS.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(vademecumSearch.toLowerCase()) ||
      med.genericName.toLowerCase().includes(vademecumSearch.toLowerCase()) ||
      med.category.toLowerCase().includes(vademecumSearch.toLowerCase()) ||
      med.indications.some(ind => ind.toLowerCase().includes(vademecumSearch.toLowerCase()));
    
    if (selectedCategoryFilter === 'TODOS') return matchesSearch;
    return matchesSearch && med.category.toLowerCase().includes(selectedCategoryFilter.toLowerCase());
  });

  // Export handlers
  const getCleanPlainText = () => {
    return `========================================
PRESCRIPCIÓN Y ESQUEMA TERAPÉUTICO
DOSIA - EXPEDIENTE CLÍNICO INTELIGENTE
========================================
PACIENTE: ${patient.name} (${patient.patientCategory || (patient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')})
CÉDULA / HC: ${patient.cardId} | ${patient.hcNumber}
EDAD: ${patient.age} años | PESO: ${patient.weight} kg | TALLA: ${patient.height} cm
SIGNOS VITALES: PA: ${vitals?.bloodPressure || '120/80'} | FC: ${vitals?.heartRate || 80} lpm | T°: ${vitals?.temperature || 36.5} °C | SpO2: ${vitals?.oxygenSaturation || 98}%
ALERGIAS: ${allergies.length > 0 ? allergies.join(', ') : 'Ninguna conocida'}
----------------------------------------
I. ESQUEMA FARMACOLÓGICO Y DOSIS:
${medications.map((m, idx) => `
${idx + 1}. ${m.name}
   - Dosis: ${m.doseMg} ${m.volumeMl ? `(${m.volumeMl})` : ''}
   - Vía: ${m.route} | Frecuencia: ${m.frequency} | Duración: ${m.duration}
   - Indicación: ${m.indication}
   ${m.notes ? `- Observaciones: ${m.notes}` : ''}`).join('\n')}

II. CONDUCTA Y CUIDADOS GENERALES:
${conductText}

III. ESTUDIOS Y LABORATORIO SUGERIDOS:
${testsText}

IV. SIGNOS DE ALARMA / RED FLAGS:
${alarmsText}

----------------------------------------
Médico Tratante: ${patient.attendingDoctor || 'Médico Autorizado'}
Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
========================================`;
  };

  const handleCopy = () => {
    const text = getCleanPlainText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getCleanPlainText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permita las ventanas emergentes para generar el PDF');
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescripción Médica - ${patient.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.4; }
            .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .title { color: #0f766e; font-size: 20px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
            .patient-card { background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .section-title { color: #0f766e; font-size: 13px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px; text-transform: uppercase; }
            .med-item { background: #ffffff; border: 1px solid #e2e8f0; border-left: 3px solid #0f766e; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; font-size: 12px; }
            .med-name { font-weight: bold; color: #0f172a; font-size: 13px; }
            .med-dose { color: #0f766e; font-weight: bold; }
            .med-detail { font-size: 11px; color: #475569; margin-top: 2px; }
            .pre-text { white-space: pre-wrap; font-size: 11.5px; color: #334155; line-height: 1.5; }
            .footer { margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 10px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">DOSIA — Prescripción & Plan Terapéutico</div>
              <div class="subtitle">Expediente Clínico Electrónico Certificado</div>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <strong>Fecha:</strong> ${new Date().toLocaleDateString()}<br/>
              <strong>Médico:</strong> ${patient.attendingDoctor || 'Médico Autorizado'}
            </div>
          </div>

          <div class="patient-card">
            <div class="grid">
              <div><strong>Paciente:</strong> ${patient.name} (${isPediatric ? 'PEDIÁTRICO' : 'ADULTO'})</div>
              <div><strong>Cédula / HC:</strong> ${patient.cardId} | ${patient.hcNumber}</div>
              <div><strong>Edad:</strong> ${patient.age} años | <strong>Peso:</strong> ${patient.weight} kg | <strong>Talla:</strong> ${patient.height} cm</div>
              <div><strong>Signos Vitales:</strong> PA: ${vitals?.bloodPressure || '120/80'} | FC: ${vitals?.heartRate || 80} lpm | T°: ${vitals?.temperature || 36.5} °C | SpO2: ${vitals?.oxygenSaturation || 98}%</div>
              <div><strong>Alergias:</strong> ${allergies.length > 0 ? allergies.join(', ') : 'Ninguna conocida'}</div>
              <div><strong>Enfermedades Crónicas:</strong> ${chronicDiseases.length > 0 ? chronicDiseases.join(', ') : 'Ninguna'}</div>
            </div>
          </div>

          <div class="section-title">I. Prescripción Farmacológica y Dosis</div>
          ${medications.map((m, idx) => `
            <div class="med-item">
              <div class="med-name">${idx + 1}. ${m.name}</div>
              <div class="med-dose">Dosis: ${m.doseMg} ${m.volumeMl ? `— ${m.volumeMl}` : ''} | ${m.route} | ${m.frequency} por ${m.duration}</div>
              <div class="med-detail"><strong>Indicación:</strong> ${m.indication}</div>
              ${m.notes ? `<div class="med-detail" style="color: #0369a1;"><strong>Nota:</strong> ${m.notes}</div>` : ''}
            </div>
          `).join('')}

          <div class="section-title">II. Conducta y Cuidados Generales</div>
          <div class="pre-text">${conductText}</div>

          <div class="section-title">III. Pruebas y Exámenes Complementarios</div>
          <div class="pre-text">${testsText}</div>

          <div class="section-title">IV. Signos de Alarma (Red Flags)</div>
          <div class="pre-text">${alarmsText}</div>

          <div class="footer">
            Documento generado por DOSIA Clinical Intelligence System • Válido para indicación médica ambulatoria y hospitalaria.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSaveToEMR = () => {
    if (onSaveToEMR) {
      const entry: EMREntry = {
        id: `emr-${Date.now()}`,
        patientId: patient.id,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        doctorName: patient.attendingDoctor || 'Dr(a). Médico Tratante',
        type: 'Evolución',
        diagnosis: `Tratamiento Adaptado (${isPediatric ? 'Pediátrico' : 'Adulto'})`,
        summary: `Esquema de tratamiento generado:\n- Medicamentos (${medications.length}): ${medications.map(m => m.name).join(', ')}\n- Conducta: ${conductText.split('\n')[0] || 'Cuidados generales'}`,
        soapDetails: {
          s: 'Paciente evaluado para prescripción y plan de tratamiento.',
          o: `Peso: ${patient.weight}kg, Talla: ${patient.height}cm, PA: ${vitals?.bloodPressure || '120/80'}, FC: ${vitals?.heartRate || 80} lpm, SpO2: ${vitals?.oxygenSaturation || 98}%, T°: ${vitals?.temperature || 36.5}°C`,
          a: `Plan terapéutico ajustado a características clínicas y vademécum (${isPediatric ? 'Pediátrico' : 'Adulto'}).`,
          p: conductText
        },
        prescriptions: medications.map((m, idx) => ({
          id: `rx-${Date.now()}-${idx}`,
          name: m.name,
          activeIngredient: m.name.split(' ')[0] || m.name,
          dose: m.doseMg,
          frequency: m.frequency,
          duration: m.duration,
          notes: `${m.indication} ${m.volumeMl ? `(${m.volumeMl})` : ''} - ${m.notes || ''}`
        }))
      };
      onSaveToEMR(entry);
      setSavedToEmr(true);
      setTimeout(() => setSavedToEmr(false), 3000);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-slate-100 animate-fade-in">
      
      {/* 1. HEADER & PATIENT CLINICAL BANNER (Mobile-First) */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-navy to-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                isPediatric ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}>
                {isPediatric ? '👶 PEDIÁTRICO' : '👤 ADULTO'}
              </span>
              <h2 className="text-base sm:text-xl font-bold text-white font-display">
                Tratamiento & Prescripción Personalizada
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Paciente: <strong className="text-white">{patient.name}</strong> • Edad: <strong>{patient.age} años</strong> • Peso: <strong className="text-brand-teal">{patient.weight} kg</strong> • C.I.: {patient.cardId}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                isEditing 
                  ? 'bg-amber-500 text-slate-900 border-amber-400 font-extrabold shadow-md' 
                  : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-200 shadow-sm'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Listo (Ver)' : 'Editar Todo'}</span>
            </button>

            <button
              type="button"
              onClick={generateInitialScheme}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Recalcular esquema según signos vitales actuales"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-teal" />
              <span className="hidden sm:inline">Recalcular</span>
            </button>
          </div>
        </div>

        {/* 2. REAL-TIME INTEGRATED CLINICAL ALERTS STRIP */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {allergies.length > 0 && (
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span><strong>Alergias:</strong> {allergies.join(', ')}</span>
            </div>
          )}

          {temp >= 38.0 && (
            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>Fiebre Activa ({temp} °C):</strong> Esquema antipirético activado</span>
            </div>
          )}

          {spo2 < 95 && (
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-400 shrink-0" />
              <span><strong>Hipoxemia (SpO2 {spo2}%):</strong> O2 por cánula nasal sugerido</span>
            </div>
          )}

          {isPediatric && (
            <div className="bg-blue-500/20 border border-blue-500/40 text-blue-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span><strong>Dosis Pediátrica:</strong> Calculada exactamente a {patient.weight} kg</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. VADEMECUM INTERACTIVE SELECTOR STRIP (Prompt Request) */}
      <div className="bg-slate-900/90 border border-brand-teal/40 rounded-2xl p-3 sm:p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-brand-teal shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">Vademécum Farmacológico Integrado</h4>
              <p className="text-[11px] text-slate-400">Seleccione fármacos de la lista desplegable para ajustar y agregar al tratamiento</p>
            </div>
          </div>

          {/* VADEMECUM DROPDOWN BUTTON */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsVademecumOpen(prev => !prev)}
              className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Explorar Medicamentos Vademécum</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isVademecumOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* VADEMECUM DROPDOWN POPUP MENU */}
            {isVademecumOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none" 
                  onClick={() => setIsVademecumOpen(false)} 
                />
                <div className="fixed inset-x-3 top-24 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-[420px] z-[125] bg-slate-900 border border-brand-teal/60 rounded-2xl shadow-2xl overflow-hidden py-1 divide-y divide-slate-800 animate-fade-in max-h-[75vh] flex flex-col">
                  
                  {/* Search Header */}
                  <div className="p-3 bg-slate-950 shrink-0 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-brand-teal font-bold uppercase">
                      <span>Catálogo Vademécum ({INITIAL_MEDICATIONS.length} Fármacos)</span>
                      <button
                        type="button"
                        onClick={() => setIsVademecumOpen(false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, indicación o categoría..."
                        value={vademecumSearch}
                        onChange={(e) => setVademecumSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal"
                      />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                      {['TODOS', 'Antibiótico', 'AINE', 'Analgésico', 'Emergencia', 'Cardio'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                            selectedCategoryFilter === cat
                              ? 'bg-brand-teal text-slate-900'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Medications List */}
                  <div className="overflow-y-auto divide-y divide-slate-800/60 max-h-[340px]">
                    {filteredVademecum.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        No se encontraron medicamentos coincidentes.
                      </div>
                    ) : (
                      filteredVademecum.map((med) => {
                        const hasAllergyWarning = allergies.some(a => 
                          med.name.toLowerCase().includes(a.toLowerCase()) || 
                          med.genericName.toLowerCase().includes(a.toLowerCase())
                        );

                        return (
                          <div
                            key={med.id}
                            className="p-3 hover:bg-slate-800/80 transition-colors flex items-start justify-between gap-2"
                          >
                            <div className="space-y-0.5 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <strong className="text-xs text-white font-bold">{med.name}</strong>
                                <span className="text-[9px] bg-slate-800 text-brand-teal px-1.5 py-0.2 rounded font-mono">
                                  {med.presentation}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {med.category} • {med.indications.slice(0, 2).join(', ')}
                              </div>
                              {hasAllergyWarning && (
                                <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Paciente alérgico a este grupo
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectVademecumDrug(med)}
                              className="bg-brand-teal/20 hover:bg-brand-teal text-brand-teal hover:text-slate-900 border border-brand-teal/40 font-bold px-2.5 py-1.5 rounded-lg text-[11px] shrink-0 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. TREATMENT NAVIGATION TABS BAR (Clean Mobile-First Buttons) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          onClick={() => setActiveTab('farmacos')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'farmacos'
              ? 'bg-brand-teal text-slate-900 border-brand-teal font-extrabold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Fármacos & Dosis ({medications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conducta')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'conducta'
              ? 'bg-brand-teal text-slate-900 border-brand-teal font-extrabold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Conducta & Cuidados</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pruebas')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'pruebas'
              ? 'bg-brand-teal text-slate-900 border-brand-teal font-extrabold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Laboratorio & Pruebas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alarmas')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'alarmas'
              ? 'bg-rose-500 text-slate-900 border-rose-500 font-extrabold shadow-md'
              : 'bg-slate-900 text-rose-300 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Signos de Alarma</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calculadora')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
            activeTab === 'calculadora'
              ? 'bg-cyan-500 text-slate-900 border-cyan-500 font-extrabold shadow-md'
              : 'bg-slate-900 text-cyan-300 hover:bg-slate-800 border-slate-700/80'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Calculadora de Dosis</span>
        </button>
      </div>

      {/* 5. TAB CONTENT BODY */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
        
        {/* TAB 1: FARMACOS & DOSIS */}
        {activeTab === 'farmacos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-brand-teal" /> Prescripción Farmacológica ({medications.length} Medicamentos)
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    const newItem: MedicationItem = {
                      name: 'Nuevo Medicamento',
                      indication: 'Indicación clínica',
                      doseMg: '500 mg',
                      route: 'Vía Oral (V.O.)',
                      frequency: 'Cada 8 horas',
                      duration: '5 días',
                      notes: 'Tomar con abundante agua'
                    };
                    setMedications([...medications, newItem]);
                  }}
                  className="bg-brand-teal hover:bg-brand-teal-pastel text-slate-900 font-bold px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Medicamento
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {medications.map((med, index) => (
                <div
                  key={index}
                  className="bg-slate-950/80 border border-slate-800 hover:border-brand-teal/40 rounded-2xl p-3.5 space-y-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[index].name = e.target.value;
                              setMedications(updated);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-bold"
                            placeholder="Nombre del fármaco..."
                          />
                          <input
                            type="text"
                            value={med.indication}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[index].indication = e.target.value;
                              setMedications(updated);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-300"
                            placeholder="Indicación..."
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-bold text-white">{index + 1}. {med.name}</div>
                          <div className="text-xs text-slate-400">{med.indication}</div>
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setMedications(medications.filter((_, i) => i !== index))}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 cursor-pointer shrink-0"
                        title="Eliminar este medicamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dose details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Dosis:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.doseMg}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[index].doseMg = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-brand-teal font-bold font-mono"
                        />
                      ) : (
                        <span className="text-brand-teal font-bold font-mono">{med.doseMg} {med.volumeMl ? `(${med.volumeMl})` : ''}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Vía:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.route}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[index].route = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-300"
                        />
                      ) : (
                        <span className="text-slate-300">{med.route}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Frecuencia:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[index].frequency = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-300"
                        />
                      ) : (
                        <span className="text-slate-300">{med.frequency}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Duración:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[index].duration = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-300"
                        />
                      ) : (
                        <span className="text-slate-300">{med.duration}</span>
                      )}
                    </div>
                  </div>

                  {med.notes && (
                    <div className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-xl">
                      {med.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CONDUCTA & CUIDADOS */}
        {activeTab === 'conducta' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-brand-teal" /> Conducta Clínica e Indicaciones No Farmacológicas
            </h3>
            {isEditing ? (
              <textarea
                value={conductText}
                onChange={(e) => setConductText(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-teal"
              />
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {conductText}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LABORATORIO & PRUEBAS */}
        {activeTab === 'pruebas' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-teal" /> Exámenes de Laboratorio y Estudios Complementarios
            </h3>
            {isEditing ? (
              <textarea
                value={testsText}
                onChange={(e) => setTestsText(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-teal"
              />
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {testsText}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SIGNOS DE ALARMA */}
        {activeTab === 'alarmas' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Criterios de Urgencia y Red Flags
            </h3>
            {isEditing ? (
              <textarea
                value={alarmsText}
                onChange={(e) => setAlarmsText(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-rose-500/40 rounded-2xl p-3 text-xs text-rose-200 font-mono focus:outline-none focus:border-rose-400"
              />
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200 whitespace-pre-wrap leading-relaxed">
                {alarmsText}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CALCULADORA DE DOSIS INTEGRADA */}
        {activeTab === 'calculadora' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Calculadora de Dosis Exacta por Peso ({isPediatric ? 'Pediátrica' : 'Adulto'})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Fármaco / Nombre:</label>
                <input
                  type="text"
                  value={calcDrugName}
                  onChange={(e) => setCalcDrugName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Peso del Paciente (kg):</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-brand-teal font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Dosis por kg (mg/kg/toma):</label>
                <input
                  type="number"
                  step="0.5"
                  value={calcMgPerKg}
                  onChange={(e) => setCalcMgPerKg(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Concentración de Jarabe (mg):</label>
                <input
                  type="number"
                  value={calcConcentrationMg}
                  onChange={(e) => setCalcConcentrationMg(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">En Volumen de Jarabe (mL):</label>
                <input
                  type="number"
                  value={calcConcentrationMl}
                  onChange={(e) => setCalcConcentrationMl(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Frecuencia:</label>
                <select
                  value={calcFrequency}
                  onChange={(e) => setCalcFrequency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Cada 6 horas">Cada 6 horas (4 veces al día)</option>
                  <option value="Cada 8 horas">Cada 8 horas (3 veces al día)</option>
                  <option value="Cada 12 horas">Cada 12 horas (2 veces al día)</option>
                  <option value="Cada 24 horas">Cada 24 horas (1 vez al día)</option>
                </select>
              </div>
            </div>

            {/* Live Calculation Results */}
            <div className="bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border border-cyan-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Dosis Calculada Resultante:</span>
                <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                  {Math.round(calcWeight * calcMgPerKg)} mg por toma {' '}
                  <span className="text-cyan-300">
                    ({calcConcentrationMg > 0 ? ((Math.round(calcWeight * calcMgPerKg) * calcConcentrationMl) / calcConcentrationMg).toFixed(1) : 0} mL)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Fórmula: ({calcWeight} kg × {calcMgPerKg} mg/kg) × {calcConcentrationMl} mL / {calcConcentrationMg} mg = {((Math.round(calcWeight * calcMgPerKg) * calcConcentrationMl) / calcConcentrationMg).toFixed(1)} mL {calcFrequency.toLowerCase()}.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInsertCalculatedDose}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Insertar en Tratamiento
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 6. BOTTOM ACTION EXPORT BAR (Responsive Mobile-First: Copiar, WhatsApp, PDF, Imprimir, Guardar) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl space-y-2.5">
        <div className="text-[11px] font-mono text-brand-teal font-bold uppercase flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Opciones de Exportación y Guardado:
          </span>
        </div>

        {/* Action Buttons Grid - 5 Clean Responsive Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
          {/* 1. COPIAR */}
          <button
            type="button"
            onClick={handleCopy}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs shadow-sm active:scale-95 min-w-0"
            title="Copiar texto plano al portapapeles"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Copy className="w-4 h-4 text-slate-300 shrink-0" />}
            <span className="truncate">{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          {/* 2. WHATSAPP - VERDE */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-3 py-2.5 rounded-xl border border-emerald-400/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-xs active:scale-95 min-w-0"
            title="Compartir esquema de tratamiento por WhatsApp"
          >
            <Share2 className="w-4 h-4 text-emerald-100 shrink-0" />
            <span className="truncate">WhatsApp</span>
          </button>

          {/* 3. PDF - BLANCO */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold px-3 py-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-xs active:scale-95 min-w-0"
            title="Generar y descargar documento PDF"
          >
            <Download className="w-4 h-4 text-slate-900 shrink-0" />
            <span className="truncate">PDF</span>
          </button>

          {/* 4. IMPRIMIR - TRANSPARENTE */}
          <button
            type="button"
            onClick={handlePrint}
            className="bg-transparent hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs shadow-sm active:scale-95 min-w-0"
            title="Imprimir prescripción"
          >
            <Printer className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="truncate">Imprimir</span>
          </button>

          {/* 5. GUARDAR HISTORIAL - AZUL */}
          <button
            type="button"
            onClick={handleSaveToEMR}
            className="col-span-2 sm:col-span-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-3 py-2.5 rounded-xl border border-blue-400/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-xs active:scale-95 min-w-0"
            title="Guardar como registro en el Historial Clínico del Paciente"
          >
            <FolderPlus className="w-4 h-4 text-blue-100 shrink-0" />
            <span className="truncate">{savedToEmr ? '✓ Guardado' : 'Guardar Historial'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}

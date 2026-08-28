import jsPDF from 'jspdf';
import { Patient, EMREntry } from './types';

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

/**
 * Normalizes doctor name so that there is strictly ONE single "Dr(a)." prefix
 * and removes any duplicate/redundant "Dr.", "Dra.", "Dr(a).", "Doctor(a)" prefixes.
 */
export const formatDoctorName = (rawDoc?: string, fallbackDoc?: string): string => {
  let doc = (rawDoc || fallbackDoc || 'Médico Tratante').trim();
  
  // Repeatedly strip leading variations of Dr / Dra / Dr(a) / Doctor
  let prev = '';
  while (prev !== doc) {
    prev = doc;
    doc = doc.replace(/^(Dr\(a\)\.?|Dr\.|Dra\.|Doctor\(a\)|Doctor|Dra)\s*/i, '').trim();
  }

  if (!doc) {
    doc = 'Médico Tratante';
  }

  return `Dr(a). ${doc}`;
};

/**
 * Generates and downloads a complete, professional clinical PDF document
 * with patient clinical data, vitals, scales, medications, conduct, tests, and alarms.
 */
export const generateTreatmentPDF = (
  patient: Patient,
  medications: MedicationItem[],
  conductText: string,
  testsText: string,
  alarmsText: string,
  selectedScale: string,
  selectedScaleName?: string,
  doctorName?: string
): string => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  let y = 14;

  const formattedDoctor = formatDoctorName(patient.attendingDoctor, doctorName);
  const isPediatric = (patient.patientCategory || (patient.age < 15 ? 'PEDIÁTRICO' : 'ADULTO')) === 'PEDIÁTRICO';

  // --- HEADER BANNER ---
  doc.setFillColor(13, 148, 136); // Brand Teal
  doc.rect(margin, y, pageWidth - (margin * 2), 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DOSIA — PRESCRIPCIÓN & TRATAMIENTO MÉDICO', margin + 4, y + 7.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Asistente Clínico Inteligente • Vademécum & Dosificación Personalizada', margin + 4, y + 13.5);

  const dateStr = new Date().toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.text(dateStr, pageWidth - margin - 4, y + 10.5, { align: 'right' });

  y += 22;

  // --- PATIENT CLINICAL INFORMATION BOX ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 34, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Paciente: ${patient.name}`, margin + 4, y + 6);
  doc.text(`Categoría: ${isPediatric ? 'Pediátrico' : 'Adulto'}`, margin + 115, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`C.I. / Identificación: ${patient.cardId || 'S/N'}`, margin + 4, y + 12);
  doc.text(`Historia Clínica: ${patient.hcNumber || 'S/N'}`, margin + 65, y + 12);
  doc.text(`Edad: ${patient.age} años`, margin + 120, y + 12);
  doc.text(`Sexo: ${patient.sex === 'M' ? 'Masculino' : 'Femenino'}`, margin + 155, y + 12);

  const heightM = patient.height ? patient.height / 100 : 1.70;
  const bmiVal = (patient.weight / (heightM * heightM)).toFixed(1);

  doc.text(`Peso: ${patient.weight} kg`, margin + 4, y + 18);
  doc.text(`Talla: ${patient.height || 170} cm`, margin + 65, y + 18);
  doc.text(`IMC: ${bmiVal} kg/m²`, margin + 120, y + 18);
  doc.text(`Grupo Sang.: ${patient.bloodGroup || 'O+'}`, margin + 155, y + 18);

  const allergiesList = (patient.allergies || patient.alerts?.allergies || []).join(', ') || 'Ninguna conocida';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(`Alergias: ${allergiesList}`, margin + 4, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const chronicList = (patient.preExistingConditions || patient.alerts?.chronicDiseases || []).join(', ') || 'Ninguna documentada';
  doc.text(`Enf. Crónicas: ${chronicList}`, margin + 90, y + 24);

  doc.text(`Médico Tratante: ${formattedDoctor}`, margin + 4, y + 30);
  doc.text(`Estado: ${patient.status || 'Estable'}`, margin + 120, y + 30);

  y += 38;

  // --- VITAL SIGNS STRIP ---
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, pageWidth - (margin * 2), 7.5, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  const vit = patient.vitalSigns;
  const vitStr = `PA: ${vit?.bloodPressure || '120/80'} | FC: ${vit?.heartRate || 80} lpm | FR: ${vit?.respiratoryRate || 16} rpm | T°: ${vit?.temperature || 36.5}°C | SpO2: ${vit?.oxygenSaturation || 98}% | Gluc: ${vit?.glycemia || 100} mg/dL | EVA: ${vit?.painEva ?? 0}/10`;
  doc.text(vitStr, margin + 3, y + 5);

  y += 11;

  // --- OPTIONAL MEDICAL SCALE ---
  if (selectedScale !== 'none' && selectedScaleName) {
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(13, 148, 136);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 8.5, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(13, 148, 136);
    doc.text(`⚡ Protocolo Clínico Ajustado: ${selectedScaleName}`, margin + 4, y + 5.5);
    y += 12;
  }

  // --- PLAN FARMACOLÓGICO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('PLAN FARMACOLÓGICO Y PRESCRIPCIÓN', margin, y);
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
  y += 6;

  medications.forEach((m, idx) => {
    if (y > 255) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 15.5, 1.5, 1.5, 'F');
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(1);
    doc.line(margin, y, margin, y + 15.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${m.name}`, margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Dosis: ${m.doseMg} ${m.volumeMl ? `(${m.volumeMl})` : ''} • Vía: ${m.route} • Frecuencia: ${m.frequency} • Duración: ${m.duration}`, margin + 3, y + 9);

    if (m.notes || m.indication) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Indicación: ${m.notes || m.indication}`, margin + 3, y + 13);
    }

    y += 18;
  });

  // --- CONDUCTA & MEDIDAS GENERALES ---
  if (y > 240) {
    doc.addPage();
    y = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CONDUCTA Y MEDIDAS GENERALES', margin, y);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const splitConduct = doc.splitTextToSize(conductText || 'Seguimiento clínico según evolución.', pageWidth - (margin * 2));
  doc.text(splitConduct, margin, y);
  y += (splitConduct.length * 3.8) + 4;

  // --- EXÁMENES DE LABORATORIO Y GABINETE ---
  if (y > 240) {
    doc.addPage();
    y = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('EXÁMENES DE LABORATORIO Y GABINETE', margin, y);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const splitTests = doc.splitTextToSize(testsText || 'No se requieren estudios complementarios inmediatos.', pageWidth - (margin * 2));
  doc.text(splitTests, margin, y);
  y += (splitTests.length * 3.8) + 4;

  // --- SIGNOS DE ALARMA ---
  if (y > 235) {
    doc.addPage();
    y = 15;
  }

  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(253, 164, 175);
  const splitAlarms = doc.splitTextToSize(`🚨 CRITERIOS DE URGENCIA / SIGNOS DE ALARMA:\n${alarmsText || 'Fiebre persistente, dificultad respiratoria, alteración del estado de conciencia o vómitos incoercibles.'}`, pageWidth - (margin * 2) - 6);
  const alarmsHeight = (splitAlarms.length * 3.8) + 5.5;
  doc.roundedRect(margin, y, pageWidth - (margin * 2), alarmsHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(159, 18, 57);
  doc.text(splitAlarms, margin + 3, y + 4.5);
  y += alarmsHeight + 6;

  // --- FOOTER & SIGNATURE ---
  if (y > 255) {
    doc.addPage();
    y = 240;
  } else if (y < 235) {
    y = 245;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDoctor, pageWidth - margin - 35, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma y Sello Médico', pageWidth - margin - 35, y + 8, { align: 'center' });

  doc.text('Documento médico oficial generado y emitido a través de DOSIA® Tratamientos Médicos.', margin, y + 8);

  const cleanName = patient.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Receta_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  return fileName;
};

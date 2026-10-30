import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlyReportData } from '../types';
import { hexToRgb, resolveTemplate } from '../lib/reportTheme';
import { downloadBlob } from '../lib/reportTokens';

export function generatePdfReport(report: MonthlyReportData, templateId?: string): void {
  const blob = buildPdfBlob(report, templateId);
  downloadBlob(blob, `ICT_Monthly_Report_${report.month}.pdf`);
}

export function buildPdfBlob(report: MonthlyReportData, templateId?: string): Blob {
  const template = resolveTemplate(templateId);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const NAVY = hexToRgb(template.primaryColor || '#0F2D59');
  const TEXT_DARK = [15, 23, 42];
  const TEXT_MUTED = [100, 116, 139];

  let currentY = 18;

  // Header banner
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(report.companyName.toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(147, 197, 253);
  doc.text(template.headerText || 'ICT PERFORMANCE & REPORTING MANAGEMENT SYSTEM', 14, 18);

  doc.setTextColor(255, 255, 255);
  doc.text(`PERIOD: ${report.month}`, 165, 15);

  currentY = 32;

  // Title
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(report.title, 14, currentY);

  currentY += 8;

  // Metadata block
  doc.setFillColor(248, 250, 252);
  doc.rect(14, currentY, 182, 22, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 22, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(`Employee: ${report.employeeName} (${report.employeeTitle})`, 18, currentY + 6);
  doc.text(`Department: ${report.department}`, 18, currentY + 12);
  doc.text(`Email: ${report.employeeEmail}`, 18, currentY + 18);

  doc.text(`Status: ${report.status}`, 120, currentY + 6);
  doc.text(`Report Version: ${report.version}`, 120, currentY + 12);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 120, currentY + 18);

  currentY += 28;

  // 1. Executive Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('1. Executive Summary', 14, currentY);
  currentY += 5;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  const splitSummary = doc.splitTextToSize(report.executiveSummary, 182);
  doc.text(splitSummary, 14, currentY);
  currentY += splitSummary.length * 4.5 + 6;

  // Quick Stats Grid
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 42, 16, 2, 2, 'F');
  doc.roundedRect(60, currentY, 42, 16, 2, 2, 'F');
  doc.roundedRect(106, currentY, 42, 16, 2, 2, 'F');
  doc.roundedRect(152, currentY, 44, 16, 2, 2, 'F');

  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Infrastructure Uptime', 18, currentY + 5);
  doc.text('Activities Completed', 64, currentY + 5);
  doc.text('Ticket SLA Rate', 110, currentY + 5);
  doc.text('Weighted KPI', 156, currentY + 5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(`${report.kpisSummary.averageAchievement}%`, 18, currentY + 12);
  doc.text(`${report.activitiesSummary.completed} (${report.activitiesSummary.totalHours}h)`, 64, currentY + 12);
  doc.text(`${report.ticketsSummary.slaCompliancePercent}%`, 110, currentY + 12);
  doc.text(`${report.kpisSummary.averageAchievement}%`, 156, currentY + 12);

  currentY += 24;

  // 2. Key Performance Indicators Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('2. Key Performance Indicators (KPIs) Achievement', 14, currentY);
  currentY += 4;

  const kpiBody = report.kpisSummary.kpis.map((k) => [
    k.name,
    `${k.targetValue} ${k.unit}`,
    `${k.actualValue} ${k.unit}`,
    `${k.weightPercent}%`,
    `${k.achievementPercent}%`,
    k.status
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['KPI Performance Metric', 'Target', 'Actual', 'Weight', 'Achievement', 'Status']],
    body: kpiBody,
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
      5: { halign: 'center' }
    }
  });

  // @ts-expect-error autoTable adds lastAutoTable to doc
  currentY = doc.lastAutoTable.finalY + 10;

  // 3. Completed Daily Activities Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('3. Key Completed Activities & Business Outcomes', 14, currentY);
  currentY += 4;

  const actBody = (report.activitiesSummary.topActivities || []).map((a) => [
    a.date,
    a.title,
    a.department,
    `${a.hoursSpent}h`,
    a.businessImpact
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Activity & Action Taken', 'Department', 'Hours', 'Business Impact']],
    body: actBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 96, 145], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 26 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 54 }
    }
  });

  // @ts-expect-error autoTable adds lastAutoTable to doc
  currentY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('4. Support Tickets', 14, currentY);
  currentY += 4;

  const ticketBody = (report.ticketsSummary.tickets || []).map((item) => [
    item.id,
    item.title,
    item.department,
    item.status,
    item.priority
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['ID', 'Ticket', 'Department', 'Status', 'Priority']],
    body: ticketBody.length ? ticketBody : [['—', 'No tickets for this period', '—', '—', '—']],
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 }
  });

  // @ts-expect-error autoTable adds lastAutoTable to doc
  currentY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('5. Projects & Assigned Performers', 14, currentY);
  currentY += 4;

  const projectBody = (report.projectsSummary.projects || []).map((item) => [
    item.name,
    item.assignedUserName || item.owner,
    item.status,
    `${item.progressPercent}%`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Project', 'Assigned to', 'Status', 'Progress']],
    body: projectBody.length ? projectBody : [['No projects recorded', '—', '—', '—']],
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 }
  });

  // New Page for Strategic Sections & Sign-off
  doc.addPage();
  currentY = 20;

  // 4. Strategic Narrative Sections
  const narrativeBlocks = [
    { title: '4. Major Achievements & Measurable Outcomes', content: report.majorAchievements },
    { title: '5. Outstanding Issues & Carried-Forward Actions', content: report.outstandingIssues },
    { title: '6. Operational Challenges & System Risks', content: report.challengesAndRisks },
    { title: "7. Next Month's Key Priorities", content: report.nextMonthPriorities }
  ];

  narrativeBlocks.forEach((b) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(b.title, 14, currentY);
    currentY += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    const splitLines = doc.splitTextToSize(b.content, 182);
    doc.text(splitLines, 14, currentY);
    currentY += splitLines.length * 4.2 + 8;
  });

  currentY += 6;

  // 8. Authorization Sign-Off
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('8. Formal Review & Sign-Off Authorization', 14, currentY);
  currentY += 8;

  // Signature boxes
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, currentY, 86, 36, 'FD');
  doc.rect(110, currentY, 86, 36, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBMITTED BY:', 18, currentY + 6);
  doc.text('APPROVED BY:', 114, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${report.employeeName}`, 18, currentY + 12);
  doc.text(`Title: ${report.employeeTitle}`, 18, currentY + 17);
  doc.text('Signature: ______________________', 18, currentY + 25);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 18, currentY + 31);

  doc.text('Name: General Manager / Director', 114, currentY + 12);
  doc.text('Title: Executive Management', 114, currentY + 17);
  doc.text('Signature: ______________________', 114, currentY + 25);
  doc.text('Date: ____/____/2026', 114, currentY + 31);

  // Add Page Numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(
      `${template.footerText || 'Confidential'} — ${report.companyName} | Page ${i} of ${totalPages}`,
      105,
      287,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

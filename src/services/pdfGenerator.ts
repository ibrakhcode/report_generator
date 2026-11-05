import jsPDF from 'jspdf';
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
  doc.text('Tickets posted', 18, currentY + 5);
  doc.text('Activities Completed', 64, currentY + 5);
  doc.text('Ticket SLA Rate', 110, currentY + 5);
  doc.text('Projects', 156, currentY + 5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(`${(report.ticketsSummary.tickets || []).length}`, 18, currentY + 12);
  doc.text(`${report.activitiesSummary.completed} (${report.activitiesSummary.totalHours}h)`, 64, currentY + 12);
  doc.text(`${report.ticketsSummary.slaCompliancePercent}%`, 110, currentY + 12);
  doc.text(`${report.projectsSummary.projects.length}`, 156, currentY + 12);

  currentY += 24;

  const narrativeBlocks = [
    { title: '2. Daily Work', content: report.majorAchievements },
    { title: '3. Helpdesk Tickets', content: report.outstandingIssues },
    { title: '4. Projects', content: report.challengesAndRisks },
    { title: '5. Follow-up', content: report.recommendations },
    { title: '6. Training', content: report.nextMonthPriorities }
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
  doc.text('7. Formal Review & Sign-Off Authorization', 14, currentY);
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

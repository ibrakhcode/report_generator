import type PptxGenJS from 'pptxgenjs';
import { MonthlyReportData, ReportTemplate } from '../types';
import { hexNoHash, resolveTemplate } from '../lib/reportTheme';
import { styleIdFromTemplate } from '../lib/templateStyles';
import { downloadBlob, fillPptxTemplate } from '../lib/reportTokens';
import {
  BUNDLED_DEFAULT_PPTX_NAME,
  BUNDLED_DEFAULT_TEMPLATE_ID,
  loadBundledDefaultPptx,
  loadTemplateFile
} from '../lib/templateFileStore';

export async function buildPptxBlob(report: MonthlyReportData, templateId?: string): Promise<Blob> {
  const template: ReportTemplate = resolveTemplate(templateId);
  let uploaded = template?.uploadedTemplateData || (template?.id ? await loadTemplateFile(template.id) : undefined);
  if (
    !uploaded &&
    (template?.id === BUNDLED_DEFAULT_TEMPLATE_ID || template?.uploadedTemplateName === BUNDLED_DEFAULT_PPTX_NAME)
  ) {
    uploaded = await loadBundledDefaultPptx();
  }
  if (uploaded) {
    return fillPptxTemplate(uploaded, report);
  }
  return buildDesignedPptx(report, template);
}

export async function generatePptxReport(report: MonthlyReportData, templateId?: string): Promise<void> {
  const blob = await buildPptxBlob(report, templateId);
  downloadBlob(blob, `ICT_Monthly_Report_${report.month}.pptx`);
}

async function buildDesignedPptx(report: MonthlyReportData, template: ReportTemplate): Promise<Blob> {
  const pptxgen = (await import('pptxgenjs')).default;
  const pptx = new pptxgen();
  pptx.layout = template.slideFormat === '4:3' ? 'LAYOUT_4x3' : 'LAYOUT_16x9';
  pptx.author = report.employeeName;
  pptx.company = report.companyName;
  pptx.title = report.title;

  const NAVY = hexNoHash(template.primaryColor || '#0F2D59');
  const BLUE = hexNoHash(template.accentColor || '#1E6091');
  const styleId = styleIdFromTemplate(template);
  const LIGHT_BG = !styleId
    ? 'F8FAFC'
    : styleId === 'graphite-board'
      ? '0B1220'
      : styleId === 'gold-brief'
        ? 'F7F1E1'
        : 'F8FAFC';
  const TEXT_DARK = styleId === 'graphite-board' ? 'E2E8F0' : '0F172A';
  const TEXT_MUTED = styleId === 'graphite-board' ? '94A3B8' : '475569';
  const WHITE = 'FFFFFF';
  const BORDER_COLOR = 'CBD5E1';

  // 1. SLIDE: COVER PAGE
  const slideCover = pptx.addSlide();
  slideCover.background = {
    color: !styleId ? NAVY : styleId === 'gold-brief' ? 'F7F1E1' : styleId === 'azure-grid' ? 'F8FAFC' : NAVY
  };

  if (styleId === 'forest-control') {
    slideCover.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 4.2,
      h: 7.5,
      fill: { color: NAVY },
      line: { color: NAVY }
    });
  } else if (styleId === 'gold-brief' || styleId === 'azure-grid') {
    slideCover.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 1.1,
      fill: { color: NAVY },
      line: { color: NAVY }
    });
  } else if (styleId === 'graphite-board') {
    slideCover.addShape(pptx.ShapeType.rect, {
      x: 8.4,
      y: 0,
      w: 4.93,
      h: 7.5,
      fill: { color: BLUE },
      line: { color: BLUE }
    });
  } else {
    slideCover.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.3,
      h: 7.5,
      fill: { color: BLUE },
      line: { color: BLUE }
    });
  }

  const coverOnLight = styleId === 'gold-brief' || styleId === 'azure-grid';
  const coverTitle = !styleId ? WHITE : coverOnLight ? NAVY : WHITE;
  const coverKicker = !styleId ? '93C5FD' : BLUE;
  const coverMute = !styleId ? 'E2E8F0' : coverOnLight ? '475569' : 'E2E8F0';

  slideCover.addText(report.companyName.toUpperCase(), {
    x: 1.0,
    y: 1.8,
    w: 11.0,
    h: 0.6,
    fontSize: 20,
    bold: true,
    color: coverKicker,
    fontFace: 'Arial'
  });

  slideCover.addText(
    styleId
      ? template.headerText || 'ICT MONTHLY PERFORMANCE REPORT'
      : 'INFORMATION & COMMUNICATIONS TECHNOLOGY (ICT)\nMONTHLY PERFORMANCE REPORT',
    {
    x: 1.0,
    y: 2.6,
    w: 11.0,
    h: 1.5,
    fontSize: 28,
    bold: true,
    color: coverTitle,
    fontFace: 'Arial'
  });

  slideCover.addText(`Reporting Period: ${report.reportingPeriod}`, {
    x: 1.0,
    y: 4.4,
    w: 11.0,
    h: 0.5,
    fontSize: 16,
    color: coverMute,
    fontFace: 'Arial'
  });

  // Metadata block
  const metaBoxText = [
    { text: 'Prepared By: ', options: { bold: true, color: coverKicker } },
    { text: `${report.employeeName} (${report.employeeTitle})\n`, options: { color: coverTitle } },
    { text: 'Department: ', options: { bold: true, color: coverKicker } },
    { text: `${report.department}\n`, options: { color: coverTitle } },
    { text: 'Contact Email: ', options: { bold: true, color: coverKicker } },
    { text: `${report.employeeEmail}\n`, options: { color: coverTitle } },
    { text: 'Status: ', options: { bold: true, color: coverKicker } },
    { text: `${report.status.toUpperCase()} (Version ${report.version})`, options: { bold: true, color: coverTitle } }
  ];

  slideCover.addText(metaBoxText, {
    x: 1.0,
    y: 5.2,
    w: 10.0,
    h: 1.5,
    fontSize: 13,
    fontFace: 'Arial'
  });

  // Helper function to add standard slide header & footer
  const addHeaderFooter = (slide: PptxGenJS.Slide, sectionTitle: string) => {
    slide.background = { color: LIGHT_BG };
    
    // Header Bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.9,
      fill: { color: NAVY },
      line: { color: NAVY }
    });

    slide.addText(report.companyName.toUpperCase(), {
      x: 0.8,
      y: 0.15,
      w: 6.0,
      h: 0.3,
      fontSize: 11,
      color: '93C5FD',
      bold: true,
      fontFace: 'Arial'
    });

    slide.addText(sectionTitle, {
      x: 0.8,
      y: 0.45,
      w: 10.0,
      h: 0.35,
      fontSize: 16,
      color: WHITE,
      bold: true,
      fontFace: 'Arial'
    });

    // Footer
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8,
      y: 7.0,
      w: 11.7,
      h: 0,
      line: { color: BORDER_COLOR, width: 1 }
    });

    slide.addText(`${template.footerText || 'Confidential'} — ${report.companyName} | ${report.reportingPeriod}`, {
      x: 0.8,
      y: 7.05,
      w: 9.0,
      h: 0.3,
      fontSize: 9,
      color: TEXT_MUTED,
      fontFace: 'Arial'
    });
  };

  // 2. SLIDE: EXECUTIVE SUMMARY & DASHBOARD HIGHLIGHTS
  const slideExec = pptx.addSlide();
  addHeaderFooter(slideExec, '1. Executive Summary & Core Operational Highlights');

  slideExec.addText(report.executiveSummary, {
    x: 0.8,
    y: 1.2,
    w: 11.7,
    h: 1.6,
    fontSize: 13,
    color: TEXT_DARK,
    lineSpacing: 20,
    fontFace: 'Arial'
  });

  // 4 Metric Highlight Cards
  const cardData = [
    { title: 'Daily work hours', value: `${report.activitiesSummary.totalHours}`, note: `${report.activitiesSummary.total} posted work item(s)`, color: '0284C7' },
    { title: 'Total Activities Completed', value: `${report.activitiesSummary.completed}`, note: `${report.activitiesSummary.totalHours} productive hours logged`, color: '16A34A' },
    { title: 'Ticket SLA Compliance', value: `${report.ticketsSummary.slaCompliancePercent}%`, note: `Avg resolution ${report.ticketsSummary.avgResolutionHours} hrs`, color: 'D97706' },
    { title: 'Projects', value: `${report.projectsSummary.projects.length}`, note: `${report.projectsSummary.activeCount} active initiative(s)`, color: '2563EB' }
  ];

  cardData.forEach((c, idx) => {
    const cardX = 0.8 + idx * 3.0;
    slideExec.addShape(pptx.ShapeType.roundRect, {
      x: cardX,
      y: 3.1,
      w: 2.7,
      h: 2.2,
      fill: { color: WHITE },
      line: { color: BORDER_COLOR, width: 1 }
    });

    slideExec.addText(c.title, {
      x: cardX + 0.2,
      y: 3.3,
      w: 2.3,
      h: 0.5,
      fontSize: 11,
      bold: true,
      color: TEXT_MUTED,
      fontFace: 'Arial'
    });

    slideExec.addText(c.value, {
      x: cardX + 0.2,
      y: 3.8,
      w: 2.3,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: c.color,
      fontFace: 'Arial'
    });

    slideExec.addText(c.note, {
      x: cardX + 0.2,
      y: 4.6,
      w: 2.3,
      h: 0.5,
      fontSize: 10,
      color: TEXT_MUTED,
      fontFace: 'Arial'
    });
  });

  const slideKpis = pptx.addSlide();
  addHeaderFooter(slideKpis, '2. Operational follow-up');
  slideKpis.addText(report.recommendations, {
    x: 0.8,
    y: 1.3,
    w: 11.7,
    h: 5.2,
    fontSize: 16,
    color: TEXT_DARK,
    fontFace: 'Arial'
  });

  const slideActivities = pptx.addSlide();
  addHeaderFooter(slideActivities, '3. Daily Work');
  slideActivities.addText(report.majorAchievements, {
    x: 0.8,
    y: 1.3,
    w: 11.7,
    h: 5.2,
    fontSize: 16,
    color: TEXT_DARK,
    fontFace: 'Arial'
  });

  // 5. SLIDE: IT SUPPORT TICKETS & SLA PERFORMANCE
  const slideTickets = pptx.addSlide();
  addHeaderFooter(slideTickets, '4. IT Support Service Desk & Ticket Analysis');

  slideTickets.addText(report.outstandingIssues, {
    x: 0.8,
    y: 1.3,
    w: 11.7,
    h: 5.2,
    fontSize: 16,
    color: TEXT_DARK,
    fontFace: 'Arial'
  });

  const slideProjects = pptx.addSlide();
  addHeaderFooter(slideProjects, '5. Projects');
  slideProjects.addText(report.challengesAndRisks, {
    x: 0.8,
    y: 1.3,
    w: 11.7,
    h: 5.2,
    fontSize: 16,
    color: TEXT_DARK,
    fontFace: 'Arial'
  });

  // 6. SLIDE: MAJOR ACHIEVEMENTS, RISKS & NEXT PRIORITIES
  const slideSummary = pptx.addSlide();
  addHeaderFooter(slideSummary, '5. Strategic Deliverables, Challenges & Next Month Priorities');

  // Three column boxes
  const summaryCols = [
    { title: 'Major Achievements', content: report.majorAchievements, color: '16A34A' },
    { title: 'Challenges & Risks', content: report.challengesAndRisks, color: 'DC2626' },
    { title: "Next Month's Priorities", content: report.nextMonthPriorities, color: '2563EB' }
  ];

  summaryCols.forEach((col, idx) => {
    const colX = 0.8 + idx * 4.0;
    slideSummary.addShape(pptx.ShapeType.roundRect, {
      x: colX,
      y: 1.2,
      w: 3.7,
      h: 5.2,
      fill: { color: WHITE },
      line: { color: BORDER_COLOR, width: 1 }
    });

    slideSummary.addText(col.title, {
      x: colX + 0.2,
      y: 1.4,
      w: 3.3,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: col.color,
      fontFace: 'Arial'
    });

    slideSummary.addText(col.content, {
      x: colX + 0.2,
      y: 1.9,
      w: 3.3,
      h: 4.3,
      fontSize: 9.5,
      color: TEXT_DARK,
      lineSpacing: 16,
      fontFace: 'Arial'
    });
  });

  // 7. SLIDE: SIGN-OFF & APPROVAL
  const slideSign = pptx.addSlide();
  addHeaderFooter(slideSign, '6. Formal Review & Sign-Off Authorization');

  slideSign.addText('This report constitutes the official ICT monthly record submitted for management review.', {
    x: 0.8,
    y: 1.4,
    w: 11.7,
    h: 0.5,
    fontSize: 13,
    color: TEXT_DARK,
    fontFace: 'Arial'
  });

  // Two signature cards
  const signCards = [
    {
      title: 'SUBMITTED BY (IT OFFICER)',
      name: report.employeeName,
      titleRole: report.employeeTitle,
      dept: report.department,
      date: new Date().toLocaleDateString('en-GB')
    },
    {
      title: 'REVIEWED & APPROVED BY (MANAGEMENT)',
      name: 'General Manager / Financial Controller',
      titleRole: 'Executive Operations',
      dept: report.companyName,
      date: 'Pending Final Authorization'
    }
  ];

  signCards.forEach((sc, idx) => {
    const cardX = 1.5 + idx * 5.5;
    slideSign.addShape(pptx.ShapeType.roundRect, {
      x: cardX,
      y: 2.2,
      w: 4.8,
      h: 3.8,
      fill: { color: WHITE },
      line: { color: BORDER_COLOR, width: 1 }
    });

    slideSign.addText(sc.title, {
      x: cardX + 0.3,
      y: 2.4,
      w: 4.2,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: NAVY,
      fontFace: 'Arial'
    });

    slideSign.addText([
      { text: `Name: ${sc.name}\n`, options: { bold: true, fontSize: 11 } },
      { text: `Designation: ${sc.titleRole}\n`, options: { fontSize: 10, color: TEXT_MUTED } },
      { text: `Entity: ${sc.dept}\n\n`, options: { fontSize: 10, color: TEXT_MUTED } },
      { text: 'Digital Signature: _______________________\n', options: { fontSize: 10, bold: true } },
      { text: `Date: ${sc.date}`, options: { fontSize: 10, color: TEXT_MUTED } }
    ], {
      x: cardX + 0.3,
      y: 3.0,
      w: 4.2,
      h: 2.8,
      fontFace: 'Arial'
    });
  });

  // pptxgenjs v4 blob output
  const written = await pptx.write({ outputType: 'blob' } as never);
  return written as Blob;
}

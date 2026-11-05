import type { MonthlyReportData, SupportTicket } from '@/types';
import { monthLabel } from '@/lib/reportPosts';

function xmlSafe(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceFirst(xml: string, search: string, value: string): string {
  const index = xml.indexOf(search);
  if (index < 0) return xml;
  return xml.slice(0, index) + xmlSafe(value) + xml.slice(index + search.length);
}

function replaceAll(xml: string, search: string, value: string): string {
  if (!xml.includes(search)) return xml;
  return xml.split(search).join(xmlSafe(value));
}

function pct(part: number, total: number) {
  if (!total) return '0';
  return String(Math.round((part / total) * 100));
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function isOpen(ticket: SupportTicket) {
  return ticket.status !== 'Closed' && ticket.status !== 'Resolved';
}

function topEntries(map: Record<string, number>, limit: number) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function countBy(tickets: SupportTicket[], pick: (ticket: SupportTicket) => string) {
  const map: Record<string, number> = {};
  tickets.forEach((ticket) => {
    const key = pick(ticket) || 'Other';
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function categoryCount(tickets: SupportTicket[], names: string[]) {
  return tickets.filter((ticket) => names.some((name) => ticket.category.toLowerCase().includes(name))).length;
}

export function isItSupportTemplateXml(xml: string) {
  return xml.includes('MONTHLY IT OPERATIONS REPORT') || xml.includes('IT Support Monthly Report');
}

export function fillItSupportSlideXml(xml: string, report: MonthlyReportData, slide: number): string {
  const tickets = report.ticketsSummary.tickets || [];
  const activities = report.activitiesSummary.topActivities || [];
  const projects = report.projectsSummary.projects || [];
  const closed = report.ticketsSummary.closed || tickets.filter((item) => !isOpen(item)).length;
  const opened = tickets.length;
  const stillOpen = tickets.filter(isOpen);
  const label = monthLabel(report.month);
  const upper = label.toUpperCase();
  const depts = Array.from(
    new Set(
      [
        ...tickets.map((item) => item.department),
        ...activities.map((item) => item.department)
      ].filter(Boolean)
    )
  );
  const byCategory = report.ticketsSummary.byCategory || countBy(tickets, (item) => item.category);
  const byDept = countBy(tickets, (item) => item.department);
  const topCats = topEntries(byCategory, 4);
  const topDepts = topEntries(byDept, 5);
  const resolutionRate = pct(closed, opened);
  const sla = String(report.ticketsSummary.slaCompliancePercent ?? 0);
  const avgHours = String(report.ticketsSummary.avgResolutionHours ?? 0);
  const configCount = categoryCount(tickets, ['config', 'software', 'application', 'email']);
  const credCount = categoryCount(tickets, ['account', 'password', 'access', 'credential']);
  const netCount = categoryCount(tickets, ['network', 'dns', 'internet', 'wifi']);
  const hwCount = categoryCount(tickets, ['hardware', 'printer', 'desktop', 'device']);
  const feedback = tickets.map((item) => item.userFeedback).filter(Boolean);
  const issues = stillOpen.length ? stillOpen : tickets;
  const issue1 = issues[0];
  const issue2 = issues[1];
  const networkTickets = tickets.filter((item) => item.category.toLowerCase().includes('network'));

  let out = replaceAll(xml, '[Month YYYY]', label);
  out = replaceAll(out, '[MONTH YYYY]', upper);

  if (slide === 1) {
    out = replaceFirst(out, '[Full name]', report.employeeName || 'IT Officer');
    out = replaceFirst(out, '[Job title]', report.employeeTitle || 'IT Officer / Systems Specialist');
    out = replaceFirst(out, '[01 Month – 31 Month YYYY]', report.reportingPeriod || label);
    return out;
  }

  if (slide === 2) {
    out = replaceFirst(out, '[list of departments]', depts.join(', ') || 'ICT-supported units');
    out = replaceFirst(
      out,
      '[Add two or three sentences on overall performance, service availability and the main outcomes of the month.]',
      report.executiveSummary || `No posted operational summary for ${label}.`
    );
    out = replaceFirst(out, '[Add / remove]', depts.slice(7).join(', ') || 'All listed departments were in scope.');
    return out;
  }

  if (slide === 3) {
    out = replaceFirst(
      out,
      '[Availability of critical business systems]',
      `Posted operations this month: ${report.activitiesSummary.total} daily work item(s), SLA ${report.ticketsSummary.slaCompliancePercent}%.`
    );
    out = replaceFirst(
      out,
      '[Support delivered and response highlights]',
      report.outstandingIssues || `${opened} posted ticket(s), ${closed} resolved.`
    );
    out = replaceFirst(
      out,
      '[Projects or planned activities completed]',
      report.challengesAndRisks || report.majorAchievements || `Daily work posted: ${report.activitiesSummary.total}.`
    );
    out = replaceFirst(out, '[Issue and its impact]', networkTickets[0]?.title || 'No posted network incident.');
    out = replaceFirst(
      out,
      '[Issue and its impact]',
      tickets.find((item) => /system|sap|application/i.test(item.category))?.title || 'No posted systems incident.'
    );
    out = replaceFirst(
      out,
      '[Issue and its impact]',
      tickets.find((item) => /hardware|power|printer/i.test(item.category))?.title || 'No posted hardware or power incident.'
    );
    return out;
  }

  if (slide === 4) {
    out = replaceFirst(out, '[00 / 00]', `${pad(opened)} / ${pad(closed)}`);
    out = replaceFirst(out, '[Short comment]', `${closed} of ${opened} posted tickets resolved in ${label}.`);
    out = replaceFirst(out, '[00]%', `${resolutionRate}%`);
    out = replaceFirst(out, '[Open tickets carried over]', `${stillOpen.length} still open`);
    out = replaceFirst(out, '[0] Hrs', `${avgHours} Hrs`);
    out = replaceFirst(out, '[SLA compliance comment]', `SLA compliance ${sla}% from posted tickets.`);
    return out;
  }

  if (slide === 5) {
    for (let index = 0; index < 4; index += 1) {
      const row = topCats[index];
      out = replaceFirst(out, `[Category ${index + 1}]`, row?.[0] || '—');
      out = replaceFirst(
        out,
        '[00] tickets · [00]%',
        row ? `${pad(row[1])} tickets · ${pct(row[1], opened)}%` : '00 tickets · 00%'
      );
    }
    out = replaceFirst(
      out,
      '[One sentence on the category that drove most desk demand this month.]',
      topCats[0]
        ? `${topCats[0][0]} led demand with ${topCats[0][1]} ticket(s).`
        : 'No posted tickets to analyse by category.'
    );
    out = replaceFirst(out, '[00]', String(opened));
    return out;
  }

  if (slide === 6) {
    for (let index = 0; index < 5; index += 1) {
      const row = topDepts[index];
      const common =
        tickets.find((item) => item.department === row?.[0])?.category || '—';
      out = replaceFirst(out, `[Department ${index + 1}]`, row?.[0] || '—');
      out = replaceFirst(out, '[00]', row ? pad(row[1]) : '00');
      out = replaceFirst(out, '[00]%', row ? `${pct(row[1], opened)}%` : '00%');
      out = replaceFirst(out, '[Request type]', row ? common : '—');
    }
    out = replaceFirst(
      out,
      '[Which department generated the most requests, and why.]',
      topDepts[0]
        ? `${topDepts[0][0]} generated the most posted tickets (${topDepts[0][1]}).`
        : 'No posted departmental demand for this month.'
    );
    return out;
  }

  if (slide === 7) {
    out = replaceFirst(
      out,
      '[Software activation, system modules, email profiles and similar setup work. Add ticket count.]',
      `${configCount} posted ticket(s) in configuration and application setup.`
    );
    out = replaceFirst(
      out,
      '[Domain password resets, account unlocks and new-user onboarding. Add ticket count.]',
      `${credCount} posted ticket(s) in credentials and access.`
    );
    out = replaceFirst(
      out,
      '[Connectivity, DNS and internet performance requests. Add ticket count.]',
      `${netCount} posted ticket(s) in network and connectivity.`
    );
    out = replaceFirst(
      out,
      '[Printers, workstations, peripherals and other device faults. Add ticket count.]',
      `${hwCount} posted ticket(s) in hardware and devices.`
    );
    return out;
  }

  if (slide === 8) {
    const maxSla = tickets.reduce((max, item) => Math.max(max, item.slaTargetHours || 0), 0);
    out = replaceFirst(out, '[0] Hrs', `${maxSla || avgHours} Hrs`);
    out = replaceFirst(out, '[00]', String(tickets.find((item) => item.priority === 'High')?.slaTargetHours || 4));
    out = replaceFirst(out, '[00]', String(tickets.find((item) => item.priority === 'Medium')?.slaTargetHours || 8));
    out = replaceFirst(out, '[00]', String(tickets.find((item) => item.priority === 'Low')?.slaTargetHours || 24));
    out = replaceFirst(out, '[00]%', `${sla}%`);
    return out;
  }

  if (slide === 9) {
    const work = activities.slice(0, 6).map((item) => item.title);
    out = replaceFirst(out, '[Deployments, user builds, configurations]', work[0] || report.majorAchievements || 'No posted desktop work.');
    out = replaceFirst(out, '[Preventive checks, health inspections]', work[1] || 'No posted workstation checks.');
    out = replaceFirst(out, '[Queue configuration, maintenance]', work[2] || 'No posted printer work.');
    out = replaceFirst(out, '[Outages handled, service resets]', work[3] || 'No posted biometric work.');
    out = replaceFirst(out, '[Profile locks, password recoveries, updates]', work[4] || 'No posted mail work.');
    out = replaceFirst(out, '[Other infrastructure]', projects[0]?.name || 'Projects');
    out = replaceFirst(out, '[Service action performed]', projects[0] ? `${projects[0].status} · ${projects[0].progressPercent}%` : 'No posted project action.');
    return out;
  }

  if (slide === 10) {
    out = replaceFirst(out, '[What users appreciated about the support]', feedback[0] || report.majorAchievements || 'No posted user feedback.');
    out = replaceFirst(out, '[Recognition of follow-up or response time]', feedback[1] || `Average resolution ${avgHours} hours.`);
    out = replaceFirst(out, '[Other positive comments received]', feedback[2] || report.nextMonthPriorities || 'No additional posted comments.');
    out = replaceFirst(out, '[Complaint or concern raised]', report.outstandingIssues || 'No posted complaints.');
    out = replaceFirst(out, '[Service gap or delay reported]', stillOpen[0]?.title || 'No posted service gap.');
    out = replaceFirst(out, '[Action planned to address it]', report.recommendations || 'Continue posted operational follow-up.');
    return out;
  }

  if (slide === 11) {
    out = replaceFirst(out, '[Challenge 1]', issue1?.title || 'No posted technical challenge.');
    out = replaceFirst(out, '[Challenge 2]', issue2?.title || 'No second posted challenge.');
    out = replaceFirst(out, '[Challenge 3]', issues[2]?.title || report.challengesAndRisks || 'No third posted challenge.');
    out = replaceFirst(out, '[Solution 1]', issue1?.resolution || issue1?.actionsTaken || 'Monitor and close remaining posted work.');
    out = replaceFirst(out, '[Solution 2]', issue2?.resolution || issue2?.actionsTaken || 'Prioritise remaining open tickets.');
    out = replaceFirst(out, '[Solution 3]', report.recommendations || 'Keep SLA focus on posted tickets.');
    return out;
  }

  if (slide === 12) {
    out = replaceFirst(out, '[Title]', issue1?.title || 'No posted issue');
    out = replaceFirst(out, '[Describe the recurring problem and how it affected operations.]', issue1?.description || issue1?.rootCause || 'No posted issue detail.');
    out = replaceFirst(out, '[Who or what was affected.]', issue1?.department || 'ICT users');
    out = replaceFirst(out, '[Describe the corrective and preventive actions taken or proposed.]', issue1?.actionsTaken || issue1?.resolution || 'No posted action.');
    out = replaceFirst(out, '[Done / In progress / Planned]', issue1?.status || 'Planned');
    return out;
  }

  if (slide === 13) {
    out = replaceFirst(out, '[Title]', issue2?.title || 'No posted issue');
    out = replaceFirst(out, '[Describe what fails and what triggers the failure.]', issue2?.rootCause || issue2?.description || 'No posted outage mechanism.');
    out = replaceFirst(out, '[What staff must do to recover.]', issue2?.actionsTaken || 'No posted recovery steps.');
    out = replaceFirst(out, '[Protective measure 1]', report.recommendations || 'Keep monitoring posted services.');
    out = replaceFirst(out, '[Automation or monitoring step]', 'Track remaining open tickets until closure.');
    out = replaceFirst(out, '[Alerting or diagnostic check]', 'Review SLA breaches from posted tickets.');
    return out;
  }

  if (slide === 14) {
    const first = stillOpen[0];
    const second = stillOpen[1];
    out = replaceFirst(out, '[Open ticket 1 title]', first?.title || 'No open posted ticket');
    out = replaceFirst(out, '[Scope of work and what remains to be done.]', first?.actionsTaken || first?.description || 'No remaining posted work.');
    out = replaceFirst(out, '[00] of [00] completed', first ? `00 of 01 completed` : '00 of 00 completed');
    out = replaceFirst(out, '[Open ticket 2 title]', second?.title || 'No second open posted ticket');
    out = replaceFirst(out, '[Scope of work and what remains to be done.]', second?.actionsTaken || second?.description || 'No remaining posted work.');
    out = replaceFirst(out, '[00] of [00] completed', second ? `00 of 01 completed` : '00 of 00 completed');
    out = replaceFirst(out, '[date]', stillOpen[0]?.resolvedAt?.slice(0, 10) || report.reportingPeriod || label);
    return out;
  }

  if (slide === 15) {
    out = replaceFirst(
      out,
      '[Describe the internet performance or connectivity issues seen during the period and which services were affected.]',
      networkTickets[0]?.description || networkTickets[0]?.title || 'No posted network observation.'
    );
    out = replaceFirst(out, '[Network inspection report name or date]', networkTickets[0]?.id || `${label} network review`);
    out = replaceFirst(out, '[Action taken with the ISP or vendor]', networkTickets[0]?.actionsTaken || 'No posted ISP action.');
    out = replaceFirst(out, '[Configuration or monitoring change]', networkTickets[0]?.resolution || 'No posted configuration change.');
    out = replaceFirst(out, '[Next step and owner]', report.nextMonthPriorities || 'ICT Support');
    return out;
  }

  if (slide === 16) {
    out = replaceFirst(out, '[Name]', report.employeeName || 'IT Support');
    out = replaceFirst(out, '[Email / phone]', report.employeeEmail || '');
    return out;
  }

  return out;
}

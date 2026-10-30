function clean(value?: string, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

export function draftDailyWork(input: {
  title?: string;
  category?: string;
  department?: string;
  systemOrDevice?: string;
  status?: string;
  hoursSpent?: number;
}) {
  const title = clean(input.title, 'this ICT task');
  const system = clean(input.systemOrDevice, 'the affected system');
  const dept = clean(input.department, 'the requesting unit');
  const category = clean(input.category, 'ICT operations').toLowerCase();
  const status = clean(input.status, 'In Progress').toLowerCase();
  const hours = input.hoursSpent ? `${input.hoursSpent} hour(s)` : 'the planned time';

  return {
    description: `ICT ${category} activity: ${title}. Work was performed for ${dept} on ${system} over ${hours}, with the aim of keeping company operations running smoothly.`,
    actionTaken: `Assessed the request, worked on ${system}, completed the required ${category} steps for "${title}", and confirmed the service state with ${dept}.`,
    resultOutcome:
      status === 'completed'
        ? `${title} on ${system} is complete. ${dept} can continue business work without this ICT interruption.`
        : `${title} on ${system} is currently ${status}. Follow-up continues until the service is fully restored for ${dept}.`,
    businessImpact: `This reduces operational delay for ${dept}, protects uptime of ${system}, and supports the company with reliable ICT service for daily business.`
  };
}

export function draftTicketWriteup(input: {
  title?: string;
  category?: string;
  department?: string;
  applicationOrDevice?: string;
  priority?: string;
  status?: string;
}) {
  const title = clean(input.title, 'this support issue');
  const device = clean(input.applicationOrDevice, 'the reported device or application');
  const dept = clean(input.department, 'the requesting unit');
  const category = clean(input.category, 'support').toLowerCase();
  const priority = clean(input.priority, 'Medium').toLowerCase();
  const status = clean(input.status, 'Open').toLowerCase();

  return {
    description: `${dept} reported a ${priority}-priority ${category} issue: ${title}. The incident involves ${device} and is being handled so business work is not blocked longer than necessary.`,
    actionsTaken: `Logged the ticket, investigated ${device}, applied ${category} troubleshooting for "${title}", and updated ${dept} on progress (${status}).`,
    rootCause: `To be confirmed during diagnosis of ${device} for "${title}".`,
    resolution: `Restoring ${device} for ${dept} limits downtime and keeps company operations, reporting, and customer-facing work on schedule.`
  };
}

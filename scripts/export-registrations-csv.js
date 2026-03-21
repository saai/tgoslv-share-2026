const fs = require('fs');
const path = require('path');
const { listRegistrations } = require('../lib/registrations');

function toCsvValue(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function main() {
  const eventId = process.argv[2] || process.env.EXPORT_EVENT_ID || '';
  const rows = await listRegistrations(eventId);
  const header = ['event_id', 'name', 'email', 'company', 'submitted_at'];
  const lines = [
    header.join(','),
    ...rows.map((row) => [
      row.event_id,
      row.name,
      row.email,
      row.company,
      row.submitted_at ? new Date(row.submitted_at).toISOString() : ''
    ].map(toCsvValue).join(','))
  ];

  const exportsDir = path.join(__dirname, '..', 'exports');
  fs.mkdirSync(exportsDir, { recursive: true });
  const filename = eventId ? `registrations-${eventId}.csv` : 'registrations.csv';
  const outputPath = path.join(exportsDir, filename);
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`CSV exported to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

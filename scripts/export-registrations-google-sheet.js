const { google } = require('googleapis');
const { listRegistrations } = require('../lib/registrations');

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  const auth = new google.auth.JWT({
    email: getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    key: getEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getEnv('GOOGLE_SHEET_ID');
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Registrations';
  const eventId = process.argv[2] || process.env.EXPORT_EVENT_ID || '';
  const rows = await listRegistrations(eventId);

  const values = [
    ['event_id', 'name', 'email', 'company', 'submitted_at'],
    ...rows.map((row) => [
      row.event_id,
      row.name,
      row.email,
      row.company,
      row.submitted_at ? new Date(row.submitted_at).toISOString() : ''
    ])
  ];

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`
  }).catch(() => {});

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values }
  });

  console.log(`Google Sheet updated: ${sheetName}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

const { createRegistration, checkRegistration, getStatus } = require('../lib/registrations');
const { sendConfirmationEmail } = require('../lib/email');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) {
    return {};
  }
  if (typeof req.body === 'object') {
    return req.body;
  }
  try {
    return JSON.parse(req.body);
  } catch (error) {
    return {};
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const action = String(req.query.action || '').trim();
      const eventId = String(req.query.event || '').trim();

      if (!eventId) {
        return sendJson(res, 400, { success: false, error: 'missing_event' });
      }

      if (action === 'status') {
        const status = await getStatus(eventId);
        return sendJson(res, 200, { success: true, ...status });
      }

      if (action === 'check') {
        const email = String(req.query.email || '').trim();
        const result = await checkRegistration(eventId, email);
        return sendJson(res, 200, result);
      }

      return sendJson(res, 200, { status: 'OK', message: 'db9 registration API ready' });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();
      const company = String(body.company || '').trim();
      const eventId = String(body.event || '').trim();
      const timestamp = body.timestamp || null;

      if (!name || !email || !company || !eventId) {
        return sendJson(res, 400, { success: false, error: 'missing_fields' });
      }

      const registration = await createRegistration({
        eventId,
        name,
        email,
        company,
        timestamp
      });

      if (!registration.success) {
        return sendJson(res, 200, registration);
      }

      const emailResult = await sendConfirmationEmail({
        eventId,
        name,
        email,
        company
      }).catch(() => ({ configured: true, sent: false }));

      if (emailResult.configured && !emailResult.sent) {
        return sendJson(res, 200, {
          ...registration,
          success: false,
          error: 'email_failed'
        });
      }

      return sendJson(res, 200, {
        ...registration,
        emailSent: Boolean(emailResult.sent),
        emailConfigured: Boolean(emailResult.configured)
      });
    }

    return sendJson(res, 405, { success: false, error: 'method_not_allowed' });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      error: 'server_error',
      message: error.message
    });
  }
};

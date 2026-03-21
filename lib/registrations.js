const { getPool } = require('./db');
const { getEventConfig } = require('./events');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isRegistrationClosed(eventConfig) {
  if (!eventConfig || !eventConfig.registrationClosesAt) {
    return false;
  }
  return Date.now() >= new Date(eventConfig.registrationClosesAt).getTime();
}

function buildStatusPayload(eventId, count) {
  const eventConfig = getEventConfig(eventId);
  const limit = eventConfig ? eventConfig.capacity : null;
  const displayCount = typeof limit === 'number' ? Math.min(count, limit) : count;
  const remaining = typeof limit === 'number' ? Math.max(0, limit - displayCount) : null;
  const registrationClosed = isRegistrationClosed(eventConfig);

  return {
    event: eventId,
    limit,
    count: displayCount,
    remaining,
    isFull: typeof limit === 'number' ? count >= limit : false,
    registrationClosed
  };
}

async function getRegistrationCount(client, eventId) {
  const result = await client.query(
    'SELECT COUNT(*)::int AS count FROM registrations WHERE event_id = $1',
    [eventId]
  );
  return result.rows[0] ? result.rows[0].count : 0;
}

async function registrationExists(client, eventId, emailNormalized) {
  const result = await client.query(
    'SELECT EXISTS(SELECT 1 FROM registrations WHERE event_id = $1 AND email_normalized = $2) AS exists',
    [eventId, emailNormalized]
  );
  return Boolean(result.rows[0] && result.rows[0].exists);
}

async function getStatus(eventId) {
  const pool = getPool();
  const count = await getRegistrationCount(pool, eventId);
  return buildStatusPayload(eventId, count);
}

async function checkRegistration(eventId, email) {
  const pool = getPool();
  const emailNormalized = normalizeEmail(email);
  const [count, exists] = await Promise.all([
    getRegistrationCount(pool, eventId),
    emailNormalized ? registrationExists(pool, eventId, emailNormalized) : Promise.resolve(false)
  ]);

  return {
    success: true,
    exists,
    ...buildStatusPayload(eventId, count)
  };
}

async function createRegistration(input) {
  const eventId = String(input.eventId || '').trim();
  const eventConfig = getEventConfig(eventId);
  if (!eventConfig) {
    return { success: false, error: 'unknown_event' };
  }

  const emailNormalized = normalizeEmail(input.email);
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [eventId]);

    const exists = await registrationExists(client, eventId, emailNormalized);
    const currentCount = await getRegistrationCount(client, eventId);

    if (isRegistrationClosed(eventConfig)) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'registration_closed',
        ...buildStatusPayload(eventId, currentCount)
      };
    }

    if (exists) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'duplicate',
        ...buildStatusPayload(eventId, currentCount)
      };
    }

    if (typeof eventConfig.capacity === 'number' && currentCount >= eventConfig.capacity) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'full',
        ...buildStatusPayload(eventId, currentCount)
      };
    }

    await client.query(
      `INSERT INTO registrations (event_id, name, email, email_normalized, company, submitted_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()))`,
      [
        eventId,
        String(input.name || '').trim(),
        String(input.email || '').trim(),
        emailNormalized,
        String(input.company || '').trim(),
        input.timestamp || null
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      ...buildStatusPayload(eventId, currentCount + 1)
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {}
    throw error;
  } finally {
    client.release();
  }
}

async function listRegistrations(eventId) {
  const pool = getPool();
  const params = [];
  let whereClause = '';
  if (eventId) {
    params.push(eventId);
    whereClause = 'WHERE event_id = $1';
  }

  const result = await pool.query(
    `SELECT event_id, name, email, company, submitted_at
     FROM registrations
     ${whereClause}
     ORDER BY event_id ASC, submitted_at ASC`,
    params
  );

  return result.rows;
}

module.exports = {
  createRegistration,
  checkRegistration,
  getStatus,
  listRegistrations
};

const nodemailer = require('nodemailer');
const { getEventConfig } = require('./events');

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (process.env.SMTP_URL) {
    transporter = nodemailer.createTransport(process.env.SMTP_URL);
    return transporter;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.EMAIL_FROM) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });

  return transporter;
}

async function sendConfirmationEmail(registration) {
  const transport = getTransporter();
  if (!transport || !process.env.EMAIL_FROM) {
    return { configured: false, sent: false };
  }

  const eventConfig = getEventConfig(registration.eventId);
  if (!eventConfig) {
    throw new Error('Unknown event for confirmation email');
  }

  const subject = `【报名确认】TGO 硅谷分会活动：${eventConfig.title}`;
  const body = [
    `${registration.name || '朋友'}，您好：`,
    '',
    '感谢报名 TGO 硅谷分会活动，现确认您的报名已成功。',
    '',
    `活动信息：${eventConfig.title}`,
    '时间：',
    eventConfig.dateText,
    eventConfig.timeText,
    '地点：',
    eventConfig.locationText,
    '主办：',
    eventConfig.organizerText,
    '',
    '请按时到场。如活动安排有更新，我们会通过邮件另行通知。',
    '',
    '期待与您现场交流。'
  ].join('\n');

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: registration.email,
    subject,
    text: body
  });

  return { configured: true, sent: true };
}

module.exports = {
  sendConfirmationEmail
};

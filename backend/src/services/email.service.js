const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const { logger } = require('../lib/logger');

/** Emails captured by the "memory" transport (tests and E2E only). */
const outbox = [];

function createSmtpSender() {
  const { host, port, secure, user, pass } = config.email.smtp;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
  return (message) => transporter.sendMail(message);
}

function createSender() {
  switch (config.email.transport) {
    case 'smtp':
      return createSmtpSender();
    case 'memory':
      return async (message) => {
        outbox.push(message);
      };
    case 'console':
    default:
      // Development only. Env validation forbids this transport in production.
      return async (message) => {
        logger.info(
          { to: message.to, subject: message.subject, text: message.text },
          'Email (console transport, development only)',
        );
      };
  }
}

const send = createSender();

async function sendEmail({ to, subject, text, html }) {
  await send({ from: config.email.from, to, subject, text, html });
}

module.exports = { sendEmail, outbox };

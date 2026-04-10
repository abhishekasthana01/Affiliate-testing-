const config = require('../config');

let sendgrid = null;
function getSendgrid() {
  if (sendgrid) return sendgrid;
  // Lazy load so local dev works without the package/env.
  // eslint-disable-next-line global-require
  const sg = require('@sendgrid/mail');
  sg.setApiKey(process.env.SENDGRID_API_KEY);
  sendgrid = sg;
  return sendgrid;
}

async function sendEmail({ to, subject, html, text }) {
  const enabled = config.features.emailSending && process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM;
  if (!enabled) {
    console.log(`[MOCK EMAIL] to=${to} subject="${subject}"`);
    if (text) console.log(text);
    if (html && !text) console.log(html);
    return { mocked: true };
  }

  const sg = getSendgrid();
  await sg.send({
    to,
    from: process.env.EMAIL_FROM,
    subject,
    text,
    html,
  });
  return { sent: true };
}

module.exports = { sendEmail };


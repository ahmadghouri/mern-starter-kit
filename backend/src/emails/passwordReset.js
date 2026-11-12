function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function passwordResetEmail({ name, resetUrl, expiresInMinutes }) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  return {
    subject: 'Reset your password',
    text: [
      `Hi ${name},`,
      '',
      'We received a request to reset your password.',
      `Open this link within ${expiresInMinutes} minutes to choose a new password:`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>Hi ${safeName},</p>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${safeUrl}">Choose a new password</a>
        (link expires in ${expiresInMinutes} minutes)
      </p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  };
}

module.exports = { passwordResetEmail, escapeHtml };

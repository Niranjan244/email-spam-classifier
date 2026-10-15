const nodemailer = require('nodemailer');

const createTransporter = () => {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_PASS || '').replace(/\s+/g, '');

  if (!user || !pass) {
    return null;
  }

  if (user.includes('@gmail.com') || process.env.SMTP_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
};

/**
 * Sends a 6-digit verification code to the specified email.
 * Falls back gracefully to console logging if SMTP is not configured.
 */
const sendOtpEmail = async (toEmail, code) => {
  if (process.env.NODE_ENV === 'test') {
    return { sent: true, mock: true, code };
  }

  const transporter = createTransporter();
  const fromAddress =
    process.env.EMAIL_FROM ||
    `"Spam Classifier Security" <${process.env.SMTP_USER || 'no-reply@spamclassifier.local'}>`;

  if (!transporter) {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log(
        `[EmailService] SMTP not configured. Development 2FA Code for ${toEmail}: [${code}]`
      );
    }
    return {
      sent: false,
      reason: 'smtp_not_configured',
      code
    };
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #2563eb; margin: 0; font-size: 22px;">Spam Classifier Security</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Two-Step Verification</p>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hello,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Here is your single-use 6-digit verification code to sign into your account:</p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b; background-color: #f1f5f9; padding: 14px 28px; border-radius: 8px; border: 1px dashed #cbd5e1; font-family: monospace;">
          ${code}
        </span>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>. If you did not attempt to sign in, please secure your account immediately.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">Email Spam & Threat Detection Platform</p>
    </div>
  `;

  const textContent = `Your Spam Classifier 2-Step Verification Code is: ${code}\nThis code is valid for 10 minutes.\nIf you did not request this code, please ignore this email.`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `Your Verification Code: ${code}`,
      text: textContent,
      html: htmlContent
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error('[EmailService] Failed to send OTP email:', error.message);
    }
    return { sent: false, reason: 'smtp_error', error: error.message, code };
  }
};

module.exports = {
  sendOtpEmail
};

import { config } from "../config.js";

let transporter;
let nodemailer;
let etherealAccount;

async function loadNodemailer() {
  if (nodemailer) return nodemailer;
  try {
    const mod = await import("nodemailer");
    nodemailer = mod.default;
    return nodemailer;
  } catch (error) {
    console.warn("[email] nodemailer not installed — password emails disabled.", error.message);
    return null;
  }
}

async function getSmtpTransporter() {
  if (transporter !== undefined) return transporter;
  if (!config.smtp.user || !config.smtp.pass) {
    transporter = null;
    return null;
  }

  const mailer = await loadNodemailer();
  if (!mailer) {
    transporter = null;
    return null;
  }

  transporter = mailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
  return transporter;
}

async function getEtherealTransporter() {
  if (!config.allowEtherealEmail) return null;
  const mailer = await loadNodemailer();
  if (!mailer) return null;
  if (!etherealAccount) {
    etherealAccount = await mailer.createTestAccount();
    console.info("[email] Using Ethereal test inbox for password reset (dev).");
  }
  return mailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass,
    },
  });
}

export async function isEmailConfigured() {
  return Boolean(await getSmtpTransporter());
}

export function passwordResetDeliveryStatus() {
  return {
    smtpConfigured: Boolean(config.smtp.user && config.smtp.pass),
    etherealFallback: config.allowEtherealEmail,
    registeredAccountsOnly: true,
  };
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const from = config.smtp.from || config.smtp.user || "The Screening Room <no-reply@localhost>";

  const subject = "Reset your The Screening Room password";
  const text = [
    "You asked to reset your The Screening Room password.",
    "",
    `Open this link (valid ${config.passwordResetTtlMinutes} minutes):`,
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>You asked to reset your The Screening Room password.</p>
    <p><a href="${resetUrl}">Choose a new password</a></p>
    <p>This link expires in ${config.passwordResetTtlMinutes} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  let transport = await getSmtpTransporter();
  let via = "smtp";

  if (!transport) {
    transport = await getEtherealTransporter();
    via = "ethereal";
  }

  if (!transport) {
    console.warn("[email] No mail transport — password reset link:");
    console.warn(resetUrl);
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    const mailer = await loadNodemailer();
    const info = await transport.sendMail({ from, to, subject, text, html });
    const previewUrl = via === "ethereal" && mailer ? mailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      console.info("[email] Ethereal preview:", previewUrl);
    }
    return { sent: true, via, previewUrl: previewUrl || undefined };
  } catch (error) {
    console.error("[email] Failed to send password reset:", error.message);
    console.warn("[email] Password reset link (delivery failed):");
    console.warn(resetUrl);
    return { sent: false, reason: "send_failed", error: error.message };
  }
}

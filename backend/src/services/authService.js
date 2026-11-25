import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { normalizeWatchRegion } from "../constants/regions.js";
import { sendPasswordResetEmail } from "./emailService.js";

const AVATAR_PATH_RE = /^\/api\/uploads\/(avatars|community)\/[a-zA-Z0-9_.-]+$/i;

function hashResetToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    watchRegion: user.watchRegion,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function assertAvatarUrl(avatarUrl) {
  if (avatarUrl == null || avatarUrl === "") return null;
  if (typeof avatarUrl !== "string" || avatarUrl.length > 500) {
    const err = new Error("Invalid avatar URL");
    err.status = 400;
    throw err;
  }
  if (AVATAR_PATH_RE.test(avatarUrl)) return avatarUrl;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const err = new Error("Avatar must be an uploaded image URL");
  err.status = 400;
  throw err;
}

export async function register({ email, password, displayName, watchRegion }) {
  const normalized = email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalized } });
  if (exists) {
    const err = new Error("Email already registered");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: normalized,
      passwordHash,
      displayName: displayName.trim(),
      watchRegion: normalizeWatchRegion(watchRegion, config.watchRegion),
    },
  });

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login({ email, password }) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toPublicUser(user) : null;
}

export async function updateWatchRegion(userId, watchRegion) {
  const region = normalizeWatchRegion(watchRegion);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { watchRegion: region },
  });
  return toPublicUser(user);
}

export async function updateProfile(userId, { displayName, avatarUrl, watchRegion, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const data = {};

  if (displayName !== undefined) {
    const name = displayName.trim();
    if (!name) {
      const err = new Error("Display name is required");
      err.status = 400;
      throw err;
    }
    data.displayName = name;
  }

  if (avatarUrl !== undefined) {
    data.avatarUrl = assertAvatarUrl(avatarUrl);
  }

  if (watchRegion !== undefined) {
    data.watchRegion = normalizeWatchRegion(watchRegion, config.watchRegion);
  }

  if (newPassword) {
    if (!currentPassword) {
      const err = new Error("Current password is required");
      err.status = 400;
      throw err;
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      const err = new Error("Current password is incorrect");
      err.status = 401;
      throw err;
    }
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  if (!Object.keys(data).length) {
    return toPublicUser(user);
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return toPublicUser(updated);
}

export async function requestPasswordReset(email) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return {
      registered: false,
      message: "Enter the email address you used when you registered.",
      emailSent: false,
    };
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    return {
      registered: false,
      message: "No account with this email.",
      emailSent: false,
      hint: "Password reset is only for registered users. Create an account first, then use this page.",
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + config.passwordResetTtlMinutes * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${config.clientOrigin.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
  const emailResult = await sendPasswordResetEmail({ to: user.email, resetUrl });

  if (emailResult.sent) {
    const hint =
      emailResult.via === "ethereal" && emailResult.previewUrl
        ? "This is a dev test message — open the preview link below to see the email (not your real inbox)."
        : `Check your inbox and spam folder. The link expires in ${config.passwordResetTtlMinutes} minutes.`;

    return {
      registered: true,
      message:
        emailResult.via === "ethereal"
          ? "Test email sent (Ethereal). Gmail is not configured yet."
          : "We emailed you a reset link.",
      emailSent: true,
      emailPreviewUrl: emailResult.previewUrl,
      hint,
    };
  }

  const out = {
    registered: true,
    message: "Your account was found, but we could not send email.",
    emailSent: false,
    smtpConfigured: Boolean(config.smtp.user && config.smtp.pass),
  };

  if (config.exposePasswordResetLink) {
    out.resetUrl = resetUrl;
    out.hint =
      "Use the reset link below. To receive mail at Gmail, set SMTP_USER and SMTP_PASS in backend/.env (Google App Password).";
  } else {
    out.hint = "Ask the site admin to configure Gmail SMTP in backend/.env.";
  }

  if (emailResult.reason === "send_failed") {
    out.message = "Gmail SMTP rejected the message. Check SMTP_USER, SMTP_PASS (App Password), and try again.";
    if (config.exposePasswordResetLink) out.resetUrl = resetUrl;
    out.hint = emailResult.error || out.hint;
  }

  return out;
}

export async function resetPasswordWithToken(rawToken, newPassword) {
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!token) {
    const err = new Error("Reset token is required");
    err.status = 400;
    throw err;
  }

  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    const err = new Error("This reset link is invalid or has expired");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { message: "Password updated. You can sign in with your new password." };
}

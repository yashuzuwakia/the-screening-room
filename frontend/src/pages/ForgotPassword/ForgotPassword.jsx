import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, ExternalLink, Mail } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";
import { apiFetch, isApiMode } from "../../services/apiClient";
import { requestPasswordReset } from "../../services/authApi";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const { isSignedIn } = useProfile();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState("");
  const [devLink, setDevLink] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [registered, setRegistered] = useState(null);
  const [emailSent, setEmailSent] = useState(null);
  const [smtpConfigured, setSmtpConfigured] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isApiMode()) return;
    apiFetch("/auth/password-reset/config", { auth: false })
      .then((data) => setSmtpConfigured(Boolean(data.smtpConfigured)))
      .catch(() => setSmtpConfigured(false));
  }, []);

  if (!isApiMode()) {
    return (
      <div className="container page forgot-password">
        <p className="text-muted">Password reset requires a registered email account (VITE_USE_API=true).</p>
        <Link to="/login" className="btn btn--secondary">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (isSignedIn) return <Navigate to="/profile" replace />;

  const copyLink = async () => {
    if (!devLink) return;
    try {
      await navigator.clipboard.writeText(devLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the link manually.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setHint("");
    setDevLink("");
    setPreviewUrl("");
    setRegistered(null);
    setEmailSent(null);
    setCopied(false);
    setLoading(true);
    try {
      const data = await requestPasswordReset(email.trim());
      setMessage(data.message);
      setHint(data.hint ?? "");
      setRegistered(data.registered ?? null);
      setEmailSent(Boolean(data.emailSent));
      if (data.resetUrl) setDevLink(data.resetUrl);
      if (data.emailPreviewUrl) setPreviewUrl(data.emailPreviewUrl);
    } catch (err) {
      setError(err.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page forgot-password">
      <motion.form
        className="forgot-password__card"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="forgot-password__title">Forgot password?</h1>
        <p className="text-muted forgot-password__lead">
          Only <strong>registered</strong> accounts can reset a password. Use the same email you used on{" "}
          <Link to="/login">Register</Link>.
        </p>
        {smtpConfigured === false && (
          <p className="forgot-password__smtp-note text-muted">
            Gmail is not configured on this server yet — you may get a test email preview or a reset link on this page
            after you submit.
          </p>
        )}

        <label className="forgot-password__field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            autoComplete="email"
            required
          />
        </label>

        {error && <p className="forgot-password__error">{error}</p>}
        {message && (
          <p
            className={
              registered === false
                ? "forgot-password__error"
                : emailSent
                  ? "forgot-password__ok"
                  : "forgot-password__notice"
            }
          >
            {message}
          </p>
        )}
        {hint && <p className="forgot-password__hint text-muted">{hint}</p>}

        {registered === false && (
          <Link to="/login" className="btn btn--secondary btn--sm">
            Register an account
          </Link>
        )}

        {previewUrl && (
          <div className="forgot-password__link-box">
            <p className="forgot-password__link-label">Test email preview (dev)</p>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="forgot-password__dev-link">
              <ExternalLink size={14} /> View message in browser
            </a>
          </div>
        )}

        {devLink && (
          <div className="forgot-password__link-box">
            <p className="forgot-password__link-label">Your reset link</p>
            <a href={devLink} className="forgot-password__dev-link">
              Open reset page
            </a>
            <button type="button" className="btn btn--ghost btn--sm forgot-password__copy" onClick={copyLink}>
              <Copy size={14} /> {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}

        <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
          <Mail size={18} /> {loading ? "Sending…" : "Send reset instructions"}
        </button>

        <Link to="/login" className="forgot-password__back">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </motion.form>
    </div>
  );
}

import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";
import { isApiMode } from "../../services/apiClient";
import { resetPassword } from "../../services/authApi";
import "../ForgotPassword/ForgotPassword.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { isSignedIn } = useProfile();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isApiMode()) {
    return (
      <div className="container page">
        <p className="text-muted">Password reset requires API mode.</p>
      </div>
    );
  }

  if (isSignedIn) return <Navigate to="/profile" replace />;

  if (!token) {
    return (
      <div className="container page">
        <p className="text-muted">This reset link is missing a token. Request a new one from the sign-in page.</p>
        <Link to="/forgot-password" className="btn btn--secondary">
          Forgot password
        </Link>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const data = await resetPassword({ token, password });
      setMessage(data.message);
    } catch (err) {
      setError(err.message || "Could not reset password.");
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
        <h1 className="forgot-password__title">Choose a new password</h1>
        <p className="text-muted forgot-password__lead">Enter a new password for your account (at least 8 characters).</p>

        <label className="forgot-password__field">
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label className="forgot-password__field">
          <span>Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {error && <p className="forgot-password__error">{error}</p>}
        {message && <p className="forgot-password__ok">{message}</p>}

        <button type="submit" className="btn btn--primary btn--lg" disabled={loading || Boolean(message)}>
          <KeyRound size={18} /> {loading ? "Saving…" : "Update password"}
        </button>

        {message && (
          <Link to="/login" className="btn btn--secondary btn--lg">
            Sign in
          </Link>
        )}
      </motion.form>
    </div>
  );
}

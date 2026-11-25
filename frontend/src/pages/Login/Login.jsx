import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Popcorn } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";
import { isApiMode } from "../../services/apiClient.js";
import RegionPicker from "../../components/common/RegionPicker";
import { DEFAULT_WATCH_REGION } from "../../constants/regions.js";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { isSignedIn, signIn, signInWithApi, useApi } = useProfile();
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [watchRegion, setWatchRegion] = useState(DEFAULT_WATCH_REGION);

  if (isSignedIn) return <Navigate to="/profile" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (useApi || isApiMode()) {
        const payload =
          mode === "register"
            ? { email, password, displayName, watchRegion }
            : { email, password, displayName };
        await signInWithApi(payload, mode);
      } else {
        if (!displayName.trim()) return;
        signIn(displayName, watchRegion);
      }
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const apiActive = useApi || isApiMode();

  return (
    <div className="container page login">
      <motion.form
        className="login__card"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.33, 1, 0.45, 1] }}
      >
        <span className="navbar__logo login__logo">
          <Popcorn size={22} strokeWidth={2.4} />
        </span>
        <h1 className="login__title">Welcome to The Screening Room</h1>
        <p className="login__subtitle">
          {apiActive
            ? "Create an account to sync your watchlist and ratings."
            : "Tell us what to call you and we'll keep your watchlist and searches on this device."}
        </p>

        {apiActive && (
          <div className="login__tabs">
            <button
              type="button"
              className={`login__tab${mode === "login" ? " is-active" : ""}`}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`login__tab${mode === "register" ? " is-active" : ""}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
        )}

        {mode === "register" && (
          <>
            <label className="login__field">
              <span>Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                autoComplete="name"
                required={apiActive}
              />
            </label>
            <div className="login__field">
              <RegionPicker value={watchRegion} onChange={setWatchRegion} id="register-region" />
              <p className="text-muted login__region-hint">
                Used for regional genres, streaming, and your Discover country. You can change it later on Discover.
              </p>
            </div>
          </>
        )}

        {apiActive ? (
          <>
            <label className="login__field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="login__field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </label>
            {mode === "login" && (
              <p className="login__forgot">
                <Link to="/forgot-password">Forgot password?</Link>
                <span className="login__forgot-note text-muted"> — registered email only</span>
              </p>
            )}
          </>
        ) : (
          <>
            <label className="login__field">
              <span>Your name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                autoComplete="given-name"
                required
              />
            </label>
            <div className="login__field">
              <RegionPicker value={watchRegion} onChange={setWatchRegion} id="local-register-region" />
            </div>
          </>
        )}

        {error && <p className="login__error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--lg login__submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "register" ? "Create account" : "Continue"} <ArrowRight size={18} />
        </button>

        <p className="login__note">
          {apiActive ? "Your watchlist and ratings are stored in your account." : "Local mode — enable VITE_USE_API for the server."}
        </p>
      </motion.form>
    </div>
  );
}

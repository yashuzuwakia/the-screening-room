import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, KeyRound, Loader2, MapPin, X } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";
import { uploadProfileAvatar } from "../../services/authApi";
import { resolveApiMediaUrl } from "../../utils/mediaUrl";
import DropdownSelect from "../common/DropdownSelect";
import { REGIONS, isValidRegion } from "../../constants/regions";
import "./ProfileEditPanel.css";

const REGION_OPTIONS = REGIONS.map((r) => ({
  value: r.code,
  label: r.label,
  flag: r.flag,
}));

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function ProfileEditPanel({ onClose }) {
  const { name, avatarUrl, watchRegion, useApi, saveProfile, mergeUser } = useProfile();
  const formId = useId();
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState(name);
  const [previewUrl, setPreviewUrl] = useState(avatarUrl);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(undefined);
  const [country, setCountry] = useState(watchRegion);
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resolvedPreview = resolveApiMediaUrl(previewUrl);

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Profile photo must be 2 MB or smaller.");
      return;
    }

    setError("");
    setUploading(true);
    try {
      if (useApi) {
        const { user, url } = await uploadProfileAvatar(file);
        mergeUser(user);
        setPreviewUrl(url ?? user?.avatarUrl);
        setPendingAvatarUrl(undefined);
        setSuccess("Photo updated. Save if you changed your name or password.");
      } else {
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Could not read image"));
          reader.readAsDataURL(file);
        });
        setPreviewUrl(dataUrl);
        setPendingAvatarUrl(dataUrl);
      }
    } catch (err) {
      setError(err.message || "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const clearAvatar = () => {
    setPreviewUrl(null);
    setPendingAvatarUrl(null);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Display name is required.");
      return;
    }

    if (changePassword) {
      if (!useApi) {
        setError("Password changes require an account with email sign-in.");
        return;
      }
      if (!currentPassword || !newPassword) {
        setError("Enter your current and new password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
    }

    const patch = { displayName: trimmed };
    if (pendingAvatarUrl !== undefined) {
      patch.avatarUrl = pendingAvatarUrl;
    }
    if (isValidRegion(country) && country.toUpperCase() !== watchRegion?.toUpperCase()) {
      patch.watchRegion = country.toUpperCase();
    }
    if (changePassword && newPassword) {
      patch.currentPassword = currentPassword;
      patch.newPassword = newPassword;
    }

    setBusy(true);
    try {
      await saveProfile(patch);
      setSuccess("Profile updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePassword(false);
      setPendingAvatarUrl(undefined);
      if (changePassword) {
        setTimeout(() => onClose?.(), 1200);
      }
    } catch (err) {
      setError(err.message || "Could not save profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-edit" aria-labelledby={`${formId}-title`}>
      <div className="profile-edit__head">
        <h2 id={`${formId}-title`} className="profile-edit__title">
          Edit profile
        </h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <form className="profile-edit__form" onSubmit={handleSubmit}>
        <div className="profile-edit__avatar-block">
          <div className="profile-edit__avatar-preview">
            {resolvedPreview ? (
              <img src={resolvedPreview} alt="" />
            ) : (
              <span aria-hidden="true">{trimmedInitial(displayName || name)}</span>
            )}
            {uploading && (
              <span className="profile-edit__avatar-busy" aria-live="polite">
                <Loader2 size={22} className="spin" />
              </span>
            )}
          </div>
          <div className="profile-edit__avatar-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              id={`${formId}-avatar`}
              onChange={handleAvatarPick}
            />
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={uploading || busy}
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={15} /> {resolvedPreview ? "Change photo" : "Add photo"}
            </button>
            {resolvedPreview && (
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={clearAvatar}>
                Remove
              </button>
            )}
          </div>
        </div>

        <label className="profile-edit__field">
          <span>Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            maxLength={40}
            required
          />
        </label>

        <div className="profile-edit__field profile-edit__region">
          <span className="profile-edit__region-label">
            <MapPin size={15} aria-hidden /> Watch country
          </span>
          <p className="text-muted profile-edit__region-hint">
            Used for Discover, regional lists, and streaming availability.
          </p>
          <DropdownSelect
            id={`${formId}-country`}
            label="Country"
            value={country}
            onChange={setCountry}
            options={REGION_OPTIONS}
          />
        </div>

        {useApi && (
          <div className="profile-edit__password-toggle">
            <label className="profile-edit__checkbox">
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => {
                  setChangePassword(e.target.checked);
                  if (!e.target.checked) {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }
                  setError("");
                }}
              />
              <span>
                <KeyRound size={16} aria-hidden /> Change password
              </span>
            </label>
          </div>
        )}

        {useApi && changePassword && (
          <fieldset className="profile-edit__password">
            <legend className="sr-only">Change password</legend>
            <p className="text-muted profile-edit__password-hint">
              Use <Link to="/forgot-password">forgot password</Link> if you are signed out on another device.
            </p>
            <label className="profile-edit__field">
              <span>Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                minLength={8}
              />
            </label>
            <label className="profile-edit__field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
            <label className="profile-edit__field">
              <span>Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
          </fieldset>
        )}

        {error && <p className="profile-edit__feedback profile-edit__feedback--error">{error}</p>}
        {success && <p className="profile-edit__feedback profile-edit__feedback--ok">{success}</p>}

        <div className="profile-edit__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || uploading}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function trimmedInitial(value) {
  const ch = value?.trim()?.charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

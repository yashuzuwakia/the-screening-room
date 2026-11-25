import { apiFetch, setAuthToken } from "./apiClient.js";
import { guessImageMime } from "../utils/imageMime.js";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function registerUser({ email, password, displayName, watchRegion }) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: { email, password, displayName, watchRegion },
    auth: false,
  });
  setAuthToken(data.token);
  return data.user;
}

export async function loginUser({ email, password }) {
  const data = await apiFetch("/auth/login", { method: "POST", body: { email, password }, auth: false });
  setAuthToken(data.token);
  return data.user;
}

export function logoutUser() {
  setAuthToken(null);
}

export async function fetchMe() {
  const data = await apiFetch("/auth/me");
  return data.user;
}

export async function updateUserWatchRegion(watchRegion) {
  const data = await apiFetch("/auth/me", { method: "PATCH", body: { watchRegion } });
  return data.user;
}

export async function updateUserProfile(body) {
  const data = await apiFetch("/auth/me", { method: "PATCH", body });
  return data.user;
}

export async function uploadProfileAvatar(file) {
  const data = await fileToBase64(file);
  const payload = await apiFetch("/auth/me/avatar", {
    method: "POST",
    body: {
      data,
      mimeType: guessImageMime(file),
      name: file.name,
    },
  });
  return payload;
}

export async function requestPasswordReset(email) {
  return apiFetch("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
}

export async function resetPassword({ token, password }) {
  return apiFetch("/auth/reset-password", { method: "POST", body: { token, password }, auth: false });
}

export const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
export const AUTH_STORAGE_KEY = "moviematch:token";

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_STORAGE_KEY, token);
  else localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = "Request failed";
    if (typeof data.error === "string") message = data.error;
    else if (typeof data.message === "string") message = data.message;
    else if (!Object.keys(data).length) message = `Request failed (${response.status})`;
    else if (response.status === 304) message = "Cached response was stale — refresh the page and try again.";
    else if (data.error && typeof data.error === "object") {
      const parts = [...(data.error.formErrors ?? [])];
      for (const [field, errs] of Object.entries(data.error.fieldErrors ?? {})) {
        if (Array.isArray(errs) && errs.length) parts.push(`${field}: ${errs.join(", ")}`);
      }
      if (parts.length) message = parts.join("; ");
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return data;
}

export const isApiMode = () => import.meta.env.VITE_USE_API === "true" || Boolean(import.meta.env.VITE_API_URL);

import { useCallback, useEffect, useState } from "react";
import { isApiMode } from "../services/apiClient.js";

async function pingApi() {
  const response = await fetch("/api/health", { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("API unavailable");
  return Boolean(data.ok);
}

export function useApiHealth() {
  const enabled = isApiMode();
  const [state, setState] = useState({ checked: !enabled, ok: !enabled, error: null });

  const retry = useCallback(async () => {
    if (!enabled) {
      setState({ checked: true, ok: true, error: null });
      return;
    }
    try {
      const ok = await pingApi();
      setState({ checked: true, ok, error: null });
    } catch (err) {
      setState({ checked: true, ok: false, error: err.message ?? "Cannot reach API" });
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    pingApi()
      .then((ok) => {
        if (!cancelled) setState({ checked: true, ok, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ checked: true, ok: false, error: err.message ?? "Cannot reach API" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { enabled, ...state, retry };
}

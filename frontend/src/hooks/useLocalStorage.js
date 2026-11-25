import { useEffect, useState } from "react";

function readJson(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readJson(key, initialValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be full or disabled (private mode); the app keeps working in memory.
    }
  }, [key, value]);

  return [value, setValue];
}

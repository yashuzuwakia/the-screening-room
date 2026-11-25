import { useEffect, useState } from "react";
import { ProfileContext } from "./profileContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  fetchMe,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
  updateUserWatchRegion,
} from "../services/authApi.js";
import { getAuthToken, isApiMode } from "../services/apiClient.js";
import { DEFAULT_WATCH_REGION, getRegion, isValidRegion } from "../constants/regions.js";

const STORAGE_KEY = "moviematch:profile";
const MAX_RECENT_SEARCHES = 5;
const EMPTY_PROFILE = {
  name: "",
  email: "",
  avatarUrl: null,
  userId: null,
  role: "user",
  createdAt: null,
  recentSearches: [],
  watchRegion: DEFAULT_WATCH_REGION,
  /** Set when user picks a country in Discover (avoid fetchMe racing over it). */
  watchRegionTouched: false,
};

export default function ProfileProvider({ children }) {
  const [profile, setProfile] = useLocalStorage(STORAGE_KEY, EMPTY_PROFILE);
  const apiAuth = isApiMode() && Boolean(getAuthToken());
  const [hydrating, setHydrating] = useState(apiAuth);

  useEffect(() => {
    if (!apiAuth) return;

    let cancelled = false;
    fetchMe()
      .then((user) => {
        if (cancelled) return;
        setProfile((current) => {
          const serverRegion = isValidRegion(user.watchRegion) ? user.watchRegion.toUpperCase() : null;
          const keepLocal = current.watchRegionTouched && isValidRegion(current.watchRegion);
          return {
            ...current,
            name: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl ?? null,
            userId: user.id,
            role: user.role ?? "user",
            createdAt: user.createdAt ?? current.createdAt,
            watchRegion: keepLocal ? current.watchRegion.toUpperCase() : serverRegion ?? current.watchRegion,
          };
        });
      })
      .catch(() => {
        if (!cancelled) logoutUser();
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiAuth, setProfile]);

  const signInLocal = (name, watchRegion = DEFAULT_WATCH_REGION) => {
    const next = isValidRegion(watchRegion) ? watchRegion.toUpperCase() : DEFAULT_WATCH_REGION;
    setProfile((current) => ({ ...current, name: name.trim(), watchRegion: next }));
  };

  const signInWithApi = async (credentials, mode) => {
    const user = mode === "register" ? await registerUser(credentials) : await loginUser(credentials);
    setProfile((current) => ({
      ...current,
      name: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      userId: user.id,
      role: user.role ?? "user",
      createdAt: user.createdAt ?? null,
      watchRegion: isValidRegion(user.watchRegion) ? user.watchRegion.toUpperCase() : current.watchRegion,
      watchRegionTouched: false,
    }));
    return user;
  };

  const signOut = () => {
    if (isApiMode()) logoutUser();
    setProfile((current) => ({
      ...EMPTY_PROFILE,
      recentSearches: current.recentSearches,
      watchRegion: current.watchRegion ?? DEFAULT_WATCH_REGION,
    }));
  };

  const saveSearch = (prefs) =>
    setProfile((current) => {
      const key = JSON.stringify(prefs);
      const others = current.recentSearches.filter((s) => JSON.stringify(s.prefs) !== key);
      return {
        ...current,
        recentSearches: [{ prefs, searchedAt: Date.now() }, ...others].slice(0, MAX_RECENT_SEARCHES),
      };
    });

  const clearHistory = () => setProfile((current) => ({ ...current, recentSearches: [] }));

  const watchRegion = isValidRegion(profile.watchRegion) ? profile.watchRegion.toUpperCase() : DEFAULT_WATCH_REGION;
  const watchRegionMeta = getRegion(watchRegion);

  const setWatchRegion = (code) => {
    const next = code?.toUpperCase();
    if (!isValidRegion(next)) return;
    setProfile((current) => ({
      ...current,
      watchRegion: next,
      watchRegionTouched: true,
    }));
    if (isApiMode() && getAuthToken()) {
      updateUserWatchRegion(next)
        .then((user) => {
          if (isValidRegion(user.watchRegion)) {
            setProfile((current) => ({
              ...current,
              watchRegion: user.watchRegion.toUpperCase(),
            }));
          }
        })
        .catch((err) => console.warn("[profile] Could not save country", err));
    }
  };

  const applyUser = (user) => {
    if (!user) return;
    setProfile((current) => ({
      ...current,
      name: user.displayName ?? current.name,
      email: user.email ?? current.email,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role ?? current.role,
      createdAt: user.createdAt ?? current.createdAt,
      watchRegion: isValidRegion(user.watchRegion) ? user.watchRegion.toUpperCase() : current.watchRegion,
    }));
  };

  const mergeUser = (user) => applyUser(user);

  const saveProfile = async (patch) => {
    if (isApiMode() && getAuthToken()) {
      const user = await updateUserProfile(patch);
      applyUser(user);
      return user;
    }
    setProfile((current) => ({
      ...current,
      ...(patch.displayName !== undefined ? { name: patch.displayName.trim() } : {}),
      ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
      ...(patch.watchRegion && isValidRegion(patch.watchRegion)
        ? { watchRegion: patch.watchRegion.toUpperCase(), watchRegionTouched: true }
        : {}),
    }));
    return null;
  };

  const isSignedIn = isApiMode() ? Boolean(getAuthToken() && profile.userId) : Boolean(profile.name);
  const isAdmin = isSignedIn && profile.role === "admin";

  const value = {
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
    userId: profile.userId,
    createdAt: profile.createdAt,
    isSignedIn,
    isAdmin,
    role: profile.role ?? "user",
    isHydrating: hydrating,
    watchRegion,
    watchRegionMeta,
    setWatchRegion,
    recentSearches: profile.recentSearches,
    signIn: signInLocal,
    signInWithApi,
    saveProfile,
    mergeUser,
    signOut,
    saveSearch,
    clearHistory,
    useApi: isApiMode(),
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "./api";
import type { AuthResponse, PublicUser } from "./auth-types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: PublicUser | null;
  accessToken: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // On first load, the access token only lives in memory and is gone after
  // a page refresh — try to silently mint a new one from the httpOnly
  // refresh cookie before deciding the user is logged out.
  useEffect(() => {
    let cancelled = false;
    apiFetch<AuthResponse>("/auth/refresh", { method: "POST" })
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setAccessToken(data.accessToken);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setAccessToken(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: { email, password },
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setAccessToken(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, status, login, register, logout }),
    [user, accessToken, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export { ApiError };

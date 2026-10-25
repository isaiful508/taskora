"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, ApiError } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    let cancelled = false;

    api.auth
      .me()
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
        setStatus("authenticated");
      })
      .catch((err) => {
        if (cancelled) return;
        if (!(err instanceof ApiError) || err.status !== 401) {
          console.error("Failed to load session", err);
        }
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setUser(res.user);
    setStatus("authenticated");
    return res.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.auth.signup({ name, email, password });
    setUser(res.user);
    setStatus("authenticated");
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
      router.replace("/login");
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, status, login, signup, logout }),
    [user, status, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

export function dashboardPathFor(role: User["role"]) {
  return role === "MENTOR" ? "/dashboard/mentor" : "/dashboard/student";
}

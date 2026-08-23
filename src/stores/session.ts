"use client";
import { create } from "zustand";

export type ClientUser = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type SessionState = {
  user: ClientUser | null;
  loaded: boolean;
  setUser: (u: ClientUser | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  user: null,
  loaded: false,
  setUser: (user) => set({ user, loaded: true }),
  refresh: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json();
      const u = json?.data?.user;
      set({
        user: u ? { firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role } : null,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },
}));

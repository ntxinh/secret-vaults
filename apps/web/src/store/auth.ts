import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  gasUrl: string | null;
  token: string | null;
  setCredentials: (gasUrl: string, token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      gasUrl: null,
      token: null,
      setCredentials: (gasUrl, token) => set({ gasUrl, token }),
      clear: () => set({ gasUrl: null, token: null }),
    }),
    { name: "secret-vaults-auth" },
  ),
);

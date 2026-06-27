import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  apiUrl: string | null;
  token: string | null;
  setCredentials: (apiUrl: string, token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiUrl: null,
      token: null,
      setCredentials: (apiUrl, token) => set({ apiUrl, token }),
      clear: () => set({ apiUrl: null, token: null }),
    }),
    { name: "secret-vaults-auth" },
  ),
);

import { create } from "zustand";

export interface ToastItem {
  id: number;
  title: string;
  variant: "success" | "error";
}

interface ToastState {
  toasts: ToastItem[];
  push: (title: string, variant?: ToastItem["variant"]) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (title, variant = "success") =>
    set((s) => ({ toasts: [...s.toasts, { id: nextId++, title, variant }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

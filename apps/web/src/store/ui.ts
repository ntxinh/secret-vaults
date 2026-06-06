import { create } from "zustand";

interface UiState {
  revealedIds: Record<string, true>;
  toggleRevealed: (id: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  revealedIds: {},
  toggleRevealed: (id) =>
    set((s) => {
      const next = { ...s.revealedIds };
      if (next[id]) delete next[id];
      else next[id] = true;
      return { revealedIds: next };
    }),
}));

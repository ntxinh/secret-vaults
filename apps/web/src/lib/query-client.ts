import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { useToastStore } from "../store/toasts";
import { ApiError } from "./api";

function handleError(error: unknown) {
  if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
    useAuthStore.getState().clear();
    useToastStore.getState().push("Session invalid — log in again", "error");
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  useToastStore.getState().push(message, "error");
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
  });
}

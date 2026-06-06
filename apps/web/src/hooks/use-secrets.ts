import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ApiConfig } from "../lib/api";
import type { SecretInput } from "../lib/schema";
import { useAuthStore } from "../store/auth";
import { useToastStore } from "../store/toasts";

export function useApiConfig(): ApiConfig | null {
  const gasUrl = useAuthStore((s) => s.gasUrl);
  const token = useAuthStore((s) => s.token);
  return gasUrl && token ? { gasUrl, token } : null;
}

export function useSecrets() {
  const cfg = useApiConfig();
  return useQuery({
    queryKey: ["secrets"],
    queryFn: () => api.list(cfg!),
    enabled: cfg !== null,
  });
}

function useInvalidateAndToast(message: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["secrets"] });
    useToastStore.getState().push(message);
  };
}

export function useCreateSecret() {
  const cfg = useApiConfig();
  const onSuccess = useInvalidateAndToast("Secret created");
  return useMutation({
    mutationFn: (input: SecretInput) => api.create(cfg!, input),
    onSuccess,
  });
}

export function useUpdateSecret() {
  const cfg = useApiConfig();
  const onSuccess = useInvalidateAndToast("Secret updated");
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: SecretInput }) =>
      api.update(cfg!, id, fields),
    onSuccess,
  });
}

export function useDeleteSecret() {
  const cfg = useApiConfig();
  const onSuccess = useInvalidateAndToast("Secret deleted");
  return useMutation({
    mutationFn: (id: string) => api.remove(cfg!, id),
    onSuccess,
  });
}

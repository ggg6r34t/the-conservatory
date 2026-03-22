import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { updateProfileIdentity } from "@/features/auth/api/authClient";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";

export function useUpdateProfile() {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: { displayName: string; avatarUrl?: string | null }) =>
      updateProfileIdentity(user!, patch),
    onSuccess: (nextUser) => {
      setUser(nextUser);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth }).catch(() => undefined);
    },
  });
}

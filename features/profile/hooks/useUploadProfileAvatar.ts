import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { updateProfileIdentity } from "@/features/auth/api/authClient";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import type { PlantImageAsset } from "@/features/plants/services/photoService";

import { uploadProfileAvatar } from "../services/profilePhotoService";

export function useUploadProfileAvatar() {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: PlantImageAsset) => {
      if (!user) throw new Error("Not authenticated.");
      const { avatarUrl } = await uploadProfileAvatar(user.id, asset);
      return updateProfileIdentity(user, {
        displayName: user.displayName,
        avatarUrl,
      });
    },
    onSuccess: (nextUser) => {
      setUser(nextUser);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth }).catch(() => undefined);
    },
  });
}

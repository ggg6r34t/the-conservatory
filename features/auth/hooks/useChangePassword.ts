import { useMutation } from "@tanstack/react-query";

import { changePassword } from "@/features/auth/api/authClient";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useChangePassword() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => {
      if (!user) {
        throw new Error("You need to be signed in to change your password.");
      }

      await changePassword(user, currentPassword, newPassword);
    },
  });
}

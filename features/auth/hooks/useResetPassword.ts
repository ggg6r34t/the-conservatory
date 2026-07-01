import { useMutation } from "@tanstack/react-query";

import { updatePasswordFromRecovery } from "@/features/auth/api/authClient";

export function useResetPassword() {
  return useMutation({
    mutationFn: (newPassword: string) => updatePasswordFromRecovery(newPassword),
  });
}

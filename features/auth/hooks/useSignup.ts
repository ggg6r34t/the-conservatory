import { useMutation } from "@tanstack/react-query";

import { signup } from "@/features/auth/api/authClient";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";

export function useSignup() {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName: string;
    }) => signup(email, password, displayName),
    onSuccess: ({ user, requiresEmailVerification }) => {
      if (!requiresEmailVerification) {
        setUser(user);
      }
    },
  });
}

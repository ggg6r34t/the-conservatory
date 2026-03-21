import { useMutation } from "@tanstack/react-query";

import { login } from "@/features/auth/api/authClient";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";

export function useLogin() {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: ({ user }) => {
      setUser(user);
    },
  });
}

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  AuthClientError,
  completeOAuthSignIn,
} from "@/features/auth/api/authClient";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import {
  isOAuthCancellation,
  type OAuthProvider,
} from "@/features/auth/services/oauthErrors";
import {
  startOAuthSignIn,
  type OAuthSignInScreen,
} from "@/features/auth/services/oauthSignIn";

export function useOAuthSignIn(screen: OAuthSignInScreen) {
  const setUser = useAuthStore((state) => state.setUser);
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      setActiveProvider(provider);
      try {
        await startOAuthSignIn(provider, screen);
        return completeOAuthSignIn(provider, screen);
      } finally {
        setActiveProvider(null);
      }
    },
    onSuccess: (user) => {
      setUser(user);
    },
  });

  return {
    signInWithProvider: mutation.mutateAsync,
    isPending: mutation.isPending,
    activeProvider,
    isOAuthCancellation,
    getErrorMessage: (error: unknown) =>
      error instanceof AuthClientError
        ? error.message
        : "We couldn't complete sign in. Please try again.",
  };
}

import { useEffect, useRef } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useGuestMigrationPrompt } from "@/features/auth/hooks/useGuestMigrationPrompt";

export function usePostAuthGuestMigration() {
  const { isAuthenticated, user } = useAuth();
  const { promptGuestMigration } = useGuestMigrationPrompt();
  const handledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    if (handledUserIdRef.current === user.id) {
      return;
    }

    handledUserIdRef.current = user.id;
    void promptGuestMigration(user.id);
  }, [isAuthenticated, promptGuestMigration, user?.id]);
}

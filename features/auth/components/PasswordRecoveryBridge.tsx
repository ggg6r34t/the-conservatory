import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { processPasswordRecoveryUrl } from "@/features/auth/services/processPasswordRecoveryUrl";
import { usePasswordRecoveryStore } from "@/features/auth/stores/usePasswordRecoveryStore";
import {
  isPasswordRecoveryPending,
  markPasswordRecoveryPending,
} from "@/services/auth/passwordRecoveryState";

export function PasswordRecoveryBridge() {
  const router = useRouter();
  const handledUrls = useRef(new Set<string>());
  const activate = usePasswordRecoveryStore((state) => state.activate);

  useEffect(() => {
    let cancelled = false;

    const bootstrapRecovery = async () => {
      const pending = await isPasswordRecoveryPending();
      if (pending && !cancelled) {
        activate();
        router.replace("/(auth)/reset-password");
      }
    };

    void bootstrapRecovery();

    return () => {
      cancelled = true;
    };
  }, [activate, router]);

  useEffect(() => {
    const navigateIfHandled = async (url: string | null) => {
      if (!url || handledUrls.current.has(url)) {
        return;
      }

      const handled = await processPasswordRecoveryUrl(url);
      if (!handled) {
        return;
      }

      handledUrls.current.add(url);
      router.replace("/(auth)/reset-password");
    };

    void Linking.getInitialURL().then((url) => navigateIfHandled(url));

    const subscription = Linking.addEventListener("url", (event) => {
      void navigateIfHandled(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!env.isSupabaseConfigured || !supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        void markPasswordRecoveryPending();
        activate();
        router.replace("/(auth)/reset-password");
        return;
      }

      if (event === "SIGNED_OUT") {
        usePasswordRecoveryStore.getState().clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [activate, router]);

  return null;
}

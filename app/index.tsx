import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { WelcomeGateway } from "@/features/onboarding/components/WelcomeGateway";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import { resolveEntryRoute } from "@/features/onboarding/utils/resolveEntryRoute";

export default function IndexRoute() {
  const { authStatus, user } = useAuth();
  const onboarding = useOnboarding(user?.id);

  if (!onboarding.isReady) {
    return null;
  }

  const resolvedAuthStatus =
    authStatus === "authenticated"
      ? "authenticated"
      : authStatus === "guest"
        ? "guest"
        : "anonymous";

  const entryRoute = resolveEntryRoute({
    authStatus: resolvedAuthStatus,
    onboardingStatus: onboarding.status,
  });

  if (entryRoute !== "/") {
    return <Redirect href={entryRoute} />;
  }

  return <WelcomeGateway />;
}

import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/hooks/useAuth";

export default function IndexRoute() {
  const { isAuthenticated } = useAuth();

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/login"} />;
}

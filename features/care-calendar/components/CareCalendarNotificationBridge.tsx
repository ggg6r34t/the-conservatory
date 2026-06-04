import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCareCalendarNotificationListener } from "@/features/care-calendar/hooks/useCareCalendarNotificationListener";

export function CareCalendarNotificationBridge() {
  const { isAuthenticated } = useAuth();
  useCareCalendarNotificationListener(isAuthenticated);
  return null;
}

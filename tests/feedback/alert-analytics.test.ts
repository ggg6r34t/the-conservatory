import {
  trackAppAlertCancelled,
  trackAppAlertDismissed,
  trackAppAlertPrimaryAction,
  trackAppAlertSecondaryAction,
  trackAppAlertShown,
} from "@/services/feedback/alertAnalytics";
import { trackEvent } from "@/services/analytics/analyticsService";

jest.mock("@/services/analytics/analyticsService", () => ({
  trackEvent: jest.fn(),
}));

describe("alert analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("tracks shown without message text", () => {
    trackAppAlertShown({
      variant: "error",
      analyticsKey: "care_log_save_failed",
      sourceScreen: "care_log_form",
    });

    expect(trackEvent).toHaveBeenCalledWith("app_alert_shown", {
      variant: "error",
      analytics_key: "care_log_save_failed",
      source_screen: "care_log_form",
    });
  });

  it("tracks primary, secondary, cancel, and dismiss actions", () => {
    const base = {
      variant: "destructive" as const,
      analyticsKey: "plant_delete",
      sourceScreen: "plant_detail",
    };

    trackAppAlertPrimaryAction(base);
    trackAppAlertSecondaryAction(base);
    trackAppAlertCancelled(base);
    trackAppAlertDismissed(base);

    expect(trackEvent).toHaveBeenCalledWith("app_alert_primary_action", expect.objectContaining({
      action_type: "primary",
    }));
    expect(trackEvent).toHaveBeenCalledWith("app_alert_secondary_action", expect.objectContaining({
      action_type: "secondary",
    }));
    expect(trackEvent).toHaveBeenCalledWith("app_alert_cancelled", expect.any(Object));
    expect(trackEvent).toHaveBeenCalledWith("app_alert_dismissed", expect.any(Object));
  });
});

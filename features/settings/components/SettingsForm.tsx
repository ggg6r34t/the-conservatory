import { View } from "react-native";

import { PreferenceControl } from "@/features/settings/components/PreferenceControl";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";

export function SettingsForm() {
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();

  if (!settingsQuery.data) {
    return null;
  }

  return (
    <View>
      <PreferenceControl
        label="Watering Alerts"
        description="Stay updated on your plants' needs with reminders saved on this device."
        value={settingsQuery.data.remindersEnabled}
        onValueChange={(next) => {
          updateSettings.mutate({ remindersEnabled: next });
        }}
      />
    </View>
  );
}

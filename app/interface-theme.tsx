import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { InterfaceThemePicker } from "@/features/theme/components/InterfaceThemePicker";
import { InterfaceThemeSaveAction } from "@/features/theme/components/InterfaceThemeSaveAction";

export default function InterfaceThemeScreen() {
  return (
    <ProfileScreenScaffold
      navigationTitle="Interface Theme"
      headerRight={<InterfaceThemeSaveAction />}
      title="Choose the light that best illuminates your garden."
      subtitle="Visual atmosphere"
    >
      <InterfaceThemePicker />
    </ProfileScreenScaffold>
  );
}

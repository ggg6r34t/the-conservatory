import { StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";

export function QuickActions() {
  return (
    <View style={styles.container}>
      <PrimaryButton label="New Specimen" href="/plant/add" />
      <SecondaryButton label="Open Library" href="/(tabs)/library" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});

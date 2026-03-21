import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { useAddLog } from "@/features/care-logs/hooks/useAddLog";

interface CareLogFormProps {
  plantId: string;
}

const logTypes: Array<"water" | "mist" | "feed" | "prune" | "pest" | "note"> = [
  "water",
  "mist",
  "feed",
  "prune",
  "pest",
  "note",
];

export function CareLogForm({ plantId }: CareLogFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [notes, setNotes] = useState("");
  const [logType, setLogType] = useState<
    "water" | "mist" | "feed" | "prune" | "pest" | "note"
  >("water");
  const addLog = useAddLog(plantId);

  const handleSubmit = async () => {
    try {
      await addLog.mutateAsync({ logType, notes });
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to log care",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {logTypes.map((type) => {
          const isActive = type === logType;
          return (
            <Pressable
              key={type}
              onPress={() => setLogType(type)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? colors.tertiaryContainer
                    : colors.surfaceContainerHigh,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? colors.surfaceBright : colors.onSurface },
                ]}
              >
                {type.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInputField
        label="Care notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="How is your plant doing today?"
        multiline
      />
      <PrimaryButton
        label="Save Care Log"
        onPress={handleSubmit}
        loading={addLog.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  chipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
});

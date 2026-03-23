import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { useAddLog } from "@/features/care-logs/hooks/useAddLog";
import type { CareLogType } from "@/types/models";

interface CareLogFormProps {
  plantId: string;
}

const logTypes: {
  key: CareLogType;
  label: string;
  icon: string;
  iconFamily?: React.ComponentProps<typeof Icon>["family"];
}[] = [
  { key: "water", label: "WATER", icon: "water-drop", iconFamily: "MaterialIcons" },
  { key: "mist", label: "MIST", icon: "opacity", iconFamily: "MaterialIcons" },
  { key: "feed", label: "FERTILIZE", icon: "white-balance-sunny" },
  { key: "repot", label: "REPOT", icon: "shovel" },
  { key: "prune", label: "PRUNE", icon: "content-cut" },
  { key: "inspect", label: "INSPECT", icon: "magnify" },
  { key: "pest", label: "PESTS", icon: "bug-outline" },
  { key: "note", label: "PHOTO", icon: "camera-outline" },
];

const conditionOptions = ["Healthy", "Needs Attention", "Declining"] as const;

export function CareLogForm({ plantId }: CareLogFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [notes, setNotes] = useState("");
  const [logType, setLogType] = useState<CareLogType>("water");
  const [condition, setCondition] =
    useState<(typeof conditionOptions)[number]>("Healthy");
  const addLog = useAddLog(plantId);
  const now = new Date();
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const nowLabel = `Today, ${timeLabel}`;

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
      <View style={styles.section}>
        <Text
          style={[styles.sectionLabel, { color: colors.secondaryOnContainer }]}
        >
          CARE TYPE
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
        >
          {logTypes.map((type) => {
            const isActive = type.key === logType;
            return (
              <Pressable
                key={type.key}
                onPress={() => setLogType(type.key)}
                style={styles.typeOption}
              >
                <View
                  style={[
                    styles.typeTile,
                    {
                      backgroundColor: isActive
                        ? colors.tertiaryContainer
                        : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <Icon
                    family={type.iconFamily}
                    name={type.icon}
                    size={24}
                    color={
                      isActive ? colors.surfaceBright : colors.onSurfaceVariant
                    }
                  />
                </View>
                <Text style={[styles.typeLabel, { color: colors.onSurface }]}>
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text
          style={[styles.sectionLabel, { color: colors.secondaryOnContainer }]}
        >
          CARE NOTES
        </Text>
        <TextInput
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="How is your plant doing today?"
          placeholderTextColor="#c6cbc5"
          textAlignVertical="top"
          style={[
            styles.notesInput,
            {
              backgroundColor: colors.surfaceContainerLow,
              color: colors.onSurface,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.timeRow,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <View style={styles.timeLeft}>
          <Icon
            name="calendar-blank-outline"
            size={22}
            color={colors.onSurface}
          />
          <Text style={[styles.timeLabel, { color: colors.onSurface }]}>
            {nowLabel}
          </Text>
        </View>
        <Icon
          name="chevron-right"
          size={22}
          color={colors.onSurfaceVariant}
        />
      </View>

      <View style={styles.section}>
        <Text
          style={[styles.sectionLabel, { color: colors.secondaryOnContainer }]}
        >
          CURRENT CONDITION
        </Text>
        <View style={styles.conditionWrap}>
          {conditionOptions.map((option) => {
            const isActive = option === condition;
            return (
              <Pressable
                key={option}
                onPress={() => setCondition(option)}
                style={[
                  styles.conditionChip,
                  {
                    backgroundColor: isActive
                      ? colors.tertiaryContainer
                      : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.conditionLabel,
                    {
                      color: isActive ? colors.surfaceBright : colors.onSurface,
                    },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

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
    gap: 28,
  },
  section: {
    gap: 14,
  },
  sectionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.6,
  },
  typeRow: {
    gap: 12,
    paddingRight: 24,
  },
  typeOption: {
    width: 64,
    gap: 8,
    alignItems: "center",
  },
  typeTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  notesInput: {
    minHeight: 196,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  timeRow: {
    borderRadius: 26,
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 21,
  },
  conditionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionChip: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  conditionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
});

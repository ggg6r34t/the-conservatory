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
import { useObservationTagging } from "@/features/ai/hooks/useObservationTagging";
import { buildCareLogNoteForSave } from "@/features/ai/services/observationTaggingService";
import type { ObservationTag } from "@/features/ai/types/ai";
import { useRecordCareEvent } from "@/features/care-logs/hooks/useRecordCareEvent";
import { useSnackbar } from "@/hooks/useSnackbar";
import type { CareLogCondition, CareLogType } from "@/types/models";

interface CareLogFormProps {
  plantId: string;
}

const logTypes: {
  key: CareLogType;
  label: string;
  icon: string;
  iconFamily?: React.ComponentProps<typeof Icon>["family"];
}[] = [
  {
    key: "water",
    label: "WATER",
    icon: "water-drop",
    iconFamily: "MaterialIcons",
  },
  { key: "mist", label: "MIST", icon: "opacity", iconFamily: "MaterialIcons" },
  { key: "feed", label: "FERTILIZE", icon: "white-balance-sunny" },
  { key: "repot", label: "REPOT", icon: "shovel" },
  { key: "prune", label: "PRUNE", icon: "content-cut" },
  { key: "inspect", label: "INSPECT", icon: "magnify" },
  { key: "pest", label: "PESTS", icon: "bug-outline" },
  { key: "note", label: "PHOTO", icon: "camera-outline" },
];

const conditionOptions: CareLogCondition[] = [
  "Healthy",
  "Needs Attention",
  "Declining",
];

export function CareLogForm({ plantId }: CareLogFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const [notes, setNotes] = useState("");
  const [logType, setLogType] = useState<CareLogType>("inspect");
  const [condition, setCondition] = useState<CareLogCondition | null>(null);
  const [suggestedRefinement, setSuggestedRefinement] = useState<string | null>(
    null,
  );
  const [selectedTags, setSelectedTags] = useState<ObservationTag[]>([]);
  const recordCareEvent = useRecordCareEvent(plantId);
  const observationTagging = useObservationTagging();
  const now = new Date();
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const nowLabel = `Today, ${timeLabel}`;

  const handleSubmit = async () => {
    try {
      const finalNote = buildCareLogNoteForSave({
        originalNote: notes,
        acceptedRefinement: suggestedRefinement,
        tags: selectedTags,
      });
      const result = await recordCareEvent.mutateAsync({
        logType,
        currentCondition: condition ?? undefined,
        notes: finalNote,
      });
      if (result.warningMessage) {
        snackbar.warning(result.warningMessage);
      } else {
        snackbar.success("Care log saved.");
      }
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to log care",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  const canAssist = notes.trim().length >= 8;

  const handleRefineNote = async () => {
    if (!canAssist) {
      return;
    }

    const result = await observationTagging.mutateAsync({
      note: notes,
      logType,
    });
    setSuggestedRefinement(result.refinedNote);
  };

  const handleAddTags = async () => {
    if (!canAssist) {
      return;
    }

    const result = await observationTagging.mutateAsync({
      note: notes,
      logType,
    });
    setSelectedTags(result.suggestedTags);
  };

  const toggleTag = (tag: ObservationTag) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag],
    );
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
          onChangeText={(value) => {
            setNotes(value);
            setSuggestedRefinement(null);
          }}
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
        <View style={styles.assistRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleRefineNote();
            }}
            disabled={!canAssist || observationTagging.isPending}
            style={[
              styles.assistChip,
              {
                backgroundColor: colors.surfaceContainerHigh,
                opacity: !canAssist || observationTagging.isPending ? 0.55 : 1,
              },
            ]}
          >
            <Text style={[styles.assistLabel, { color: colors.onSurface }]}>
              Refine Note
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleAddTags();
            }}
            disabled={!canAssist || observationTagging.isPending}
            style={[
              styles.assistChip,
              {
                backgroundColor: colors.surfaceContainerHigh,
                opacity: !canAssist || observationTagging.isPending ? 0.55 : 1,
              },
            ]}
          >
            <Text style={[styles.assistLabel, { color: colors.onSurface }]}>
              Add Observation Tags
            </Text>
          </Pressable>
        </View>

        {suggestedRefinement ? (
          <View
            style={[
              styles.suggestionCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Text
              style={[styles.suggestionEyebrow, { color: colors.secondary }]}
            >
              REFINED NOTE
            </Text>
            <Text style={[styles.suggestionBody, { color: colors.onSurface }]}>
              {suggestedRefinement}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setNotes(suggestedRefinement);
                setSuggestedRefinement(null);
              }}
            >
              <Text
                style={[styles.useSuggestionText, { color: colors.primary }]}
              >
                Use refinement
              </Text>
            </Pressable>
          </View>
        ) : null}

        {selectedTags.length ? (
          <View style={styles.tagWrap}>
            {selectedTags.map((tag) => (
              <Pressable
                key={tag}
                accessibilityRole="button"
                onPress={() => toggleTag(tag)}
                style={[
                  styles.tagChip,
                  { backgroundColor: colors.tertiaryContainer },
                ]}
              >
                <Text
                  style={[styles.tagLabel, { color: colors.surfaceBright }]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
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
            Logged now: {nowLabel}
          </Text>
        </View>
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
                onPress={() =>
                  setCondition((current) =>
                    current === option ? null : option,
                  )
                }
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
        loading={recordCareEvent.isPending}
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
  assistRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assistChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  assistLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  suggestionCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  suggestionEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
  },
  suggestionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  useSuggestionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tagLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 14,
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

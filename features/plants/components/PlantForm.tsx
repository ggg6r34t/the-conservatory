import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { SpeciesSuggestionBanner } from "@/features/ai/components/SpeciesSuggestionBanner";
import { useSpeciesSuggestion } from "@/features/ai/hooks/useSpeciesSuggestion";
import { buildCareDefaults } from "@/features/ai/services/careDefaultsService";
import type { LightCondition, SpeciesSuggestion } from "@/features/ai/types/ai";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { useAddPlant } from "@/features/plants/hooks/useAddPlant";
import { useUpdatePlant } from "@/features/plants/hooks/useUpdatePlant";
import type { PlantFormInput } from "@/features/plants/schemas/plantValidation";
import { plantSchema } from "@/features/plants/schemas/plantValidation";
import {
  clearPlantDraft,
  getPlantDraft,
  setPlantDraft,
} from "@/features/plants/services/plantDraftStorage";
import { pickPlantImage } from "@/features/plants/services/photoService";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";

interface PlantFormProps {
  mode: "create" | "edit";
  plantId?: string;
  initialValues?: Partial<PlantFormInput>;
}

const LOCATION_OPTIONS = ["East Conservatory", "Sunroom", "Studio Shelf", "Office"];
const SPECIES_SUGGESTIONS = ["Swiss Cheese Plant", "Fiddle Leaf", "Pothos"];
const HYDRATION_MIN = 3;
const HYDRATION_MAX = 21;
const LEGACY_DEFAULT_NOTES = "bright indirect light";
const DEFAULT_LIGHT_CONDITION: LightCondition = "indirect";
export const REMINDER_TIMING_COPY = "Adaptive reminders based on care rhythm";

function clampHydration(value: number) {
  return Math.min(HYDRATION_MAX, Math.max(HYDRATION_MIN, Math.round(value)));
}

function normalizeNotes(value?: string) {
  if (!value) {
    return "";
  }

  return value.trim().toLowerCase() === LEGACY_DEFAULT_NOTES ? "" : value;
}

function PlantInput({
  label,
  value,
  placeholder,
  onChangeText,
  icon,
  multiline = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  icon?: string;
  multiline?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        {icon ? (
          <Icon
            family="MaterialIcons"
            name={icon}
            size={20}
            color={colors.onSurfaceVariant}
          />
        ) : null}
        <TextInput
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor="#c6cbc5"
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: colors.onSurface },
          ]}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

function NotificationToggle({
  value,
  onPress,
}: {
  value: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={onPress}
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? colors.primary : colors.surfaceContainerHigh },
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          value && styles.toggleThumbActive,
          { backgroundColor: colors.surfaceBright },
        ]}
      />
    </Pressable>
  );
}

export function PlantForm({ mode, plantId, initialValues }: PlantFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const addPlant = useAddPlant();
  const updatePlant = useUpdatePlant(plantId ?? "");
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const mutation = mode === "create" ? addPlant : updatePlant;
  const [draftLoaded, setDraftLoaded] = useState(mode === "edit");
  const [locationOpen, setLocationOpen] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const lastHydratedEditPlantId = useRef<string | undefined>(undefined);
  const [lightCondition, setLightCondition] =
    useState<LightCondition>(DEFAULT_LIGHT_CONDITION);
  const [hasManualWateringOverride, setHasManualWateringOverride] = useState(
    mode === "edit",
  );
  const [dismissedSuggestionUri, setDismissedSuggestionUri] = useState<string | null>(
    null,
  );
  const [acceptedSuggestion, setAcceptedSuggestion] =
    useState<SpeciesSuggestion | null>(null);

  const [values, setValues] = useState<PlantFormInput>({
    name: initialValues?.name ?? "",
    speciesName: initialValues?.speciesName ?? "",
    nickname: initialValues?.nickname ?? "",
    location: initialValues?.location ?? "East Conservatory",
    wateringIntervalDays: initialValues?.wateringIntervalDays ?? 7,
    notes: normalizeNotes(initialValues?.notes),
    photoUri: initialValues?.photoUri,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const speciesSuggestionQuery = useSpeciesSuggestion(values.photoUri);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    let active = true;
    getPlantDraft()
      .then((saved) => {
        if (!saved || !active) {
          return;
        }

        setValues((current) => ({
          ...current,
          ...saved,
          location: saved.location ?? current.location,
          wateringIntervalDays: saved.wateringIntervalDays ?? current.wateringIntervalDays,
          notes: normalizeNotes(saved.notes) || current.notes,
        }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setDraftLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "create" || !draftLoaded) {
      return;
    }

    setPlantDraft(values).catch(() => undefined);
  }, [draftLoaded, mode, values]);

  useEffect(() => {
    if (!values.photoUri) {
      setDismissedSuggestionUri(null);
      return;
    }

    if (dismissedSuggestionUri && dismissedSuggestionUri !== values.photoUri) {
      setDismissedSuggestionUri(null);
    }
  }, [dismissedSuggestionUri, values.photoUri]);

  useEffect(() => {
    if (mode !== "edit" || !plantId || lastHydratedEditPlantId.current === plantId) {
      return;
    }

    if (
      !initialValues?.name &&
      !initialValues?.speciesName &&
      !initialValues?.nickname &&
      !initialValues?.location &&
      !initialValues?.photoUri &&
      initialValues?.wateringIntervalDays == null &&
      !initialValues?.notes
    ) {
      return;
    }

    setValues({
      name: initialValues?.name ?? "",
      speciesName: initialValues?.speciesName ?? "",
      nickname: initialValues?.nickname ?? "",
      location: initialValues?.location ?? "East Conservatory",
      wateringIntervalDays: initialValues?.wateringIntervalDays ?? 7,
      notes: normalizeNotes(initialValues?.notes),
      photoUri: initialValues?.photoUri,
    });
    lastHydratedEditPlantId.current = plantId;
  }, [initialValues, mode, plantId]);

  const remindersEnabled = settingsQuery.data?.remindersEnabled ?? true;
  const visibleSuggestion =
    values.photoUri && dismissedSuggestionUri !== values.photoUri
      ? speciesSuggestionQuery.data
      : null;
  const careDefaults = buildCareDefaults({
    speciesName: values.speciesName || acceptedSuggestion?.species || values.name,
    lightCondition,
    acceptedSuggestion,
  });

  useEffect(() => {
    if (hasManualWateringOverride) {
      return;
    }

    setValues((current) => {
      if (current.wateringIntervalDays === careDefaults.wateringIntervalDays) {
        return current;
      }

      return {
        ...current,
        wateringIntervalDays: careDefaults.wateringIntervalDays,
      };
    });
  }, [careDefaults.wateringIntervalDays, hasManualWateringOverride]);

  const handlePickImage = async () => {
    try {
      const asset = await pickPlantImage();
      if (!asset) {
        return;
      }

      setValues((current) => ({ ...current, photoUri: asset.uri }));
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to open photo library",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  const handleSaveDraft = async () => {
    await setPlantDraft(values);
    snackbar.success("Draft saved on this device.", {
      action: {
        label: "Undo",
        onPress: () => clearPlantDraft(),
      },
    });
  };

  const handleSubmit = async () => {
    const payload = {
      ...values,
      name: values.name.trim() || values.speciesName.trim(),
      speciesName: values.speciesName.trim() || values.name.trim(),
      notes: normalizeNotes(values.notes),
    };

    const parsed = plantSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0] ?? "",
        speciesName: fieldErrors.speciesName?.[0] ?? "",
      });
      return;
    }

    setErrors({});

    try {
      const result = await mutation.mutateAsync(parsed.data);
      if (mode === "create") {
        await clearPlantDraft().catch(() => undefined);
      }
      snackbar.success(
        mode === "create"
          ? "Specimen registered successfully."
          : "Specimen updated successfully.",
      );
      router.replace(`/plant/${result.plant.id}` as const);
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to save plant",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  const setHydrationValueFromPosition = useCallback(
    (positionX: number) => {
      if (sliderWidth <= 0) {
        return;
      }

      const ratio = Math.min(1, Math.max(0, positionX / sliderWidth));
      const value = HYDRATION_MIN + ratio * (HYDRATION_MAX - HYDRATION_MIN);
      setHasManualWateringOverride(true);
      setValues((current) => ({
        ...current,
        wateringIntervalDays: clampHydration(value),
      }));
    },
    [sliderWidth],
  );

  const sliderResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          setHydrationValueFromPosition(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          setHydrationValueFromPosition(event.nativeEvent.locationX);
        },
      }),
    [setHydrationValueFromPosition],
  );

  const sliderRatio =
    (clampHydration(values.wateringIntervalDays) - HYDRATION_MIN) /
    (HYDRATION_MAX - HYDRATION_MIN);

  const handleSliderLayout = (event: LayoutChangeEvent) => {
    setSliderWidth(event.nativeEvent.layout.width);
  };

  const applySpeciesSuggestion = (suggestion: SpeciesSuggestion) => {
    setAcceptedSuggestion(suggestion);
    setDismissedSuggestionUri(null);
    setHasManualWateringOverride(false);
    setValues((current) => ({
      ...current,
      speciesName: suggestion.species,
      name: current.name.trim() ? current.name : suggestion.species,
    }));
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={handlePickImage}
        style={[
          styles.imagePicker,
          {
            backgroundColor: colors.surface,
            borderColor: "#d8d4cb",
          },
        ]}
      >
        {values.photoUri ? (
          <Image
            source={{ uri: values.photoUri }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <>
            <Image
              source={require("@/assets/images/abstract-botanical-background.png")}
              style={styles.placeholderImage}
              contentFit="cover"
            />
            <View style={styles.imagePlaceholderContent}>
              <Icon
                family="MaterialIcons"
                name="add-a-photo"
                size={32}
                color={colors.onSurface}
              />
              <Text style={[styles.imagePlaceholderLabel, { color: colors.onSurface }]}>
                CAPTURE GROWTH
              </Text>
            </View>
          </>
        )}
      </Pressable>

      <View style={[styles.editorialHeader, styles.identityHeader]}>
        <Text style={[styles.eyebrow, { color: colors.secondary }]}>
          {mode === "create" ? "DOCUMENTATION" : "VISUAL IDENTITY"}
        </Text>
        <Text style={[styles.editorialTitle, { color: colors.onSurface }]}>
          {mode === "create" ? "Visual Identity" : "Refresh Portrait"}
        </Text>
        <Text style={[styles.editorialBody, { color: colors.onSurfaceVariant }]}>
          {mode === "create"
            ? "Start your journal with a high-fidelity image. This helps our botanical engine monitor health changes over time."
            : "Update the specimen portrait and refine its profile details so your conservatory stays accurate over time."}
        </Text>
      </View>

      <PlantInput
        label="Scientific or common name"
        value={values.speciesName}
        placeholder="e.g. Monstera Deliciosa"
        icon="search"
        onChangeText={(text) => {
          setAcceptedSuggestion(null);
          setValues((current) => ({ ...current, speciesName: text, name: text }));
        }}
      />

      {visibleSuggestion ? (
        <SpeciesSuggestionBanner
          suggestion={visibleSuggestion}
          onAccept={() => applySpeciesSuggestion(visibleSuggestion)}
          onDismiss={() => {
            setDismissedSuggestionUri(values.photoUri ?? null);
          }}
        />
      ) : null}

      <View style={styles.suggestionRow}>
        {SPECIES_SUGGESTIONS.map((suggestion) => (
          <Pressable
            key={suggestion}
            accessibilityRole="button"
            onPress={() =>
              setValues((current) => ({
                ...current,
                speciesName: suggestion,
                name: suggestion,
              }))
            }
            style={[
              styles.suggestionChip,
              {
                backgroundColor:
                  values.speciesName === suggestion
                    ? colors.tertiaryContainer
                    : colors.surfaceContainerHigh,
              },
            ]}
          >
            <Text
              style={[
                styles.suggestionChipText,
                {
                  color:
                    values.speciesName === suggestion
                      ? colors.surfaceBright
                      : colors.onSurfaceVariant,
                },
              ]}
            >
              {suggestion.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <PlantInput
        label="Nickname"
        value={values.nickname ?? ""}
        placeholder="Monty"
        onChangeText={(text) =>
          setValues((current) => ({ ...current, nickname: text }))
        }
      />

      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
          LOCATION
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setLocationOpen((current) => !current)}
          style={[
            styles.selectWrap,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.selectValue, { color: colors.onSurface }]}>
            {values.location || "Select location"}
          </Text>
          <Icon name="chevron-down" size={20} color={colors.onSurfaceVariant} />
        </Pressable>
        {locationOpen ? (
          <View
            style={[
              styles.locationMenu,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            {LOCATION_OPTIONS.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => {
                  setValues((current) => ({ ...current, location: option }));
                  setLocationOpen(false);
                }}
                style={styles.locationOption}
              >
                <Text
                  style={[
                    styles.locationOptionLabel,
                    {
                      color:
                        values.location === option
                          ? colors.primary
                          : colors.onSurface,
                    },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.editorialHeader, styles.protocolHeader]}>
        <Text style={[styles.eyebrow, { color: colors.secondary }]}>RHYTHM & CARE</Text>
        <Text style={[styles.editorialTitle, { color: colors.onSurface }]}>
          Maintenance Protocol
        </Text>
        <Text style={[styles.editorialBody, { color: colors.onSurfaceVariant }]}>
          {careDefaults.explanation}
        </Text>
      </View>

      <View style={[styles.protocolCard, { backgroundColor: colors.surfaceContainerLowest }]}>
        <View style={styles.protocolCardTop}>
          <View
            style={[
              styles.protocolIconTile,
              { backgroundColor: colors.primaryFixed },
            ]}
          >
            <Icon
              family="MaterialIcons"
              name="water-drop"
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={[styles.protocolTag, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Text style={[styles.protocolTagText, { color: colors.onSurfaceVariant }]}>
              HYDRATION
            </Text>
          </View>
        </View>
        <Text style={[styles.protocolLabel, { color: colors.onSurfaceVariant }]}>
          FREQUENCY
        </Text>
        <View style={styles.frequencyRow}>
          <Text style={[styles.frequencyNumber, { color: colors.onSurface }]}>
            Every {clampHydration(values.wateringIntervalDays)}
          </Text>
          <Text style={[styles.frequencyUnit, { color: colors.onSurface }]}>Days</Text>
        </View>
        <Text style={[styles.protocolHint, { color: colors.onSurfaceVariant }]}>
          {careDefaults.careProfileHint}
        </Text>

        <View
          style={styles.sliderTrackWrap}
          onLayout={handleSliderLayout}
          {...sliderResponder.panHandlers}
        >
          <View
            style={[styles.sliderTrack, { backgroundColor: colors.surfaceContainerHigh }]}
          />
          <View
            style={[
              styles.sliderThumb,
              {
                backgroundColor: colors.primary,
                left: sliderWidth ? sliderRatio * sliderWidth - 6 : 0,
              },
            ]}
          />
        </View>
      </View>

      <View style={[styles.protocolCard, styles.exposureCard, { backgroundColor: colors.surfaceContainerLowest }]}>
        <View style={styles.protocolCardTop}>
          <View
            style={[
              styles.protocolIconTile,
              { backgroundColor: colors.secondaryFixed },
            ]}
          >
            <Icon
              family="MaterialIcons"
              name="wb-sunny"
              size={18}
              color={colors.secondary}
            />
          </View>
          <View style={[styles.protocolTag, { backgroundColor: "#fff3ec" }]}>
            <Text style={[styles.protocolTagText, { color: colors.secondary }]}>
              EXPOSURE
            </Text>
          </View>
        </View>
        <View style={styles.exposureRow}>
          <View style={[styles.exposureDot, { backgroundColor: colors.secondary }]} />
          <Text style={[styles.exposureTitle, { color: colors.onSurface }]}>
            {lightCondition === "low"
              ? "Low Light"
              : lightCondition === "direct"
                ? "Direct Light"
                : "Bright Indirect Light"}
          </Text>
        </View>
        <Text style={[styles.exposureBody, { color: colors.onSurfaceVariant }]}>
          {careDefaults.lightSummary}
        </Text>
        <View style={styles.lightSelectorRow}>
          {(["low", "indirect", "direct"] as const).map((option) => {
            const isActive = option === lightCondition;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setLightCondition(option)}
                style={[
                  styles.lightChip,
                  {
                    backgroundColor: isActive
                      ? colors.tertiaryContainer
                      : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.lightChipLabel,
                    {
                      color: isActive ? colors.surfaceBright : colors.onSurface,
                    },
                  ]}
                >
                  {option.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.notificationCard, { backgroundColor: colors.surfaceContainerLow }]}>
        <View style={[styles.notificationIconTile, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Icon family="MaterialIcons" name="notifications" size={18} color={colors.onSurfaceVariant} />
        </View>
        <View style={styles.notificationCopy}>
          <Text style={[styles.notificationTitle, { color: colors.onSurface }]}>
            Push Notifications
          </Text>
          <Text style={[styles.notificationBody, { color: colors.onSurfaceVariant }]}>
            {REMINDER_TIMING_COPY}
          </Text>
        </View>
        <NotificationToggle
          value={remindersEnabled}
          onPress={() => updateSettings.mutate({ remindersEnabled: !remindersEnabled })}
        />
      </View>

      <PlantInput
        label="Care notes"
        value={values.notes ?? ""}
        placeholder="Add specimen-specific observations, routines, or reminders."
        multiline
        onChangeText={(text) =>
          setValues((current) => ({ ...current, notes: text }))
        }
      />

      {(errors.name || errors.speciesName) ? (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errors.name || errors.speciesName}
        </Text>
      ) : null}

      <PrimaryButton
        label={mode === "create" ? "Register Specimen" : "Save Changes"}
        onPress={handleSubmit}
        loading={mutation.isPending}
      />

      {mode === "create" ? (
        <Pressable accessibilityRole="button" onPress={handleSaveDraft} style={styles.draftAction}>
          <Text style={[styles.draftLabel, { color: colors.onSurface }]}>SAVE AS DRAFT</Text>
          <View style={[styles.draftUnderline, { backgroundColor: colors.primaryFixed }]} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 28,
  },
  imagePicker: {
    position: "relative",
    height: 334,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
  },
  imagePlaceholderContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  imagePlaceholderLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
  },
  editorialHeader: {
    gap: 8,
    marginTop: 2,
  },
  identityHeader: {
    marginBottom: -8,
  },
  protocolHeader: {
    marginBottom: -8,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.2,
  },
  editorialTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 25,
    lineHeight: 31,
  },
  editorialBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 320,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  inputWrap: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputWrapMultiline: {
    alignItems: "flex-start",
    minHeight: 92,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -8,
  },
  suggestionChip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  suggestionChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  selectWrap: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  locationMenu: {
    marginTop: 8,
    borderRadius: 18,
    paddingVertical: 8,
  },
  locationOption: {
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  locationOptionLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  protocolCard: {
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 26,
    gap: 12,
  },
  protocolCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  protocolIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  protocolTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  protocolTagText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.9,
  },
  protocolLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.1,
  },
  frequencyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  frequencyNumber: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
    lineHeight: 36,
  },
  frequencyUnit: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 3,
  },
  protocolHint: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 280,
  },
  sliderTrackWrap: {
    position: "relative",
    height: 24,
    justifyContent: "center",
    marginTop: 2,
  },
  sliderTrack: {
    height: 3,
    borderRadius: 999,
  },
  sliderThumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 6,
  },
  exposureCard: {
    gap: 12,
  },
  exposureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exposureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exposureTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 19,
    lineHeight: 26,
  },
  exposureBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 22,
  },
  lightSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  lightChip: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lightChipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  notificationCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationIconTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 21,
  },
  notificationBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  errorText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  draftAction: {
    alignItems: "center",
    gap: 8,
    marginTop: -6,
  },
  draftLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  draftUnderline: {
    width: 28,
    height: 3,
    borderRadius: 999,
  },
});

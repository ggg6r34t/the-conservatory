import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { useAddPlant } from "@/features/plants/hooks/useAddPlant";
import { useUpdatePlant } from "@/features/plants/hooks/useUpdatePlant";
import type { PlantFormInput } from "@/features/plants/schemas/plantValidation";
import { plantSchema } from "@/features/plants/schemas/plantValidation";
import { pickPlantImage } from "@/features/plants/services/photoService";

interface PlantFormProps {
  mode: "create" | "edit";
  plantId?: string;
  initialValues?: Partial<PlantFormInput>;
}

export function PlantForm({ mode, plantId, initialValues }: PlantFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const addPlant = useAddPlant();
  const updatePlant = useUpdatePlant(plantId ?? "");
  const [values, setValues] = useState<PlantFormInput>({
    name: initialValues?.name ?? "",
    speciesName: initialValues?.speciesName ?? "",
    nickname: initialValues?.nickname ?? "",
    location: initialValues?.location ?? "",
    wateringIntervalDays: initialValues?.wateringIntervalDays ?? 7,
    notes: initialValues?.notes ?? "",
    photoUri: initialValues?.photoUri,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = mode === "create" ? addPlant : updatePlant;

  const handlePickImage = async () => {
    try {
      const asset = await pickPlantImage();
      if (!asset) {
        return;
      }

      setValues((current) => ({ ...current, photoUri: asset.uri }));
    } catch (error) {
      Alert.alert(
        "Unable to open photo library",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  const handleSubmit = async () => {
    const parsed = plantSchema.safeParse(values);
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
      router.replace(`/plant/${result.plant.id}` as const);
    } catch (error) {
      Alert.alert(
        "Unable to save plant",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePickImage}
        style={[
          styles.imagePicker,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        {values.photoUri ? (
          <Image
            source={{ uri: values.photoUri }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.imageLabel, { color: colors.primary }]}>
            Capture Growth
          </Text>
        )}
      </Pressable>
      <TextInputField
        label="Plant name"
        value={values.name}
        onChangeText={(text) =>
          setValues((current) => ({ ...current, name: text }))
        }
        placeholder="Monstera Deliciosa"
        error={errors.name}
      />
      <TextInputField
        label="Species or common name"
        value={values.speciesName}
        onChangeText={(text) =>
          setValues((current) => ({ ...current, speciesName: text }))
        }
        placeholder="Swiss Cheese Plant"
        error={errors.speciesName}
      />
      <TextInputField
        label="Nickname"
        value={values.nickname ?? ""}
        onChangeText={(text) =>
          setValues((current) => ({ ...current, nickname: text }))
        }
        placeholder="Monty"
      />
      <TextInputField
        label="Location"
        value={values.location ?? ""}
        onChangeText={(text) =>
          setValues((current) => ({ ...current, location: text }))
        }
        placeholder="Sunroom"
      />
      <TextInputField
        label="Water every (days)"
        value={String(values.wateringIntervalDays)}
        onChangeText={(text) =>
          setValues((current) => ({
            ...current,
            wateringIntervalDays: Number(text.replace(/[^0-9]/g, "") || 0),
          }))
        }
        keyboardType="number-pad"
        placeholder="7"
      />
      <TextInputField
        label="Care notes"
        value={values.notes ?? ""}
        onChangeText={(text) =>
          setValues((current) => ({ ...current, notes: text }))
        }
        placeholder="Bright indirect light, likes humidity."
        multiline
      />
      <PrimaryButton
        label={mode === "create" ? "Register Specimen" : "Save Changes"}
        onPress={handleSubmit}
        loading={mutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  imagePicker: {
    minHeight: 280,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageLabel: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
  },
});

import * as ImagePicker from "expo-image-picker";

export interface PlantImageAsset {
  uri: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  capturedAt?: string | null;
}

function normalizeCreationTime(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalizedValue = value < 1_000_000_000_000 ? value * 1000 : value;
  const normalizedDate = new Date(normalizedValue);

  return Number.isNaN(normalizedDate.getTime())
    ? null
    : normalizedDate.toISOString();
}

function normalizePickedAsset(asset: ImagePicker.ImagePickerAsset): PlantImageAsset {
  const creationTime = (asset as { creationTime?: number | null }).creationTime;

  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    capturedAt: normalizeCreationTime(creationTime),
  };
}

export async function pickPlantImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Photo library permission is required to add a plant image.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets.length) {
    return null;
  }

  return normalizePickedAsset(result.assets[0]);
}

export async function capturePlantImage() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission is required to take a plant photo.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets.length) {
    return null;
  }

  return normalizePickedAsset(result.assets[0]);
}

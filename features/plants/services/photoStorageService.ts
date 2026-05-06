import { Directory, File, Paths } from "expo-file-system";

export type ManagedPhotoRole = "primary" | "progress" | "memorial";

export interface PersistPhotoAssetInput {
  sourceUri: string;
  userId: string;
  plantId: string;
  photoId: string;
  role: ManagedPhotoRole;
  mimeType?: string | null;
}

export interface PersistedPhotoAsset {
  localUri: string;
  storagePath: string;
}

const PHOTO_ROOT = "photos";
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/webp": "webp",
};

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function extensionFromUri(uri: string) {
  const normalizedUri = uri.split("?")[0] ?? uri;
  const match = normalizedUri.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? null;
}

function resolveExtension(input: {
  sourceUri: string;
  mimeType?: string | null;
}) {
  if (input.mimeType) {
    const mapped = EXTENSION_BY_MIME[input.mimeType.toLowerCase()];
    if (mapped) {
      return mapped;
    }
  }

  return extensionFromUri(input.sourceUri) ?? "jpg";
}

function managedRootUri() {
  const root = new Directory(Paths.document, PHOTO_ROOT);
  return root.uri.endsWith("/") ? root.uri : `${root.uri}/`;
}

function createManagedDirectory(input: {
  userId: string;
  plantId: string;
  role: ManagedPhotoRole;
}) {
  const root = new Directory(Paths.document, PHOTO_ROOT);
  const userDirectory = new Directory(
    root.uri,
    sanitizePathSegment(input.userId),
  );
  const plantDirectory = new Directory(
    userDirectory.uri,
    sanitizePathSegment(input.plantId),
  );
  const roleDirectory = new Directory(plantDirectory.uri, input.role);
  roleDirectory.create({ idempotent: true, intermediates: true });
  return roleDirectory;
}

export function isManagedPhotoUri(uri: string | null | undefined) {
  return Boolean(uri && uri.startsWith(managedRootUri()));
}

export function buildPhotoStoragePath(input: {
  userId: string;
  plantId: string;
  photoId: string;
  extension: string;
}) {
  return `${sanitizePathSegment(input.userId)}/${sanitizePathSegment(
    input.plantId,
  )}/${sanitizePathSegment(input.photoId)}.${input.extension}`;
}

export async function persistPhotoAsset(
  input: PersistPhotoAssetInput,
): Promise<PersistedPhotoAsset> {
  const extension = resolveExtension({
    sourceUri: input.sourceUri,
    mimeType: input.mimeType,
  });
  const storagePath = buildPhotoStoragePath({
    userId: input.userId,
    plantId: input.plantId,
    photoId: input.photoId,
    extension,
  });

  if (isManagedPhotoUri(input.sourceUri)) {
    return {
      localUri: input.sourceUri,
      storagePath,
    };
  }

  const directory = createManagedDirectory({
    userId: input.userId,
    plantId: input.plantId,
    role: input.role,
  });
  const destination = new File(
    directory,
    `${sanitizePathSegment(input.photoId)}.${extension}`,
  );
  const source = new File(input.sourceUri);

  await source.copy(destination);

  const info = await destination.info();
  if (!info.exists) {
    throw new Error("Photo could not be persisted on this device.");
  }

  return {
    localUri: destination.uri,
    storagePath,
  };
}

export async function deleteManagedPhoto(uri: string | null | undefined) {
  if (!uri || !isManagedPhotoUri(uri)) {
    return;
  }

  const file = new File(uri);
  const info = await file.info();
  if (info.exists) {
    await file.delete();
  }
}

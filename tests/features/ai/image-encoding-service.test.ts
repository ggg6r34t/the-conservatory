jest.mock("expo-file-system", () => ({
  File: jest.fn(),
}));

import { File } from "expo-file-system";

import { encodeLocalImageForAi } from "@/features/ai/services/imageEncodingService";

describe("encodeLocalImageForAi", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns base64 payload when the file exists", async () => {
    const mockBase64 = jest.fn().mockResolvedValue("aGVsbG8=");
    const mockInfo = jest.fn().mockResolvedValue({ exists: true });
    (File as unknown as jest.Mock).mockImplementation(() => ({
      info: mockInfo,
      base64: mockBase64,
    }));

    const result = await encodeLocalImageForAi("file:///photo.jpg");

    expect(result).toEqual({
      imageBase64: "aGVsbG8=",
      mimeType: "image/jpeg",
    });
  });

  it("returns null when the file is missing", async () => {
    const mockInfo = jest.fn().mockResolvedValue({ exists: false });
    (File as unknown as jest.Mock).mockImplementation(() => ({
      info: mockInfo,
      base64: jest.fn(),
    }));

    await expect(encodeLocalImageForAi("file:///missing.jpg")).resolves.toBeNull();
  });
});

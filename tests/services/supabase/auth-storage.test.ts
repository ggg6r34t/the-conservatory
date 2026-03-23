const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn().mockResolvedValue(undefined);
const mockDeleteItemAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

describe("supabaseAuthStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores small values directly", async () => {
    const { supabaseAuthStorage } = require("@/services/supabase/authStorage");

    await supabaseAuthStorage.setItem("sb-key", "small-value");

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "sb-key",
      "small-value",
      expect.any(Object),
    );
  });

  it("chunks large values across multiple secure-store keys", async () => {
    const { supabaseAuthStorage } = require("@/services/supabase/authStorage");
    const largeValue = "x".repeat(5000);

    await supabaseAuthStorage.setItem("sb-large", largeValue);

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "sb-large__chunk_count",
      "3",
      expect.any(Object),
    );
    expect(
      mockSetItemAsync.mock.calls.some(([key]) => key === "sb-large__chunk_0"),
    ).toBe(true);
    expect(
      mockSetItemAsync.mock.calls.some(([key]) => key === "sb-large__chunk_1"),
    ).toBe(true);
    expect(
      mockSetItemAsync.mock.calls.some(([key]) => key === "sb-large__chunk_2"),
    ).toBe(true);
  });

  it("reassembles chunked values on read", async () => {
    mockGetItemAsync.mockImplementation(async (key: string) => {
      if (key === "sb-large__chunk_count") {
        return "2";
      }

      if (key === "sb-large__chunk_0") {
        return "hello ";
      }

      if (key === "sb-large__chunk_1") {
        return "world";
      }

      return null;
    });

    const { supabaseAuthStorage } = require("@/services/supabase/authStorage");

    await expect(supabaseAuthStorage.getItem("sb-large")).resolves.toBe(
      "hello world",
    );
  });
});

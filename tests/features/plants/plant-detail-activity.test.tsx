import { screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { fireEvent } from "@testing-library/react-native";

import { PlantDetail } from "@/features/plants/components/PlantDetail";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import type { PlantWithRelations } from "@/types/models";

const mockPush = jest.fn();
const mockRecordCareEvent = jest.fn();
const mockUpdateCareLogNote = jest.fn();
const mockSnackbarSuccess = jest.fn();
const mockSnackbarWarning = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image", () => ({
  Image: ({ source }: { source?: { uri?: string } }) => {
    const { Text } = require("react-native");
    return <Text>{source?.uri ?? "image"}</Text>;
  },
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/features/ai/components/PlantDetailHealthInsight", () => ({
  PlantDetailHealthInsight: () => null,
}));

jest.mock("@/features/ai/services/careDefaultsService", () => ({
  buildCareDefaults: () => ({
    lightSummary: "Bright indirect light is ideal.",
    careProfileHint: "Water with intention.",
  }),
}));

jest.mock("@/features/ai/services/observationTaggingService", () => ({
  parseStructuredCareLogNote: (notes?: string | null) => ({
    body: notes ?? "",
  }),
}));

jest.mock("@/features/plants/hooks/useAddPlantProgressPhoto", () => ({
  useAddPlantProgressPhoto: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/features/care-logs/components/WaterNowNoteSheet", () => ({
  WaterNowNoteSheet: ({
    visible,
    onSave,
  }: {
    visible: boolean;
    onSave: (note: string) => void;
  }) => {
    if (!visible) {
      return null;
    }

    const ReactNative = require("react-native");
    return (
      <ReactNative.View>
        <ReactNative.Text>Add a note</ReactNative.Text>
        <ReactNative.TextInput
          placeholder="What changed today?"
          onChangeText={() => undefined}
        />
        <ReactNative.Pressable onPress={() => onSave("Watered thoroughly.")}>
          <ReactNative.Text>Save Note</ReactNative.Text>
        </ReactNative.Pressable>
      </ReactNative.View>
    );
  },
}));

jest.mock("@/features/care-logs/hooks/useRecordCareEvent", () => ({
  useRecordCareEvent: () => ({
    mutateAsync: (...args: unknown[]) => mockRecordCareEvent(...args),
    isPending: false,
  }),
}));

jest.mock("@/features/care-logs/hooks/useUpdateCareLogNote", () => ({
  useUpdateCareLogNote: () => ({
    mutateAsync: (...args: unknown[]) => mockUpdateCareLogNote(...args),
    isPending: false,
  }),
}));

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({ show: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({
    success: (...args: unknown[]) => mockSnackbarSuccess(...args),
    warning: (...args: unknown[]) => mockSnackbarWarning(...args),
  }),
}));

const baseFixture: PlantWithRelations = {
  plant: {
    id: "plant-1",
    userId: "user-1",
    name: "Aster",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
  },
  photos: [],
  reminders: [],
  logs: [],
};

describe("PlantDetail recent activity", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRecordCareEvent.mockReset();
    mockUpdateCareLogNote.mockReset();
    mockSnackbarSuccess.mockReset();
    mockSnackbarWarning.mockReset();
    mockRecordCareEvent.mockResolvedValue({
      careLog: { id: "log-1" },
      warningMessage: null,
    });
    mockUpdateCareLogNote.mockResolvedValue({
      careLog: {
        id: "log-1",
        notes: "Watered thoroughly.",
      },
    });
  });

  it("renders an honest empty state and no fabricated activity cards", () => {
    renderWithProviders(<PlantDetail data={baseFixture} />);

    expect(screen.getByText("No care entries yet")).toBeTruthy();
    expect(screen.getByText("STABLE")).toBeTruthy();
    expect(screen.queryByText("Healthy")).toBeNull();
    expect(screen.queryByText(/Full Soak & Fertilize/i)).toBeNull();
    expect(screen.queryByText(/Propagation Pruning/i)).toBeNull();
  });

  it("maps thriving plants to the canonical THRIVING label", () => {
    renderWithProviders(
      <PlantDetail
        data={{
          ...baseFixture,
          plant: {
            ...baseFixture.plant,
            lastWateredAt: "2026-03-27T10:00:00.000Z",
            nextWaterDueAt: "2026-04-02T10:00:00.000Z",
          },
          reminders: [
            {
              id: "reminder-1",
              userId: "user-1",
              plantId: "plant-1",
              reminderType: "water",
              frequencyDays: 7,
              enabled: 1,
              nextDueAt: "2026-04-02T10:00:00.000Z",
              createdAt: "2026-03-01T10:00:00.000Z",
              updatedAt: "2026-03-27T10:00:00.000Z",
              pending: 0,
            },
          ],
          logs: [
            {
              id: "log-1",
              userId: "user-1",
              plantId: "plant-1",
              logType: "water",
              notes: "Watered on schedule.",
              loggedAt: "2026-03-27T10:00:00.000Z",
              createdAt: "2026-03-27T10:00:00.000Z",
              updatedAt: "2026-03-27T10:00:00.000Z",
              pending: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("THRIVING")).toBeTruthy();
    expect(screen.queryByText("Healthy")).toBeNull();
  });

  it("maps due plants to the canonical NEEDS WATER label", () => {
    renderWithProviders(
      <PlantDetail
        data={{
          ...baseFixture,
          plant: {
            ...baseFixture.plant,
            nextWaterDueAt: "2026-03-20T10:00:00.000Z",
          },
          reminders: [
            {
              id: "reminder-1",
              userId: "user-1",
              plantId: "plant-1",
              reminderType: "water",
              frequencyDays: 7,
              enabled: 1,
              nextDueAt: "2026-03-20T10:00:00.000Z",
              createdAt: "2026-03-01T10:00:00.000Z",
              updatedAt: "2026-03-20T10:00:00.000Z",
              pending: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("NEEDS WATER")).toBeTruthy();
    expect(screen.queryByText("Healthy")).toBeNull();
  });

  it("renders saved condition on real activity entries", () => {
    renderWithProviders(
      <PlantDetail
        data={{
          ...baseFixture,
          logs: [
            {
              id: "log-1",
              userId: "user-1",
              plantId: "plant-1",
              logType: "inspect",
              currentCondition: "Needs Attention",
              notes: "Edges are crisping.",
              loggedAt: "2026-03-24T10:00:00.000Z",
              createdAt: "2026-03-24T10:00:00.000Z",
              updatedAt: "2026-03-24T10:00:00.000Z",
              pending: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Needs Attention")).toBeTruthy();
    expect(screen.getByText(/Only saved care logs appear here/i)).toBeTruthy();
  });

  it("routes VIEW ALL to the dedicated recent activity screen", () => {
    renderWithProviders(
      <PlantDetail
        data={{
          ...baseFixture,
          logs: [
            {
              id: "log-1",
              userId: "user-1",
              plantId: "plant-1",
              logType: "water",
              currentCondition: null,
              notes: "Saved care entry.",
              loggedAt: "2026-03-24T10:00:00.000Z",
              createdAt: "2026-03-24T10:00:00.000Z",
              updatedAt: "2026-03-24T10:00:00.000Z",
              pending: 0,
            },
          ],
        }}
      />,
    );

    fireEvent.press(screen.getByText("VIEW ALL"));

    expect(mockPush).toHaveBeenCalledWith("/plant/plant-1/activity");
  });

  it("records Water Now as a real water event instead of routing into the generic form", async () => {
    renderWithProviders(<PlantDetail data={baseFixture} />);

    fireEvent.press(screen.getByText("Water Now"));

    expect(mockRecordCareEvent).toHaveBeenCalledWith({
      logType: "water",
    });
    expect(mockPush).not.toHaveBeenCalledWith("/care-log/plant-1");
  });

  it("offers an optional Add note follow-up that updates the same saved water log", async () => {
    renderWithProviders(<PlantDetail data={baseFixture} />);

    fireEvent.press(screen.getByText("Water Now"));

    await waitFor(() => {
      expect(mockSnackbarSuccess).toHaveBeenCalledWith(
        "Watered and saved to care history.",
        expect.objectContaining({
          action: expect.objectContaining({
            label: "Add note",
          }),
        }),
      );
    });

    const snackbarOptions = mockSnackbarSuccess.mock.calls[0]?.[1] as
      | {
          action?: {
            label: string;
            onPress: () => void;
          };
        }
      | undefined;

    expect(snackbarOptions?.action?.label).toBe("Add note");

    snackbarOptions?.action?.onPress();

    await waitFor(() => {
      expect(screen.getByText("Add a note")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Save Note"));

    await waitFor(() => {
      expect(mockUpdateCareLogNote).toHaveBeenCalledWith({
        careLogId: "log-1",
        notes: "Watered thoroughly.",
      });
    });
    expect(mockRecordCareEvent).toHaveBeenCalledTimes(1);
  });

  it("renders only real progress photos in Growth Progress without duplicating the primary image", () => {
    renderWithProviders(
      <PlantDetail
        data={{
          ...baseFixture,
          photos: [
            {
              id: "photo-primary",
              userId: "user-1",
              plantId: "plant-1",
              localUri: "file:///primary.jpg",
              photoRole: "primary",
              isPrimary: 1,
              capturedAt: "2026-03-01T10:00:00.000Z",
              createdAt: "2026-03-01T10:00:00.000Z",
              updatedAt: "2026-03-01T10:00:00.000Z",
              pending: 0,
            },
            {
              id: "photo-progress-1",
              userId: "user-1",
              plantId: "plant-1",
              localUri: "file:///progress-1.jpg",
              photoRole: "progress",
              isPrimary: 0,
              capturedAt: "2026-03-02T10:00:00.000Z",
              createdAt: "2026-03-02T10:00:00.000Z",
              updatedAt: "2026-03-02T10:00:00.000Z",
              pending: 0,
            },
            {
              id: "photo-progress-2",
              userId: "user-1",
              plantId: "plant-1",
              localUri: "file:///progress-2.jpg",
              photoRole: "progress",
              isPrimary: 0,
              capturedAt: "2026-03-03T10:00:00.000Z",
              createdAt: "2026-03-03T10:00:00.000Z",
              updatedAt: "2026-03-03T10:00:00.000Z",
              pending: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("file:///primary.jpg")).toBeTruthy();
    expect(screen.getByText("file:///progress-1.jpg")).toBeTruthy();
    expect(screen.getByText("file:///progress-2.jpg")).toBeTruthy();
    expect(screen.queryAllByText("file:///primary.jpg")).toHaveLength(1);
  });

  it("renders an intentional empty growth state when no progress photos exist", () => {
    renderWithProviders(<PlantDetail data={baseFixture} />);

    expect(screen.getByText("No progress photos yet")).toBeTruthy();
    expect(
      screen.getByText("Add a progress photo to start this plant's visual record."),
    ).toBeTruthy();
  });
});

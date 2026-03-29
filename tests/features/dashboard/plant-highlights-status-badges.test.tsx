import React from "react";

import { screen } from "@testing-library/react-native";

import { PlantHighlights } from "@/features/dashboard/components/PlantHighlights";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import type { CareLog, CareReminder, Plant } from "@/types/models";

function createPlant(id: string, overrides?: Partial<Plant>): Plant {
  return {
    id,
    userId: "user-1",
    name: `Plant ${id}`,
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createReminder(
  plantId: string,
  overrides?: Partial<CareReminder>,
): CareReminder {
  return {
    id: `reminder-${plantId}`,
    userId: "user-1",
    plantId,
    reminderType: "water",
    frequencyDays: 7,
    enabled: 1,
    nextDueAt: "2026-03-28T09:00:00.000Z",
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createLog(plantId: string, overrides?: Partial<CareLog>): CareLog {
  return {
    id: `log-${plantId}`,
    userId: "user-1",
    plantId,
    logType: "water",
    loggedAt: "2026-03-20T08:00:00.000Z",
    createdAt: "2026-03-20T08:00:00.000Z",
    updatedAt: "2026-03-20T08:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

describe("PlantHighlights status badges", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses the canonical needs-water and stable labels without legacy wording", () => {
    renderWithProviders(
      <PlantHighlights
        plants={[
          createPlant("due", { name: "Due Plant" }),
          createPlant("thriving", {
            name: "Thriving Plant",
            lastWateredAt: "2026-03-23T08:00:00.000Z",
          }),
          createPlant("stable", {
            name: "Stable Plant",
            nextWaterDueAt: "2026-03-26T09:00:00.000Z",
          }),
        ]}
        reminders={[
          createReminder("due", {
            nextDueAt: "2026-03-24T09:00:00.000Z",
          }),
          createReminder("thriving", {
            nextDueAt: "2026-03-30T09:00:00.000Z",
          }),
          createReminder("stable", {
            nextDueAt: "2026-03-26T09:00:00.000Z",
          }),
        ]}
        logs={[
          createLog("thriving", {
            loggedAt: "2026-03-23T08:00:00.000Z",
          }),
        ]}
      />,
    );

    expect(screen.getByText("NEEDS WATER")).toBeTruthy();
    expect(screen.getByText("STABLE")).toBeTruthy();
    expect(screen.queryByText("NEEDS ATTENTION")).toBeNull();
    expect(screen.queryByText("Healthy")).toBeNull();
  });

  it("uses the canonical thriving label when thriving is the visible secondary status", () => {
    renderWithProviders(
      <PlantHighlights
        plants={[
          createPlant("thriving", {
            name: "Thriving Plant",
            lastWateredAt: "2026-03-23T08:00:00.000Z",
          }),
          createPlant("stable", {
            name: "Stable Plant",
            nextWaterDueAt: "2026-03-26T09:00:00.000Z",
          }),
        ]}
        reminders={[
          createReminder("thriving", {
            nextDueAt: "2026-03-30T09:00:00.000Z",
          }),
          createReminder("stable", {
            nextDueAt: "2026-03-26T09:00:00.000Z",
          }),
        ]}
        logs={[
          createLog("thriving", {
            loggedAt: "2026-03-23T08:00:00.000Z",
          }),
        ]}
      />,
    );

    expect(screen.getByText("THRIVING")).toBeTruthy();
    expect(screen.queryByText("NEEDS ATTENTION")).toBeNull();
    expect(screen.queryByText("Healthy")).toBeNull();
  });
});

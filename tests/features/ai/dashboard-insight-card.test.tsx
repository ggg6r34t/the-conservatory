import { screen } from "@testing-library/react-native";

import { DashboardInsightCard } from "@/features/ai/components/DashboardInsightCard";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

describe("DashboardInsightCard", () => {
  it("renders a calm insight card", () => {
    renderWithProviders(
      <DashboardInsightCard
        insight={{
          title: "Today in your conservatory",
          body: "Marlowe is ready for attention. A quiet watering pass would steady the collection.",
          source: "local",
        }}
      />,
    );

    expect(screen.getByText("Today in your conservatory")).toBeTruthy();
    expect(screen.getByText(/quiet watering pass/i)).toBeTruthy();
  });
});

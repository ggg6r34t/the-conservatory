import { screen } from "@testing-library/react-native";

import TermsScreen from "@/app/terms";
import PrivacyScreen from "@/app/privacy";
import AiDisclosureScreen from "@/app/ai-disclosure";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("Legal policy screens", () => {
  it("renders consolidated Terms of Service with billing sections", () => {
    renderWithProviders(<TermsScreen />);
    expect(screen.getByText("Terms of Service")).toBeTruthy();
    expect(screen.getAllByText(/24 hours before/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Restore purchases/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/team should confirm/i)).toBeNull();
  });

  it("renders consolidated Privacy Policy with security, export, and deletion", () => {
    renderWithProviders(<PrivacyScreen />);
    expect(screen.getAllByText(/Supabase/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HOW TO EXPORT/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HOW TO DELETE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SecureStore/i).length).toBeGreaterThan(0);
  });

  it("discloses AI limitations in standalone AI policy", () => {
    renderWithProviders(<AiDisclosureScreen />);
    expect(
      screen.getAllByText(/NOT PROFESSIONAL ADVICE/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/OpenAI or Anthropic/i)).toBeTruthy();
  });
});

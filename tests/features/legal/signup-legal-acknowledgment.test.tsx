import { fireEvent, screen } from "@testing-library/react-native";

import { SignupLegalAcknowledgment } from "@/features/legal/components/SignupLegalAcknowledgment";
import { LEGAL_ROUTES } from "@/features/legal/constants";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockPush = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("SignupLegalAcknowledgment", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("navigates to terms and privacy when links are pressed", () => {
    renderWithProviders(<SignupLegalAcknowledgment />);

    fireEvent.press(screen.getByLabelText("Terms of Service"));
    expect(mockPush).toHaveBeenCalledWith(LEGAL_ROUTES.terms);

    fireEvent.press(screen.getByLabelText("Privacy Policy"));
    expect(mockPush).toHaveBeenCalledWith(LEGAL_ROUTES.privacy);
  });
});

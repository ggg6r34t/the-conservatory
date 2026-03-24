import { fireEvent, render } from "@testing-library/react-native";

import { SpeciesSuggestionBanner } from "@/features/ai/components/SpeciesSuggestionBanner";

describe("SpeciesSuggestionBanner", () => {
  it("shows both likely species and confidence qualifier", () => {
    const onAccept = jest.fn();
    const onDismiss = jest.fn();

    const { getByText } = render(
      <SpeciesSuggestionBanner
        suggestion={{
          species: "Monstera deliciosa",
          confidence: 0.72,
          careProfileHint: "Bright indirect light keeps growth even.",
          source: "local",
        }}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />,
    );

    getByText("Likely Monstera deliciosa · Moderate confidence");
    getByText("Bright indirect light keeps growth even.");
    getByText("Confidence: 72%");

    fireEvent.press(getByText("USE SUGGESTION"));
    fireEvent.press(getByText("NOT NOW"));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("keeps confidence qualifier visible when no care hint is available", () => {
    const { getByText } = render(
      <SpeciesSuggestionBanner
        suggestion={{
          species: "Ficus elastica",
          confidence: 0.84,
          careProfileHint: undefined,
          source: "local",
        }}
        onAccept={() => undefined}
        onDismiss={() => undefined}
      />,
    );

    getByText("Likely Ficus elastica · High confidence");
    getByText("Use it as a starting point only.");
    getByText("Confidence: 84%");
  });
});

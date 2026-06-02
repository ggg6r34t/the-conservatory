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

    getByText("Likely Monstera deliciosa · On-device pattern match");
    getByText("Bright indirect light keeps growth even.");
    getByText("On-device pattern match only — not a vision model result.");

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

    getByText("Likely Ficus elastica · On-device pattern match");
    getByText("Use it as a starting point only.");
    getByText("On-device pattern match only — not a vision model result.");
  });

  it("shows model confidence explanation for cloud vision results", () => {
    const { getByText } = render(
      <SpeciesSuggestionBanner
        suggestion={{
          species: "Monstera deliciosa",
          confidence: 0.82,
          careProfileHint: "Bright indirect light keeps growth even.",
          confidenceExplanation: "Split leaves and fenestrations are visible.",
          source: "cloud",
        }}
        onAccept={() => undefined}
        onDismiss={() => undefined}
      />,
    );

    getByText("Likely Monstera deliciosa · High confidence");
    getByText(
      /High confidence \(82%\)\. Split leaves and fenestrations are visible\./,
    );
  });
});

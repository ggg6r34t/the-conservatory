import {
  getProfileDisplayEmail,
  getProfileDisplayName,
  getProfileInitials,
  getProfileVersionLabel,
} from "@/features/profile/services/profilePresentationService";

describe("profilePresentationService", () => {
  it("uses authenticated account values when they are present", () => {
    expect(getProfileDisplayName(" Fern Curator ")).toBe("Fern Curator");
    expect(getProfileDisplayEmail(" curator@example.com ")).toBe(
      "curator@example.com",
    );
    expect(getProfileInitials("Fern Curator")).toBe("FC");
  });

  it("uses truthful empty labels instead of fake profile identity", () => {
    expect(getProfileDisplayName(null)).toBe("Name unavailable");
    expect(getProfileDisplayEmail(undefined)).toBe("Email unavailable");
    expect(getProfileInitials("")).toBe("?");
  });

  it("does not hardcode the release version when app metadata is missing", () => {
    expect(getProfileVersionLabel(undefined)).toBe("Version unavailable");
    expect(getProfileVersionLabel("1.2.3")).toBe("VERSION 1.2.3");
  });
});

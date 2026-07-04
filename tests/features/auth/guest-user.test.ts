import {
  buildGuestEmail,
  createGuestAppUser,
  isGuestUser,
  isGuestUserId,
} from "@/features/auth/constants/guestUser";

describe("guestUser constants", () => {
  it("creates stable guest ids with guest prefix", () => {
    const guest = createGuestAppUser("guest-abc123");
    expect(guest.id).toBe("guest-abc123");
    expect(guest.isGuest).toBe(true);
    expect(isGuestUserId(guest.id)).toBe(true);
    expect(isGuestUser(guest)).toBe(true);
  });

  it("builds synthetic guest email addresses", () => {
    expect(buildGuestEmail("guest-abc123")).toBe(
      "abc123@local.theconservatory.app",
    );
  });
});

describe("remindersScheduler module boundaries", () => {
  it("does not import the plants client directly", () => {
    jest.isolateModules(() => {
      jest.doMock("@/features/plants/api/plantsClient", () => {
        throw new Error("plantsClient should not be imported by scheduler");
      });

      expect(() =>
        require("@/features/notifications/services/remindersScheduler"),
      ).not.toThrow();
    });
  });
});

import { queryKeys } from "@/config/constants";
import { invalidateCareLogQueries } from "@/features/care-logs/utils/invalidateCareLogQueries";

describe("invalidateCareLogQueries", () => {
  it("invalidates all dependent care-log readers through shared prefixes", async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);

    await invalidateCareLogQueries(
      {
        invalidateQueries,
      } as never,
      "plant-1",
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["care-logs"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.plant("plant-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.plants,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.reminders,
    });
  });
});

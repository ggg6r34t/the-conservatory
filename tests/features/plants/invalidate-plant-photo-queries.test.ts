import { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { invalidatePlantPhotoQueries } from "@/features/plants/hooks/invalidatePlantPhotoQueries";

describe("invalidatePlantPhotoQueries", () => {
  it("invalidates plant, dashboard, graveyard, photos, and plant detail queries", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    invalidatePlantPhotoQueries(queryClient, "plant-1");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.plants,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.graveyard,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["photos"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.plant("plant-1"),
    });
  });
});

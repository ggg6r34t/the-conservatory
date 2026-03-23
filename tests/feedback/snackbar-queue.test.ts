import { dismissSnackbar, enqueueSnackbar } from "@/services/feedback/snackbarQueue";
import type { QueuedSnackbar } from "@/components/feedback/Snackbar/snackbar.types";

function buildSnackbar(id: string): QueuedSnackbar {
  return {
    id,
    variant: "info",
    message: `Toast ${id}`,
  };
}

describe("snackbarQueue", () => {
  it("enqueues snackbars in fifo order", () => {
    const queue = enqueueSnackbar(
      enqueueSnackbar([], buildSnackbar("1")),
      buildSnackbar("2"),
    );

    expect(queue.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("dismisses the active snackbar when no id is provided", () => {
    const queue = [buildSnackbar("1"), buildSnackbar("2")];

    expect(dismissSnackbar(queue).map((item) => item.id)).toEqual(["2"]);
  });

  it("dismisses a specific snackbar by id", () => {
    const queue = [buildSnackbar("1"), buildSnackbar("2"), buildSnackbar("3")];

    expect(dismissSnackbar(queue, "2").map((item) => item.id)).toEqual([
      "1",
      "3",
    ]);
  });
});

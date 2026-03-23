import { dismissAlert, enqueueAlert } from "@/services/feedback/alertQueue";
import type { QueuedAlertDialog } from "@/components/feedback/AlertDialog/alert.types";

function buildAlert(id: string): QueuedAlertDialog {
  return {
    id,
    variant: "info",
    title: `Alert ${id}`,
    message: "Message",
    resolve: jest.fn(),
  };
}

describe("alertQueue", () => {
  it("enqueues dialogs in fifo order", () => {
    const first = buildAlert("1");
    const second = buildAlert("2");

    const queue = enqueueAlert(enqueueAlert([], first), second);

    expect(queue.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("dismisses the head item when no id is provided", () => {
    const queue = [buildAlert("1"), buildAlert("2")];

    expect(dismissAlert(queue, undefined).map((item) => item.id)).toEqual([
      "2",
    ]);
  });

  it("dismisses a specific item by id", () => {
    const queue = [buildAlert("1"), buildAlert("2"), buildAlert("3")];

    expect(dismissAlert(queue, "2").map((item) => item.id)).toEqual([
      "1",
      "3",
    ]);
  });
});

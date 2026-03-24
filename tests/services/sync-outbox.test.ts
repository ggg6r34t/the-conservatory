import { runAtomicMutationWithSyncOutbox } from "@/services/database/syncOutbox";

type FakeState = {
  localRows: string[];
  queueRows: { entity: string; entityId: string; operation: string }[];
};

function createFakeDatabase(options?: {
  failOnQueueInsert?: boolean;
  failOnLocalMutation?: boolean;
}) {
  let state: FakeState = {
    localRows: [],
    queueRows: [],
  };

  return {
    getState() {
      return state;
    },
    async withTransactionAsync(callback: () => Promise<void>) {
      const snapshot: FakeState = {
        localRows: [...state.localRows],
        queueRows: [...state.queueRows],
      };

      try {
        await callback();
      } catch (error) {
        state = snapshot;
        throw error;
      }
    },
    async runAsync(sql: string, ...params: unknown[]) {
      if (sql.includes("INSERT INTO plants_local")) {
        if (options?.failOnLocalMutation) {
          throw new Error("local write failed");
        }

        state.localRows.push(String(params[0]));
        return;
      }

      if (sql.includes("INSERT INTO sync_queue")) {
        if (options?.failOnQueueInsert) {
          throw new Error("sync queue unavailable");
        }

        state.queueRows.push({
          entity: String(params[1]),
          entityId: String(params[2]),
          operation: String(params[3]),
        });
      }
    },
  };
}

describe("runAtomicMutationWithSyncOutbox", () => {
  it("commits local mutation and outbox operations together", async () => {
    const database = createFakeDatabase();

    await runAtomicMutationWithSyncOutbox(database as never, {
      perform: async () => {
        await database.runAsync(
          "INSERT INTO plants_local VALUES (?);",
          "plant-1",
        );

        return {
          result: "ok",
          operations: [
            {
              entity: "plants",
              entityId: "plant-1",
              operation: "insert",
              payload: { userId: "user-1" },
            },
          ],
        };
      },
    });

    expect(database.getState().localRows).toEqual(["plant-1"]);
    expect(database.getState().queueRows).toEqual([
      {
        entity: "plants",
        entityId: "plant-1",
        operation: "insert",
      },
    ]);
  });

  it("rolls back local mutation when outbox insert fails", async () => {
    const database = createFakeDatabase({ failOnQueueInsert: true });

    await expect(
      runAtomicMutationWithSyncOutbox(database as never, {
        perform: async () => {
          await database.runAsync(
            "INSERT INTO plants_local VALUES (?);",
            "plant-1",
          );

          return {
            result: "ok",
            operations: [
              {
                entity: "plants",
                entityId: "plant-1",
                operation: "insert",
                payload: { userId: "user-1" },
              },
            ],
          };
        },
      }),
    ).rejects.toThrow("sync queue unavailable");

    expect(database.getState().localRows).toEqual([]);
    expect(database.getState().queueRows).toEqual([]);
  });

  it("does not persist partial queue rows when local mutation fails first", async () => {
    const database = createFakeDatabase({ failOnLocalMutation: true });

    await expect(
      runAtomicMutationWithSyncOutbox(database as never, {
        perform: async () => {
          await database.runAsync(
            "INSERT INTO plants_local VALUES (?);",
            "plant-1",
          );

          return {
            result: "ok",
            operations: [
              {
                entity: "plants",
                entityId: "plant-1",
                operation: "insert",
                payload: { userId: "user-1" },
              },
            ],
          };
        },
      }),
    ).rejects.toThrow("local write failed");

    expect(database.getState().localRows).toEqual([]);
    expect(database.getState().queueRows).toEqual([]);
  });
});

/**
 * @jest-environment node
 */

import {
  setActiveDataOwnerUserId,
  shouldSkipSyncOutboxForActiveUser,
} from "@/services/database/syncDataOwner";

describe("syncDataOwner guest mode", () => {
  afterEach(() => {
    setActiveDataOwnerUserId(null);
  });

  it("skips sync outbox for guest user ids", () => {
    setActiveDataOwnerUserId("guest-123");
    expect(shouldSkipSyncOutboxForActiveUser()).toBe(true);
  });

  it("enqueues sync outbox for authenticated user ids", () => {
    setActiveDataOwnerUserId("auth-user-123");
    expect(shouldSkipSyncOutboxForActiveUser()).toBe(false);
  });
});

import { useEffect, useState } from "react";

import {
  getUserDataSyncSnapshot,
  subscribeToUserDataSync,
} from "@/services/database/userDataSync";

export function useUserDataSyncState() {
  const [state, setState] = useState(getUserDataSyncSnapshot);

  useEffect(() => subscribeToUserDataSync(setState), []);

  return state;
}

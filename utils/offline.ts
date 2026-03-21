import * as Network from "expo-network";

export async function getOfflineState() {
  const state = await Network.getNetworkStateAsync();

  return {
    isConnected: Boolean(state.isConnected),
    isInternetReachable: Boolean(
      state.isInternetReachable ?? state.isConnected,
    ),
    isOffline: !state.isConnected || state.isInternetReachable === false,
  };
}

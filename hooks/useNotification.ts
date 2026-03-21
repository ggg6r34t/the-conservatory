import { Alert } from "react-native";

export function useNotification() {
  return {
    showSuccess: (title: string, message: string) =>
      Alert.alert(title, message),
    showError: (title: string, message: string) => Alert.alert(title, message),
  };
}

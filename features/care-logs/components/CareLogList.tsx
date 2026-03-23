import { StyleSheet, View } from "react-native";

import type { CareLog } from "@/types/models";
import { CareLogItem } from "@/features/care-logs/components/CareLogItem";

interface CareLogListProps {
  logs: CareLog[];
}

export function CareLogList({ logs }: CareLogListProps) {
  return (
    <View style={styles.container}>
      {logs.map((log) => (
        <CareLogItem key={log.id} log={log} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
});

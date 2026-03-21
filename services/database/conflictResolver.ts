export interface ConflictRecord {
  entity: string;
  entityId: string;
  strategy: "last-write-wins";
}

export function resolveConflict(record: ConflictRecord) {
  console.warn("resolveConflict is a Phase 3 placeholder.", record);
  return record;
}

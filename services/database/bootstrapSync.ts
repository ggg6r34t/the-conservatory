import { runUserDataSync } from "@/services/database/userDataSync";

export async function bootstrapUserDataSync(userId: string) {
  return runUserDataSync({
    userId,
    trigger: "auto-bootstrap",
  });
}

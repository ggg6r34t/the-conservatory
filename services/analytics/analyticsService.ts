import { logger } from "@/utils/logger";

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  logger.info("analytics.event", { name, properties });
}

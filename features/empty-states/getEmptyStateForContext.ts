import { emptyStateCopyRegistry } from "./emptyStateCopyRegistry";
import type { EmptyStateContent, EmptyStateResolveInput } from "./types";

export function getEmptyStateForContext(
  input: EmptyStateResolveInput,
): EmptyStateContent {
  return emptyStateCopyRegistry[input.context];
}

export interface DashboardHeroCopy {
  eyebrow: string;
  titleLines: [string, string];
  body: string;
  primaryActionLabel?: string;
  isFirstRun: boolean;
}

export function getDashboardHeroCopyForCollection(input: {
  totalPlants: number;
  dueToday: number;
  overdue: number;
  upcomingCare: number;
  activeReminders: number;
}): DashboardHeroCopy {
  if (input.totalPlants === 0) {
    const firstRun = getEmptyStateForContext({ context: "dashboard.hero" });
    return {
      eyebrow: "YOUR LIVING GALLERY",
      titleLines: ["Garden is", "starting."],
      body: firstRun.body,
      primaryActionLabel: firstRun.primaryActionLabel,
      isFirstRun: true,
    };
  }

  const eyebrow = "YOUR LIVING GALLERY";
  const titleLines: [string, string] =
    input.overdue > 0 || input.dueToday > 0
      ? ["Care is", "needed."]
      : ["Garden is", "steady."];

  let stateClause = "";

  if (input.overdue > 0) {
    stateClause =
      "Some specimens need attention today. A thoughtful round of care would help.";
  } else if (input.dueToday > 0) {
    stateClause = formatDueTodayClause(input.dueToday);
  } else if (input.upcomingCare > 0) {
    stateClause = formatUpcomingClause(input.upcomingCare);
  } else {
    stateClause = "Everything is settled for today.";
  }

  let body = stateClause;

  if (input.activeReminders === 0 && input.totalPlants > 0) {
    body = `${body} No reminders are active yet.`;
  }

  return { eyebrow, titleLines, body, isFirstRun: false };
}

function formatDueTodayClause(dueToday: number) {
  const count = Math.max(0, Math.floor(dueToday));
  if (count === 1) {
    return "One specimen is due for care within the next day.";
  }
  return `${count} specimens are due for care within the next day.`;
}

function formatUpcomingClause(upcomingCare: number) {
  const count = Math.max(0, Math.floor(upcomingCare));
  if (count === 1) {
    return "No care is due today. One specimen is approaching its next window.";
  }
  return `No care is due today. ${count} specimens are approaching their next window.`;
}

function countWord(value: number) {
  const rounded = Math.max(0, Math.floor(value));
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
    "twenty",
  ] as const;

  if (rounded <= 20) {
    return words[rounded];
  }

  return String(rounded);
}

function capitalize(value: string) {
  if (!value.length) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getHydrationCardCopy(input: {
  totalPlants: number;
  dueToday: number;
  overdue: number;
  nextCycleHours: number | null;
}): { statusCopy: string; cycleCopy: string; hidden: boolean } {
  if (input.totalPlants === 0) {
    const content = getEmptyStateForContext({ context: "dashboard.hydration" });
    return {
      statusCopy: content.body,
      cycleCopy: "",
      hidden: false,
    };
  }

  const dueTodayCount = Math.max(0, Math.floor(input.dueToday));
  const overdueCount = Math.max(0, Math.floor(input.overdue));
  const hasOverdue = overdueCount > 0;
  const hasNoTimeLeft = dueTodayCount === 0 && !hasOverdue;

  let statusCopy = "";

  if (hasOverdue) {
    statusCopy =
      overdueCount === 1
        ? "One specimen needs attention today."
        : `${capitalize(countWord(overdueCount))} specimens need attention today.`;
    if (dueTodayCount > 0) {
      statusCopy = `${statusCopy} ${dueTodayCount === 1 ? "One more care window opens" : `${capitalize(countWord(dueTodayCount))} more care windows open`} in the next day.`;
    }
  } else if (hasNoTimeLeft) {
    statusCopy = "Your plants are cared for today.";
  } else {
    statusCopy =
      dueTodayCount === 1
        ? "One specimen is due for care within the next day."
        : `${capitalize(countWord(dueTodayCount))} specimens are due for care within the next day.`;
  }

  let cycleCopy = "";

  if (hasNoTimeLeft) {
    cycleCopy = "";
  } else if (input.nextCycleHours != null) {
    const hours = Math.max(1, input.nextCycleHours);
    cycleCopy = `Next cycle in ${hours}${hours === 1 ? " hour" : " hours"}.`;
  } else {
    cycleCopy = "Next cycle begins tomorrow.";
  }

  return { statusCopy, cycleCopy, hidden: false };
}

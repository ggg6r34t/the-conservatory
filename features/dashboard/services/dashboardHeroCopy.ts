interface DashboardHeroCopyInput {
  totalPlants: number;
  dueToday: number;
  overdue: number;
  upcomingCare: number;
  activeReminders: number;
}

export interface DashboardHeroCopy {
  eyebrow: string;
  body: string;
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return value === 1 ? singular : plural;
}

function numberToWord(value: number) {
  const rounded = Math.max(0, Math.floor(value));
  const units = [
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
    return units[rounded];
  }

  return String(rounded);
}

function capitalize(value: string) {
  if (!value.length) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildDashboardHeroCopy(
  input: DashboardHeroCopyInput,
): DashboardHeroCopy {
  const editorialOpener =
    "Welcome back. Your indoor sanctuary is looking lush today.";

  if (input.totalPlants === 0) {
    return {
      eyebrow: "YOUR LIVING GALLERY",
      body: `${editorialOpener} Your conservatory is ready for its first specimen. Add one plant to begin a calm care rhythm.`,
    };
  }

  const eyebrow = "YOUR LIVING GALLERY";

  let stateClause = "";

  if (input.overdue > 0) {
    stateClause =
      "Your conservatory could use a thoughtful round of care today.";
  } else if (input.dueToday > 0) {
    stateClause = `${capitalize(numberToWord(input.dueToday))} ${pluralize(
      input.dueToday,
      "specimen",
    )} are coming due in the next day. A light check-in keeps the collection steady.`;
  } else if (input.upcomingCare > 0) {
    stateClause = `No care is due today. ${numberToWord(input.upcomingCare)} ${pluralize(
      input.upcomingCare,
      "specimen",
    )} are approaching their next window.`;
  } else {
    stateClause = `${capitalize(numberToWord(input.totalPlants))} ${pluralize(
      input.totalPlants,
      "specimen",
    )} are settled with no immediate care due.`;
  }

  let body = `${editorialOpener} ${stateClause}`;

  if (input.activeReminders === 0) {
    body = `${body} Reminder schedules are currently paused.`;
  }

  return { eyebrow, body };
}

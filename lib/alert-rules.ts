export type AlertGroup = "today" | "yesterday" | "earlier";

export const systemVoteReminderAlertId = "system-vote-reminder";

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getAlertGroupFromDate(value: string, now = new Date()): AlertGroup {
  const occurredAt = new Date(value);
  if (Number.isNaN(occurredAt.getTime())) return "earlier";

  const today = startOfLocalDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const occurredDay = startOfLocalDay(occurredAt);

  if (occurredDay.getTime() === today.getTime()) return "today";
  if (occurredDay.getTime() === yesterday.getTime()) return "yesterday";
  return "earlier";
}

export function isDefaultUnreadAlertDate(value: string) {
  return getAlertGroupFromDate(value) !== "earlier";
}

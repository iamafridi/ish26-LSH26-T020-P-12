export function currentDhakaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentDhakaMonth(): string {
  return currentDhakaDate().slice(0, 7);
}

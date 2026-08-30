export function formatBDT(amount: string): string {
  const [whole = "0", fraction = "00"] = amount.split(".");
  const formattedWhole = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(Number(whole));
  return `BDT ${formattedWhole}.${fraction.padEnd(2, "0")}`;
}

export function moneyStringToPaisa(amount: string): number {
  const [whole = "0", fraction = ""] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

export function paisaToMoneyString(paisa: number): string {
  return `${Math.floor(paisa / 100)}.${String(paisa % 100).padStart(2, "0")}`;
}

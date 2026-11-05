export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}h ${minutes}min`;
  if (hours) return `${hours}h`;
  return `${minutes}min`;
}

export function formatHours(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

// new Date("2026-11-01") seria lido como UTC e poderia mostrar o dia anterior no Brasil.
function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatShortDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function today(): string {
  return toIsoDate(new Date());
}

export function splitList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

interface FormOptions {
  numbers?: string[];
  lists?: string[];
}

/** Lê um formulário: apara espaços, troca texto vazio por null e converte números e listas. */
export function formValues(data: FormData, options: FormOptions = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, raw] of data.entries()) {
    const text = String(raw).trim();
    if (options.lists?.includes(key)) result[key] = splitList(text);
    else if (text === "") result[key] = null;
    else if (options.numbers?.includes(key)) result[key] = Number(text);
    else result[key] = text;
  }
  return result;
}

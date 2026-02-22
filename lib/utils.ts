import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function safeJsonParse<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

export function toSentenceCase(value: string) {
  if (!value.length) {
    return value;
  }
  return value[0].toUpperCase() + value.slice(1);
}

export function formatDateTime(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function compactText(text: string, max = 800) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}...`;
}

export function toCsvLines(values: string[]) {
  return values.filter(Boolean).join(", ");
}

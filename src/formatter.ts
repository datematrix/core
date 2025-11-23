import type { DateTime } from "./date";

type Locale = string | string[];

const formatCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: Locale, options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify([locale, options]);
  let fmt = formatCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    formatCache.set(key, fmt);
  }
  return fmt;
}

// 순서 중요: 긴 토큰을 먼저 매칭해야 함.
const TOKENS = [
  "dddd", // Monday
  "ddd", // Mon
  "MMMM", // January
  "MMM", // Jan
  "DD", // 01
  "D", // 1
  "yyyy", // 2025
  "yy", // 25
] as const;

type Token = (typeof TOKENS)[number];

const tokenFormatters: Record<
  Token,
  (date: DateTime, locale: Locale) => string
> = {
  dddd: (date, locale) =>
    getFormatter(locale, { weekday: "long" }).format(date.toDate()),
  ddd: (date, locale) =>
    getFormatter(locale, { weekday: "short" }).format(date.toDate()),

  MMMM: (date, locale) =>
    getFormatter(locale, { month: "long" }).format(date.toDate()),
  MMM: (date, locale) =>
    getFormatter(locale, { month: "short" }).format(date.toDate()),

  DD: (date, locale) =>
    getFormatter(locale, { day: "2-digit" }).format(date.toDate()),
  D: (date, locale) =>
    getFormatter(locale, { day: "numeric" }).format(date.toDate()),

  yyyy: (date, locale) =>
    getFormatter(locale, { year: "numeric" }).format(date.toDate()),
  yy: (date, locale) =>
    getFormatter(locale, { year: "2-digit" }).format(date.toDate()),
};

const tokenRegex = new RegExp(TOKENS.join("|"), "g");

export function formatDate(
  date: DateTime,
  template: string,
  locale: Locale = "default"
) {
  return template.replace(tokenRegex, (token) => {
    const fn = tokenFormatters[token as Token];
    if (fn) return fn(date, locale); // token
    return token; // literal fallback
  });
}

/**
 * DateTime에서 사용하는 시간 단위.
 * - dayjs에서 지원하는 단위 문자열을 그대로 사용
 */
export const DATETIME_UNIT = {
  MINUTE: "minute",
  HOUR: "hour",
  DATE: "date",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
} as const;

export type DateTimeUnit = (typeof DATETIME_UNIT)[keyof typeof DATETIME_UNIT];

export const WEEK_STARTS_ON = {
  SUN: 0,
  MON: 1,
} as const;

export type WeekStartsOnType =
  (typeof WEEK_STARTS_ON)[keyof typeof WEEK_STARTS_ON];

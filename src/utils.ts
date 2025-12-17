import { DATETIME_UNIT, WEEK_STARTS_ON, type WeekStartsOnType } from "./types";
import type { EngineEntryRef } from "./engine";

const TIME_UNIT = 5 * 60 * 1000; // 5분 단위 정규화
/**
 * epoch ms를 TIME_UNIT 경계로 "과거 방향으로" 잘라냅니다.
 * - 음수(ms<0)에서도 일관되게 floor-truncate 되도록 구현
 */
export function truncateTime(ms: number) {
  return Math.floor(ms / TIME_UNIT) * TIME_UNIT;
}

export const sortEntries = (entryA: EngineEntryRef, entryB: EngineEntryRef) => {
  let startDiff = entryA.startDate.diff(entryB.startDate, DATETIME_UNIT.DAY);

  if (startDiff !== 0) return startDiff;

  if (entryA.allDay && !entryB.allDay) return -1;
  if (!entryA.allDay && entryB.allDay) return 1;

  startDiff = entryA.startDate.diff(entryB.startDate, DATETIME_UNIT.HOUR);

  if (startDiff !== 0) return startDiff;

  return entryB.endDate.diff(entryA.endDate, DATETIME_UNIT.HOUR);
};

/**
 * weekStartsOn 값 검증 (런타임 안정성)
 */
export function assertWeekStartsOn(v?: WeekStartsOnType): WeekStartsOnType {
  if (v !== WEEK_STARTS_ON.SUN && v !== WEEK_STARTS_ON.MON) {
    throw new Error("Invalid weekStartsOn. Use WEEK_STARTS_ON.SUN or MON.");
  }
  return v;
}

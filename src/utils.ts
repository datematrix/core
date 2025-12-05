import { DATETIME_UNIT } from "./date";
import type { EngineEntryRef } from "./engine";

export const sortEntries = (entryA: EngineEntryRef, entryB: EngineEntryRef) => {
  let startDiff = entryA.startDate.diff(entryB.startDate);

  if (startDiff !== 0) return startDiff;

  if (entryA.allDay && !entryB.allDay) return -1;
  if (!entryA.allDay && entryB.allDay) return 1;

  startDiff = entryA.startDate.diff(entryB.startDate, DATETIME_UNIT.HOUR);

  if (startDiff !== 0) return startDiff;

  return entryB.endDate.diff(entryA.endDate, DATETIME_UNIT.HOUR);
};

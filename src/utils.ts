import { DATETIME_UNIT, type Duration } from "./date";
import type { EngineEntryRef } from "./engine";

export const sortEntries = (entryA: EngineEntryRef, entryB: EngineEntryRef) => {
  if (entryA.allDay && !entryB.allDay) return -1;
  if (!entryA.allDay && entryB.allDay) return 1;
  const startPos = entryA.startDate.diff(entryB.startDate, DATETIME_UNIT.HOUR);
  if (startPos !== 0) return startPos;

  return entryB.endDate.diff(entryA.endDate, DATETIME_UNIT.HOUR);
};

export const sortEntriesWithDuration = (duration: Duration) => {
  const sort = (entryA: EngineEntryRef, entryB: EngineEntryRef) => {
    if (entryA.allDay && !entryB.allDay) return -1;
    if (!entryA.allDay && entryB.allDay) return 1;
    const startPosA = entryA.startDate.diff(
      duration.startDate,
      DATETIME_UNIT.HOUR
    );
    const startPosB = entryB.startDate.diff(
      duration.startDate,
      DATETIME_UNIT.HOUR
    );

    if ((startPosA <= 0 && startPosB <= 0) || startPosA == startPosB) {
      return entryB.endDate.diff(entryA.endDate, DATETIME_UNIT.HOUR);
    }

    return startPosA - startPosB;
  };

  return sort;
};

import type { Duration } from "./date";
import type { EngineEntryRef } from "./engine";

export const sortEntries = (entryA: EngineEntryRef, entryB: EngineEntryRef) => {
  const startPos = entryA.startDate.diff(entryB.startDate);
  if (startPos !== 0) return startPos;

  return entryB.endDate.diff(entryA.endDate);
};

export const sortEntriesWithDuration = (duration: Duration) => {
  const sort = (entryA: EngineEntryRef, entryB: EngineEntryRef) => {
    const startPosA = entryA.startDate.diff(duration.startDate);
    const startPosB = entryB.startDate.diff(duration.startDate);

    if ((startPosA <= 0 && startPosB <= 0) || startPosA == startPosB) {
      return entryB.endDate.diff(entryA.endDate);
    }

    return startPosA - startPosB;
  };

  return sort;
};

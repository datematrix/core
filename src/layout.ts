import { type Duration } from "./date";
import type { IndexedEntry } from "./engine";

export interface LayoutState {
  id: string;
  startPos: number;
  spanLength: number;
  stackLevel: number;
}

export class CalendarLayoutEngine {
  private sortEntries<T extends IndexedEntry>(entries: T[]) {
    return [...entries].sort((a, b) => {
      if (a.startDate!.getTime() === b.startDate!.getTime()) {
        return b.endDate!.getTime() - a.endDate!.getTime();
      }

      return a.startDate!.getTime() - b.startDate!.getTime();
    });
  }

  compute<T extends IndexedEntry>(entries: T[], range: Duration) {
    const sorted = this.sortEntries(entries);

    const state = new Map<string, LayoutState>();
    const lastEndOfLevel: Array<number> = [];
    const rangeLength = range.toArray().length;

    for (const span of sorted) {
      let level = 0;
      let startPos = range.startDate.diff(span.startDate!);
      let spanLength = 0;

      if (span.startDate!.isBefore(range.startDate)) {
        spanLength = Math.min(
          range.startDate.diff(span.endDate!) + 1,
          rangeLength
        );
      } else {
        spanLength = Math.min(
          span.startDate!.diff(span.endDate!) + 1,
          rangeLength
        );
      }

      while (
        level < lastEndOfLevel.length &&
        startPos <= lastEndOfLevel[level]
      ) {
        level += 1;
      }

      if (level === lastEndOfLevel.length) {
        lastEndOfLevel.push(spanLength);
      } else {
        lastEndOfLevel[level] = spanLength;
      }

      state.set(span.id, {
        id: span.id,
        startPos: Math.max(startPos, 0),
        spanLength,
        stackLevel: level,
      });
    }

    return state;
  }
}

import { type DateTimeRange } from "./date";
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

  compute<T extends IndexedEntry>(entries: T[], range: DateTimeRange) {
    const sorted = this.sortEntries(entries);

    const state = new Map<string, LayoutState>();
    const lastEndOfLevel: Array<number> = [];

    for (const span of sorted) {
      let level = 0;
      let startPos = range.startDate.diff(span.startDate!);
      let spanLength = Math.min(
        span.startDate!.diff(span.endDate!) + 1,
        range.toArray().length
      );

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
        startPos,
        spanLength,
        stackLevel: level,
      });
    }

    return state;
  }
}

import { type DateTimeRange } from "./date";
import type { IndexedEntry } from "./engine";

interface LayoutState {
  id: string;
  startPos: number;
  endPos: number;
  stackLevel: number;
}

export class CalendarLayoutEngine {
  state: Map<string, LayoutState>;

  constructor() {
    this.state = new Map();
  }

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

    const lastEndOfLevel: Array<number> = [];

    for (const span of sorted) {
      let level = 0;
      let startPos = range.startDate.diff(span.startDate!);
      let endPos = Math.min(range.startDate.diff(span.endDate!), 6);

      while (
        level < lastEndOfLevel.length &&
        startPos <= lastEndOfLevel[level]
      ) {
        level += 1;
      }

      if (level === lastEndOfLevel.length) {
        lastEndOfLevel.push(endPos);
      } else {
        lastEndOfLevel[level] = endPos;
      }

      this.state.set(span.id, {
        id: span.id,
        startPos,
        endPos,
        stackLevel: level,
      });
    }
  }

  getLayout(id: string): LayoutState {
    const layout = this.state.get(id);

    if (!layout) throw new Error("Layout does not found");

    return layout;
  }
}

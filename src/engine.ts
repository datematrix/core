import { DateTime, DateTimeRange } from "./date";
import { type EntryConfig } from "./entry";

export interface IndexedEntry {
  id: string;
  startDate?: DateTime;
  endDate?: DateTime;
  allDay: boolean;
}

export class CalendarEngine {
  state: Array<IndexedEntry>;

  constructor() {
    this.state = [];
  }

  search(range: DateTimeRange): Array<IndexedEntry> {
    return this.state
      .filter((entry) => {
        if (!entry.startDate) return false;

        if (entry.startDate && !entry.endDate)
          return entry.startDate.isBetween(range);

        if (entry.startDate && entry.endDate) {
          const entryRange = new DateTimeRange(entry.startDate, entry.endDate);
          return entryRange.isOverlap(range);
        }

        throw Error("Not Implemented");
      })
      .sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        const startPos = a.startDate!.getTime() - b.startDate!.getTime();
        if (startPos !== 0) return startPos;

        if (!a.endDate && !b.endDate) return 0;
        if (a.endDate && !b.endDate) return -1;
        if (!a.endDate && b.endDate) return 1;

        return b.endDate!.getTime() - a.endDate!.getTime();
      });
  }

  delete(id: EntryConfig["id"]) {
    this.state = this.state.filter((entry) => entry.id !== id);
  }

  add(config: EntryConfig) {
    const { id, startDate, endDate, allDay } = config;
    this.state = this.state.concat({ id, startDate, endDate, allDay });
  }

  update(
    id: EntryConfig["id"],
    patch: Pick<Partial<EntryConfig>, "startDate" | "endDate" | "allDay">
  ) {
    this.state = this.state.map((entry) =>
      entry.id === id ? { ...entry, ...patch } : entry
    );
  }
}

import { DateTime, DateTimeRange } from "./date";
import { Entry, type EntryConfig } from "./entry";

interface CompactEntry {
  id: string;
  startDate?: DateTime;
  endDate?: DateTime;
  allDay: boolean;
}

export class CalendarEngine {
  state: Array<CompactEntry>;

  constructor() {
    this.state = [];
  }

  search(
    idOrDateTimeOrRange: EntryConfig["id"] | DateTime | DateTimeRange
  ): Array<string> {
    if (typeof idOrDateTimeOrRange === "string") {
      const e = this.state.find((entry) => {
        return entry.id === idOrDateTimeOrRange;
      });
      return e ? [e.id] : [];
    }

    if (idOrDateTimeOrRange instanceof DateTime) {
      return this.state
        .filter((entry) => {
          if (!entry.startDate) return false;
          if (!entry.endDate)
            return entry.startDate.isEqual(idOrDateTimeOrRange);

          return idOrDateTimeOrRange.isBetween(
            new DateTimeRange(entry.startDate, entry.endDate)
          );
        })
        .map((entry) => entry.id);
    }

    return this.state
      .filter((entry) => {
        if (!entry.startDate) return false;

        if (entry.startDate && !entry.endDate)
          return entry.startDate.isBetween(idOrDateTimeOrRange);

        if (entry.startDate && entry.endDate) {
          const entryRange = new DateTimeRange(entry.startDate, entry.endDate);
          return entryRange.isOverlap(idOrDateTimeOrRange);
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
      })
      .map((entry) => entry.id);
  }

  delete(id: EntryConfig["id"]) {
    this.state = this.state.filter((entry) => entry.id !== id);
  }

  add(config: EntryConfig) {
    const { id, startDate, endDate, allDay } = config;
    this.state = this.state.concat({ id, startDate, endDate, allDay });
  }

  update(newEntry: Entry) {
    this.state = this.state.map((entry) =>
      entry.id === newEntry.id ? newEntry : entry
    );
  }
}

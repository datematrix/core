import { DateTime, Duration } from "./date";
import {
  ScheduledEntry,
  type EntryConfig,
  type EntryWithDuration,
} from "./entry";
import { sortEntries } from "./utils";

export interface EngineEntryRef {
  id: string;
  startDate: DateTime;
  endDate: DateTime;
  allDay: boolean;
}

export class CalendarEngine {
  state: Array<EngineEntryRef>;

  constructor() {
    this.state = [];
  }

  search(range: Duration): Array<EngineEntryRef> {
    return this.state
      .filter((entry) => {
        const entryRange = new Duration(entry.startDate, entry.endDate);
        return entryRange.isOverlap(range);
      })
      .sort(sortEntries);
  }

  delete(id: EntryConfig["id"]) {
    this.state = this.state.filter((entry) => entry.id !== id);
  }

  add(config: ScheduledEntry) {
    const { id, startDate, endDate, allDay } = config;
    this.state = this.state.concat({ id, startDate, endDate, allDay });
  }

  update(
    id: EntryConfig["id"],
    patch: Pick<EntryWithDuration, "startDate" | "endDate" | "allDay">
  ) {
    this.state = this.state.map((entry) =>
      entry.id === id ? { ...entry, ...patch } : entry
    );
  }
}

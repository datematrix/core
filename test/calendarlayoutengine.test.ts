import { DateTime, DATETIME_UNIT, WEEK_STARTS_ON } from "../src/date";
import { EngineEntryRef } from "../src/engine";
import { ENTRY_PRIORITY, ENTRY_STATUS, ENTRY_TYPE } from "../src/entry";
import { CalendarLayoutEngine } from "../src/layout";
import { describe, expect, it, test } from "vitest"; // <-- **
import { sortEntries } from "../src/utils";

const createMockEntry = (
  startDate: DateTime,
  endDate: DateTime,
  allDay: boolean,
  id?: string
): EngineEntryRef => {
  id = id ?? Math.random().toString(36).slice(2);
  return {
    id,
    startDate,
    endDate,
    allDay,
  };
};

describe("CalendarLayoutEngine", () => {
  const now = DateTime.now();
  const thisWeek = now.range("week", WEEK_STARTS_ON.MON);
  it("UTC ms 입력을 정확히 분해해야 한다", () => {
    const engine = new CalendarLayoutEngine();
    const entries: EngineEntryRef[] = [];

    // Entry 1
    const entry1_startDate = thisWeek.startDate.add(-3, DATETIME_UNIT.DAY);
    const entry1_endDate = thisWeek.startDate.add(3, DATETIME_UNIT.DAY);
    const entry1 = createMockEntry(
      entry1_startDate,
      entry1_endDate,
      true,
      "entry1"
    );
    entries.push(entry1);

    // Entry 2
    const entry2_startDate = thisWeek.startDate;
    const entry2_endDate = thisWeek.startDate.add(4, DATETIME_UNIT.DAY);
    const entry2 = createMockEntry(
      entry2_startDate,
      entry2_endDate,
      true,
      "entry2"
    );
    entries.push(entry2);

    // Entry 3
    const entry3_startDate = thisWeek.startDate.add(4, DATETIME_UNIT.DAY);
    const entry3_endDate = thisWeek.startDate.add(4, DATETIME_UNIT.DAY);
    const entry3 = createMockEntry(
      entry3_startDate,
      entry3_endDate,
      true,
      "entry3"
    );
    entries.push(entry3);

    // Entry 4
    const entry4_startDate = thisWeek.startDate;
    const entry4_endDate = thisWeek.endDate;
    const entry4 = createMockEntry(
      entry4_startDate,
      entry4_endDate,
      true,
      "entry4"
    );
    entries.push(entry4);

    // Entry 5
    const entry5_startDate = thisWeek.startDate;
    const entry5_endDate = thisWeek.endDate.add(3, DATETIME_UNIT.DAY);
    const entry5 = createMockEntry(
      entry5_startDate,
      entry5_endDate,
      true,
      "entry5"
    );
    entries.push(entry5);

    // Entry 6
    const entry6_startDate = thisWeek.startDate.add(-3, DATETIME_UNIT.DAY);
    const entry6_endDate = thisWeek.endDate.add(3, DATETIME_UNIT.DAY);
    const entry6 = createMockEntry(
      entry6_startDate,
      entry6_endDate,
      true,
      "entry6"
    );
    entries.push(entry6);

    // Entry 7
    const entry7_startDate = thisWeek.startDate.add(2, DATETIME_UNIT.DAY);
    const entry7_endDate = thisWeek.endDate.add(3, DATETIME_UNIT.DAY);
    const entry7 = createMockEntry(
      entry7_startDate,
      entry7_endDate,
      true,
      "entry7"
    );
    entries.push(entry7);

    // Entry 8
    const entry8_startDate = thisWeek.startDate.add(5, DATETIME_UNIT.DAY);
    const entry8_endDate = thisWeek.endDate;
    const entry8 = createMockEntry(
      entry8_startDate,
      entry8_endDate,
      true,
      "entry8"
    );
    entries.push(entry8);

    // Entry 9
    const entry9_startDate = thisWeek.startDate.add(-4, DATETIME_UNIT.DAY);
    const entry9_endDate = thisWeek.endDate.add(3, DATETIME_UNIT.DAY);
    const entry9 = createMockEntry(
      entry9_startDate,
      entry9_endDate,
      true,
      "entry9"
    );
    entries.push(entry9);

    const result = engine.compute(entries, thisWeek);
  });

  it("test", () => {
    const engine = new CalendarLayoutEngine();
    const now = DateTime.now();
    const thisWeek = now.range("week", WEEK_STARTS_ON.MON);
    const createMockEntry = (
      id: string,
      startDate: DateTime = DateTime.now(),
      endDate: DateTime = DateTime.now().add(1, "day"),
      allDay: boolean = false
    ) => {
      return {
        id,
        title: `Entry ${id}`,
        startDate,
        endDate,
        priority: ENTRY_PRIORITY.P2,
        tags: [],
        status: ENTRY_STATUS.DEFAULT,
        allDay,
        completed: false,
        type: ENTRY_TYPE.EVENT,
      };
    };

    const entries = [
      createMockEntry("1"),
      createMockEntry("2"),
      createMockEntry("3"),
      createMockEntry(
        "4",
        DateTime.now(),
        DateTime.now().add(3, DATETIME_UNIT.DAY),
        true
      ),
      createMockEntry(
        "5",
        DateTime.now(),
        DateTime.now().add(1, DATETIME_UNIT.DAY),
        true
      ),
      createMockEntry(
        "6",
        DateTime.now(),
        DateTime.now().add(2, DATETIME_UNIT.DAY),
        true
      ),
      createMockEntry(
        "7",
        DateTime.now().add(2, DATETIME_UNIT.DAY),
        DateTime.now().add(6, DATETIME_UNIT.DAY),
        true
      ),
      createMockEntry(
        "8",
        DateTime.now().add(-5, DATETIME_UNIT.DAY),
        DateTime.now().add(9, DATETIME_UNIT.DAY),
        true
      ),
    ];

    const result = engine.compute(entries, thisWeek);
  });

  it("test2", () => {
    const engine = new CalendarLayoutEngine();
    const now = DateTime.now();
    const thisWeek = now.range("week", WEEK_STARTS_ON.MON);
    const createMockEntry = (
      id: string,
      startDate: DateTime = DateTime.now(),
      endDate: DateTime = DateTime.now().add(1, "day"),
      allDay: boolean = false
    ) => {
      return {
        id,
        title: `Entry ${id}`,
        startDate,
        endDate,
        priority: ENTRY_PRIORITY.P2,
        tags: [],
        status: ENTRY_STATUS.DEFAULT,
        allDay,
        completed: false,
        type: ENTRY_TYPE.EVENT,
      };
    };

    const entries = [
      createMockEntry(
        "1",
        DateTime.now().setTime(9, 0),
        DateTime.now().setTime(12, 0),
        false
      ),
      createMockEntry(
        "2",
        DateTime.now().setTime(13, 0),
        DateTime.now().setTime(15, 30),
        false
      ),
      createMockEntry(
        "3",
        DateTime.now().setTime(4, 30),
        DateTime.now().setTime(7, 15),
        false
      ),
      createMockEntry(
        "4",
        DateTime.now().add(-1, DATETIME_UNIT.DAY).setTime(9, 30),
        DateTime.now().add(-1, DATETIME_UNIT.DAY).setTime(12, 30),
        false
      ),
      createMockEntry(
        "5",
        DateTime.now(),
        DateTime.now().add(1, DATETIME_UNIT.DAY),
        true
      ),
      createMockEntry(
        "6",
        DateTime.now(),
        DateTime.now().add(2, DATETIME_UNIT.DAY),
        true
      ),
      createMockEntry(
        "7",
        DateTime.now().add(2, DATETIME_UNIT.DAY),
        DateTime.now().add(6, DATETIME_UNIT.DAY),
        true
      ),
      createMockEntry(
        "8",
        DateTime.now().add(-5, DATETIME_UNIT.DAY),
        DateTime.now().add(9, DATETIME_UNIT.DAY),
        true
      ),
    ];

    const result = engine.compute(entries, thisWeek);
    console.log(entries.sort(sortEntries).map((e) => e.id));
    console.log(result);
  });
});

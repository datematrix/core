// tests/datetime.role.spec.ts
import { describe, it, expect, vi, beforeAll, afterAll, test } from "vitest";
import {
  DateTime,
  DateTimeRange,
  WEEK_STARTS_ON,
  type WeekStartsOnType,
} from "../src/date"; // 경로는 프로젝트에 맞게 조정

const TZ = "Europe/Prague"; // UTC+02:00
const EPOCH = (iso: string) => new Date(iso).getTime();

describe("DateTime: 생성/기본자(ctor)/정적 생성자 - 역할 검증", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-23T19:32:45Z"));
  });
  afterAll(() => vi.useRealTimers());

  it("UTC 고정 생성: 주어진 UTC epoch ms를 해당 tz 뷰로 표현해야 한다", () => {
    const dt = DateTime.fromUTC("2025-09-22T04:30:00Z", TZ);
    expect(dt.getHours()).toBe(6);
    expect(dt.getMinutes()).toBe(30);
    expect(dt.getDateOfMonth()).toBe(22);
  });

  it("5분 단위 절삭(truncate): 초/밀리초 단위 입력도 5분 단위로 내림되어야 한다", () => {
    const dt = DateTime.fromUTC("2025-09-22T04:33:42Z", TZ);
    // 역할: 04:33:42 → 04:30 으로 보임(5분 단위 정규화)
    expect(dt.getHours()).toBe(6);
    expect(dt.getMinutes()).toBe(30);
  });

  it("DateTime.fromUTC(iso): 잘못된 ISO면 명확한 에러를 던져야 한다", () => {
    expect(() => DateTime.fromUTC("2025-09-22 04:30:00Z", TZ)).toThrow();
    expect(() => DateTime.fromUTC("not-an-iso", "UTC")).toThrow();
  });

  it("DateTime.fromTZ(number): UTC 기준 시각을 tz 기준의 현지 시각으로 변환해 동일 시점을 나타내야 한다", () => {
    const localEpoch = EPOCH("2025-09-22T04:30:00Z");
    const dt = DateTime.fromTZ(localEpoch, TZ);
    expect(dt.getHours()).toBe(4);
    expect(dt.getMinutes()).toBe(30);
  });

  it("DateTime.now(tz): 시스템 시각을 해당 tz 기준 DateTime으로 반환해야 한다", () => {
    const dt = DateTime.now(TZ);
    expect(dt.getDateOfMonth()).toBe(23);
    expect(dt.getHours()).toBe(12);
    expect(dt.getMinutes()).toBe(30);
  });
});

describe("DateTime: 포맷/게터 - 역할 검증", () => {
  const dt = DateTime.fromUTC("2025-09-22T04:30:00Z", TZ);

  it("getDayOfWeek(): 0(일)~6(토)의 정수를 반환해야 한다", () => {
    expect(dt.getDayOfWeek()).toBeGreaterThanOrEqual(0);
    expect(dt.getDayOfWeek()).toBeLessThanOrEqual(6);
  });

  it("format(): 날짜 문자열(yyyy-MM-dd) 형태를 반환해야 한다", () => {
    // 역할: 구현체가 어떤 포맷터를 쓰든, yyyy-MM-dd가 포함/일치해야 함
    const s = dt.format(false);
    expect(s).toContain("2025-09-22");
  });

  it("format(true): 날짜+시간 문자열을 반환해야 한다(시간 정보 포함)", () => {
    const s = dt.format(true);
    expect(s).toContain("2025-09-22"); // 날짜 포함
    // 시간(시:분)이 들어있어야 함 (로케일 차이를 고려해 '04:30'만 확인)
    expect(s).toMatch(/06:30/);
  });
});

describe("DateTime: 변경자(setTime/add) - 역할 검증", () => {
  it("setTime(h,m): 같은 날짜에서 시/분을 교체해야 한다", () => {
    const dt = DateTime.fromUTC("2025-09-22T14:45:00Z", TZ);
    const changed = dt.setTime(0, 5);
    expect(changed.getHours()).toBe(0);
    expect(changed.getMinutes()).toBe(5);
    expect(changed.getDateOfMonth()).toBe(22);
  });

  it("add(minutes|hours|date): 해당 단위로 상대 이동해야 한다", () => {
    const dt = DateTime.fromUTC("2025-09-22T04:30:00Z", TZ);
    expect(dt.add(36, "minutes").getMinutes()).toBe(6); // 04:30 + 30m (5분단위 정규화 포함)
    expect(dt.add(2, "hours").getHours()).toBe(8); // 04 → 06
    expect(dt.add(3, "date").format()).toBe("2025-09-25"); // +3일
  });
});

describe("DateTime: 비교자(isEqual/Before/After/OnOrBefore/OnOrAfter) - 역할 검증", () => {
  const a = DateTime.fromUTC("2025-09-22T04:30:00Z", TZ);
  const b = DateTime.fromUTC("2025-09-22T06:00:00Z", TZ);
  const c = DateTime.fromUTC("2025-09-22T06:00:00Z", "Asia/Seoul");
  const same = DateTime.fromUTC("2025-09-22T04:30:00Z", "UTC");

  it("isEqual: 동일 시점이면 true", () => {
    expect(a.isEqual(same)).toBe(true);
    expect(a.isEqual(b)).toBe(false);
    expect(b.isEqual(c)).toBe(true);
  });

  it("isBefore/isAfter: 엄격 비교(동일 시점은 false)", () => {
    expect(a.isBefore(b)).toBe(true);
    expect(b.isBefore(a)).toBe(false);
    expect(a.isBefore(same)).toBe(false);

    expect(b.isAfter(a)).toBe(true);
    expect(a.isAfter(b)).toBe(false);
    expect(a.isAfter(same)).toBe(false);
  });

  it("isOnOrBefore/isOnOrAfter: 동일 시점 포함", () => {
    expect(a.isOnOrBefore(same)).toBe(true);
    expect(a.isOnOrAfter(same)).toBe(true);
    expect(a.isOnOrBefore(b)).toBe(true);
    expect(b.isOnOrAfter(a)).toBe(true);
  });
});

describe("DateTime: diff - 역할 검증", () => {
  it("diff(unit): 두 시점 간 차이를 단위별 정수로 반환해야 한다(시간/일/월/년)", () => {
    const a = new DateTime(EPOCH("2025-09-22T00:00:00Z"), "UTC");
    const b = new DateTime(EPOCH("2025-09-23T01:00:00Z"), "UTC");
    expect(a.diff(b, "hours")).toBeGreaterThanOrEqual(25); // 최소 25h
    expect(a.diff(b, "date")).toBeGreaterThanOrEqual(1); // 최소 1일
  });

  it("diff('month'|'year'): 연/월 경계 이동을 정수 차이로 나타내야 한다", () => {
    const a = new DateTime(EPOCH("2025-01-15T00:00:00Z"), "UTC");
    const b = new DateTime(EPOCH("2026-03-15T00:00:00Z"), "UTC");
    expect(a.diff(b, "year")).toBe(1); // 2025 → 2026
    expect(a.diff(b, "month")).toBe(14); // 2025-01 → 2026-03 (14개월)
  });
});

describe("DateTime: isToday - 역할 검증", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-22T12:34:56Z"));
  });
  afterAll(() => vi.useRealTimers());

  it("같은 tz에서 ‘오늘’이면 true, 아니면 false", () => {
    const today = new DateTime(EPOCH("2025-09-22T00:00:00Z"), "UTC");
    const tomorrow = new DateTime(EPOCH("2025-09-23T00:00:00Z"), "UTC");
    expect(today.isToday()).toBe(true);
    expect(tomorrow.isToday()).toBe(false);
  });
});

describe("DateTime: isBetween - 역할 검증 (경계 포함/제외 옵션)", () => {
  const tz = "UTC";
  const s = new DateTime(EPOCH("2025-09-22T00:00:00Z"), tz);
  const e = new DateTime(EPOCH("2025-09-24T00:00:00Z"), tz);
  const mid = new DateTime(EPOCH("2025-09-23T00:00:00Z"), tz);
  const atStart = new DateTime(EPOCH("2025-09-22T00:00:00Z"), tz);
  const atEnd = new DateTime(EPOCH("2025-09-24T00:00:00Z"), tz);
  const range = new DateTimeRange(s, e);

  it("includeBounds=true(기본): [start, end] 내부면 true", () => {
    expect(mid.isBetween(s, e)).toBe(true);
    expect(atStart.isBetween(s, e)).toBe(true);
    expect(atEnd.isBetween(s, e)).toBe(true);

    // range 시그니처도 동일 규칙
    expect(mid.isBetween(range)).toBe(true);
    expect(atStart.isBetween(range)).toBe(true);
    expect(atEnd.isBetween(range)).toBe(true);
  });

  it("includeBounds=false: (start, end) 열린구간 내부만 true", () => {
    expect(mid.isBetween(s, e, false)).toBe(true);
    expect(atStart.isBetween(s, e, false)).toBe(false);
    expect(atEnd.isBetween(s, e, false)).toBe(false);

    expect(mid.isBetween(range, false)).toBe(true);
    expect(atStart.isBetween(range, false)).toBe(false);
    expect(atEnd.isBetween(range, false)).toBe(false);
  });
});

describe("DateTime: startOf - 역할 검증", () => {
  const dt = DateTime.fromUTC("2025-09-22T14:45:00Z", TZ);

  it("startOf('date'): 해당 날짜의 00:00로 이동해야 한다", () => {
    const s = dt.startOf("date");
    expect(s.getDateOfMonth()).toBe(22);
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
  });

  it("startOf('month'): 해당 월의 1일 00:00로 이동해야 한다", () => {
    const s = dt.startOf("month");
    expect(s.format(true)).toBe("2025-09-01 00:00:00");
  });

  it("startOf('year'): 해당 해 1월 1일 00:00로 이동해야 한다", () => {
    const s = dt.startOf("year");
    expect(s.format(true)).toBe("2025-01-01 00:00:00");
  });

  it("startOf('week', weekStartsOn): weekStartsOn(SUN/MON)에 따라 ‘그 주의 시작 00:00’로 이동해야 한다", () => {
    const dt = DateTime.fromUTC("2025-09-22T14:45:00Z", TZ);
    const dt2 = DateTime.fromUTC("2025-09-28T14:45:00Z", TZ);
    const a = dt.startOf("week", WEEK_STARTS_ON.MON);
    const b = dt.startOf("week", WEEK_STARTS_ON.SUN);
    const c = dt2.startOf("week", WEEK_STARTS_ON.SUN);
    const d = dt2.startOf("week", WEEK_STARTS_ON.MON);
    expect(a.format(true)).toBe("2025-09-22 00:00:00");
    expect(b.format(true)).toBe("2025-09-21 00:00:00");
    expect(c.format(true)).toBe("2025-09-28 00:00:00");
    expect(d.format(true)).toBe("2025-09-22 00:00:00");
  });
});

describe("DateTime: endOf - 역할 검증", () => {
  const dt = DateTime.fromUTC("2025-09-22T14:45:00Z", TZ);

  it("endOf('date'): 해당 날짜의 23:59로 이동해야 한다", () => {
    const s = dt.endOf("date");
    expect(s.getDateOfMonth()).toBe(22);
    expect(s.getHours()).toBe(23);
    expect(s.getMinutes()).toBe(59);
  });

  it("endOf('month'): 해당 월의 말일 23:59로 이동해야 한다", () => {
    const dt2 = DateTime.fromUTC("2025-02-22T14:45:00Z", TZ);
    const s = dt.endOf("month");
    const e = dt2.endOf("month");
    expect(s.format(true)).toBe("2025-09-30 23:59:00");
    expect(e.format(true)).toBe("2025-02-28 23:59:00");
  });

  it("endOf('year'): 해당 해 1월 1일 00:00로 이동해야 한다", () => {
    const s = dt.endOf("year");
    expect(s.format(true)).toBe("2025-12-31 23:59:00");
  });

  it("endOf('week', weekStartsOn): weekStartsOn(SUN/MON)에 따라 ‘그 주의 마지막 23:59’로 이동해야 한다", () => {
    const dt = DateTime.fromUTC("2025-09-22T14:45:00Z", TZ);
    const dt2 = DateTime.fromUTC("2025-09-28T14:45:00Z", TZ);
    const a = dt.endOf("week", WEEK_STARTS_ON.MON);
    const b = dt.endOf("week", WEEK_STARTS_ON.SUN);
    const c = dt2.endOf("week", WEEK_STARTS_ON.SUN);
    const d = dt2.endOf("week", WEEK_STARTS_ON.MON);
    expect(a.format(true)).toBe("2025-09-28 23:59:00");
    expect(b.format(true)).toBe("2025-09-27 23:59:00");
    expect(c.format(true)).toBe("2025-10-04 23:59:00");
    expect(d.format(true)).toBe("2025-09-28 23:59:00");
  });
});

describe("DateTime: weekRange/monthMatrix - 역할 명세(미구현)", () => {
  test.todo(
    "weekRange(weekStartsOn): 해당 DateTime이 속한 1주 범위를 [start,end]로 반환 (경계 포함)"
  );
  test.todo(
    "monthMatrix(weekStartsOn): 월 캘린더 매트릭스를 주(week) 단위의 DateTimeRange[]로 반환 (보통 5~6주)"
  );

  // 예시 명세(구현 완료 시 확인할 포인트)
  // - monthMatrix의 첫 번째 주는 month.startOf('month')에서 시작 주(weekStartsOn)로 당겨진 시작일
  // - 마지막 주는 month.endOf('month')가 속한 주의 끝일
  // - 모든 range는 [start,end] (포함) 기준
});

// tests/datetime.czech.spec.ts

describe("DateTime (Europe/Prague) - 생성자/정적 생성자", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-23T19:32:45Z"));
  });
  afterAll(() => vi.useRealTimers());

  it("UTC 기준 입력을 Europe/Prague 뷰로 변환해야 한다", () => {
    // 2025-09-22T04:30:00Z = 프라하 2025-09-22 06:30 (CEST, +2)
    const dt = new DateTime(EPOCH("2025-09-22T04:30:00Z"), TZ);
    expect(dt.getHours()).toBe(6);
    expect(dt.getMinutes()).toBe(30);
    expect(dt.getDateOfMonth()).toBe(22);
  });

  it("fromUTC: ISO8601 UTC 문자열을 파싱해 현지 시각 뷰를 제공해야 한다", () => {
    const dt = DateTime.fromUTC("2025-09-22T04:30:00Z", TZ);
    expect(dt.getHours()).toBe(6);
    expect(dt.getMinutes()).toBe(30);
  });

  it("fromTZ: 현지 시각(epoch ms)을 UTC로 환산 후 동일 시점을 생성해야 한다", () => {
    const localEpoch = EPOCH("2025-09-22T06:30:00Z"); // 프라하 현지 시각
    const dt = DateTime.fromTZ(localEpoch, TZ);
    expect(dt.getHours()).toBe(6);
    expect(dt.getMinutes()).toBe(30);
  });

  it("now(): 시스템 시각을 Europe/Prague 기준으로 생성해야 한다", () => {
    const dt = DateTime.now(TZ);
    expect(dt.getHours()).toBe(12);
    expect(dt.getMinutes()).toBe(30);
  });
});

describe("DateTime (Europe/Prague) - 포맷/게터", () => {
  const dt = new DateTime(EPOCH("2025-09-22T04:30:00Z"), TZ); // 06:30

  it("getDayOfWeek(): 현지 요일을 반환 (월요일=1)", () => {
    expect(dt.getDayOfWeek()).toBe(1); // 2025-09-22은 월요일
  });

  it("format(): 현지 날짜 문자열을 반환해야 한다", () => {
    expect(dt.format()).toContain("2025-09-22");
  });

  it("format(true): 현지 날짜+시간을 반환해야 한다", () => {
    const s = dt.format(true);
    expect(s).toContain("2025-09-22");
    expect(s).toMatch(/06:30/);
  });
});

describe("DateTime (Europe/Prague) - 변경자", () => {
  const base = new DateTime(EPOCH("2025-09-22T04:30:00Z"), TZ); // 06:30

  it("setTime(): 시/분을 현지 기준으로 교체해야 한다", () => {
    const changed = base.setTime(8, 5);
    expect(changed.getHours()).toBe(8);
    expect(changed.getMinutes()).toBe(5);
    expect(changed.getDateOfMonth()).toBe(22);
  });

  it("add(): 단위별 상대 이동", () => {
    expect(base.add(30, "minutes").getMinutes()).toBe(0); // 06:30 + 30m = 07:00
    expect(base.add(2, "hours").getHours()).toBe(8); // 06 → 08
    expect(base.add(1, "date").getDateOfMonth()).toBe(23); // 하루 뒤
  });
});

describe("DateTime (Europe/Prague) - 비교자", () => {
  const a = new DateTime(EPOCH("2025-09-22T04:30:00Z"), TZ); // 06:30
  const b = new DateTime(EPOCH("2025-09-22T06:00:00Z"), TZ); // 08:00
  const same = new DateTime(EPOCH("2025-09-22T04:30:00Z"), TZ);

  it("isEqual: 동일 시점만 true", () => {
    expect(a.isEqual(same)).toBe(true);
    expect(a.isEqual(b)).toBe(false);
  });

  it("isBefore/isAfter: 순서 비교 (동일 시각은 false)", () => {
    expect(a.isBefore(b)).toBe(true);
    expect(b.isAfter(a)).toBe(true);
    expect(a.isBefore(same)).toBe(false);
    expect(a.isAfter(same)).toBe(false);
  });

  it("isOnOrBefore/isOnOrAfter: 동일 시각 포함", () => {
    expect(a.isOnOrBefore(same)).toBe(true);
    expect(a.isOnOrAfter(same)).toBe(true);
  });
});

describe("DateTime (Europe/Prague) - diff", () => {
  const start = new DateTime(EPOCH("2025-03-29T23:00:00Z"), TZ); // 현지 2025-03-30 01:00 (DST 시작 전날 밤)
  const end = new DateTime(EPOCH("2025-03-30T23:00:00Z"), TZ); // 현지 2025-03-31 01:00 (DST 적용됨)

  it("diff('hours'): DST 전환 포함해도 정수 시간 차이 반환해야 한다", () => {
    const hours = start.diff(end, "hours");
    expect(typeof hours).toBe("number");
  });

  it("diff('date'): 달력상의 일 수 차이 반환해야 한다", () => {
    const days = start.diff(end, "date");
    expect(days).toBe(1);
  });
});

describe("DateTime (Europe/Prague) - isToday", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-22T12:34:56Z")); // 현지 14:34
  });
  afterAll(() => vi.useRealTimers());

  it("같은 날짜면 true, 다르면 false", () => {
    const today = new DateTime(EPOCH("2025-09-22T00:00:00Z"), TZ);
    const tomorrow = new DateTime(EPOCH("2025-09-23T00:00:00Z"), TZ);
    expect(today.isToday()).toBe(true);
    expect(tomorrow.isToday()).toBe(false);
  });
});

describe("DateTime (Europe/Prague) - isBetween", () => {
  const s = new DateTime(EPOCH("2025-09-22T00:00:00Z"), TZ);
  const e = new DateTime(EPOCH("2025-09-24T00:00:00Z"), TZ);
  const mid = new DateTime(EPOCH("2025-09-23T00:00:00Z"), TZ);

  it("기본: 경계 포함 [s,e]", () => {
    expect(mid.isBetween(s, e)).toBe(true);
    expect(s.isBetween(s, e)).toBe(true);
    expect(e.isBetween(s, e)).toBe(true);
  });

  it("includeBounds=false: 경계 제외 (s,e)", () => {
    expect(mid.isBetween(s, e, false)).toBe(true);
    expect(s.isBetween(s, e, false)).toBe(false);
    expect(e.isBetween(s, e, false)).toBe(false);
  });
});

describe("DateTime (Europe/Prague) - startOf", () => {
  const dt = new DateTime(EPOCH("2025-09-22T14:45:00Z"), TZ); // 16:45 현지

  it("startOf('date'): 해당 날짜 00:00", () => {
    const s = dt.startOf("date");
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(s.getDateOfMonth()).toBe(22);
  });

  it("startOf('month'): 월 첫날 00:00", () => {
    const s = dt.startOf("month");
    expect(s.getDateOfMonth()).toBe(1);
    expect(s.getHours()).toBe(0);
  });

  test.todo("startOf('year'): 해당 해 1월 1일 00:00");
  test.todo("startOf('week'): weekStartsOn(SUN/MON)에 따라 주 시작일로 이동");
});

describe("DateTime (Europe/Prague) - endOf/weekRange/monthMatrix (미구현)", () => {
  test.todo("endOf('date'|'month'|'year'|'week'): 경계 시각 반환");
  test.todo("weekRange(weekStartsOn): 속한 주 범위 반환");
  test.todo("monthMatrix(weekStartsOn): 달력 주차 매트릭스 반환");
});

// DateTime.test.ts
import { describe, it, expect } from "vitest";
import {
  DateTime,
  DATETIME_UNIT,
  WEEK_STARTS_ON,
  // Duration 이 다른 파일에 있다면 거기서 import 하세요.
  Duration,
} from "../src/date"; // 경로는 프로젝트에 맞게 수정

// UTC ISO 문자열로 DateTime 생성 유틸
const TIMEZONE = {
  SEOUL: "Asia/Seoul",
};
const fromUTC = (iso: string, tz = TIMEZONE.SEOUL) => DateTime.fromUTC(iso, tz);

describe("DateTime - basic construction & getters", () => {
  it("UTC ms를 기준으로 생성하고 5분 단위로 truncate 해야 한다", () => {
    // 2025-01-01T10:02:00Z -> 10:00으로 truncate
    const originalMs = Date.UTC(2025, 0, 1, 10, 2, 0);
    const dt = new DateTime(originalMs, TIMEZONE.SEOUL);

    // truncateTime이 적용되었는지: 분이 0이어야 함
    expect(dt.getHours()).toBe(19);
    expect(dt.getMinutes()).toBe(0);
    // getTime()은 truncate된 시점이어야 한다
    const truncatedMs = Date.UTC(2025, 0, 1, 10, 0, 0);
    expect(dt.getTime()).toBe(truncatedMs);
  });

  it("fromUTC(ISO string)는 올바른 시각을 표현해야 한다", () => {
    const dt = fromUTC("2025-01-02T03:04:00Z");

    expect(dt.getDateOfMonth()).toBe(2);
    expect(dt.getHours()).toBe(12);
    expect(dt.getMinutes()).toBe(0); // 5분 단위 truncate 기준으로 03:04 -> 03:00
    expect(dt.toISOString()).toBe("2025-01-02T12:00:00Z");
  });

  it("fromUTC(BaseDate)로 생성한 DateTime도 ms 기준으로 동일해야 한다", () => {
    const iso = "2025-03-10T10:30:00Z";
    const dt1 = fromUTC(iso, "UTC");
    const base = (DateTime as any).fromUTC(iso, "UTC")["_base"] as any;

    const dt2 = DateTime.fromUTC(base as any, "UTC");
    expect(dt2.getTime()).toBe(dt1.getTime());
    expect(dt2.toISOString()).toBe(dt1.toISOString());
  });

  it("getDayOfWeek / getDateOfMonth / getHours / getMinutes가 내부 view 기준으로 동작해야 한다", () => {
    // 2025-01-01T10:15:00Z
    const dt = fromUTC("2025-01-01T10:15:00Z", "UTC");

    expect(dt.getDateOfMonth()).toBe(1);
    expect(dt.getHours()).toBe(10);
    expect(dt.getMinutes()).toBe(15 - (15 % 5)); // 5분 단위 truncate
    // 2025-01-01 은 수요일 -> dayjs 기준 Sun=0 이면 3
    expect(dt.getDayOfWeek()).toBe(3);
  });
});

describe("DateTime - timezone offset & getTimezoneOffset", () => {
  it("getTimezoneOffset은 UTC / Asia/Seoul 에 대해 일관된 offset을 반환해야 한다", () => {
    const utcOffset = DateTime.getTimezoneOffset("UTC");
    const seoulOffset = DateTime.getTimezoneOffset("Asia/Seoul");

    expect(utcOffset).toBe(0);
    expect(seoulOffset).toBe(9 * 60); // +09:00
  });

  it("동일한 UTC ms라도 timezone에 따라 view 시간은 달라야 한다", () => {
    // 2025-01-01T00:00:00Z
    const ms = Date.UTC(2025, 0, 1, 0, 0, 0);

    const utc = new DateTime(ms, "UTC");
    const seoul = new DateTime(ms, "Asia/Seoul");

    // UTC view
    expect(utc.getHours()).toBe(0);

    // Asia/Seoul 은 +9시간
    expect(seoul.getHours()).toBe(9);
    expect(seoul.getDateOfMonth()).toBe(1); // 날짜는 그대로
  });

  it("now(tz)를 사용하면 해당 타임존 기준의 view를 가진 DateTime이 생성되어야 한다", () => {
    const utcNow = DateTime.now("UTC");
    const seoulNow = DateTime.now("Asia/Seoul");

    // base는 동일한 dayjs().valueOf()를 쓰므로 diff는 timezone과 무관해야 한다
    const diffMs = Math.abs(utcNow.diff(seoulNow, DATETIME_UNIT.MINUTE));
    // 동일 시점에서 생성됐다고 가정하면 base diff는 0에 가까워야 한다
    expect(diffMs).toBeLessThanOrEqual(1);
  });
});

describe("DateTime - diff / setTime / add", () => {
  it("diff는 base(UTC) 기준으로 timezone과 무관하게 동작해야 한다", () => {
    const a = fromUTC("2025-03-10T00:00:00Z", "UTC");
    const b = fromUTC("2025-03-12T00:00:00Z", "Asia/Seoul");

    expect(b.diff(a, DATETIME_UNIT.DAY)).toBe(2);
    expect(a.diff(b, DATETIME_UNIT.DAY)).toBe(-2);
  });

  it("setTime은 시/분을 변경한 새로운 DateTime을 반환해야 하며, 원본은 불변이어야 한다", () => {
    const dt = fromUTC("2025-03-10T10:30:00Z", "UTC");

    const changed = dt.setTime(8, 0);

    expect(changed.getHours()).toBe(8);
    expect(changed.getMinutes()).toBe(0);
    expect(changed.toISOString()).toBe("2025-03-10T08:00:00Z");

    // 원본은 그대로
    expect(dt.getHours()).toBe(10);
  });

  it("add는 지정한 단위만큼 이동한 새로운 DateTime을 반환해야 하며, base 기준으로 일관되게 동작해야 한다", () => {
    const dt = fromUTC("2025-03-10T10:00:00Z", "UTC");

    const plus1Day = dt.add(1, DATETIME_UNIT.DAY);
    const minus2Hours = dt.add(-2, DATETIME_UNIT.HOUR);

    expect(plus1Day.toISOString()).toBe("2025-03-11T10:00:00Z");
    expect(minus2Hours.toISOString()).toBe("2025-03-10T08:00:00Z");

    // 원본 불변
    expect(dt.toISOString()).toBe("2025-03-10T10:00:00Z");
  });
});

describe("DateTime - equality & ordering", () => {
  it("isEqual은 기본적으로 minute 단위로 같음을 비교해야 한다", () => {
    const a = fromUTC("2025-01-01T10:00:00Z", "UTC");
    const b = fromUTC("2025-01-01T10:00:30Z", "UTC"); // 같은 minute

    expect(a.isEqual(b)).toBe(true);

    const c = fromUTC("2025-01-01T10:06:00Z", "UTC");
    expect(a.isEqual(c)).toBe(false);
  });

  it("isEqual은 unit을 바꾸면 해당 단위 기준으로 비교해야 한다", () => {
    const a = fromUTC("2025-01-01T10:00:00Z", "UTC");
    const b = fromUTC("2025-01-01T10:59:00Z", "UTC");

    expect(a.isEqual(b, DATETIME_UNIT.HOUR)).toBe(true);

    const c = fromUTC("2025-01-01T11:00:00Z", "UTC");
    expect(a.isEqual(c, DATETIME_UNIT.HOUR)).toBe(false);
  });

  it("isBefore / isOnOrBefore / isAfter / isOnOrAfter는 BaseDate의 비교 기준과 동일하게 동작해야 한다", () => {
    const earlier = fromUTC("2025-01-01T10:00:00Z", "UTC");
    const same = fromUTC("2025-01-01T10:00:30Z", "UTC");
    const later = fromUTC("2025-01-01T10:06:00Z", "UTC");

    expect(earlier.isBefore(later)).toBe(true);
    expect(later.isBefore(earlier)).toBe(false);
    expect(earlier.isBefore(same)).toBe(false); // 같은 minute

    expect(earlier.isOnOrBefore(later)).toBe(true);
    expect(earlier.isOnOrBefore(same)).toBe(true);
    expect(later.isOnOrBefore(earlier)).toBe(false);

    expect(later.isAfter(earlier)).toBe(true);
    expect(earlier.isAfter(later)).toBe(false);
    expect(same.isAfter(earlier)).toBe(false);

    expect(later.isOnOrAfter(earlier)).toBe(true);
    expect(same.isOnOrAfter(earlier)).toBe(true);
    expect(earlier.isOnOrAfter(later)).toBe(false);
  });

  it("isToday는 view 기준으로 오늘 날짜인지 판별해야 한다", () => {
    const today = DateTime.now();
    expect(today.isToday()).toBe(true);

    const yesterday = today.add(-1, DATETIME_UNIT.DAY);
    expect(yesterday.isToday()).toBe(false);
  });
});

describe("DateTime - isBetween (overloads)", () => {
  it("isBetween(start, end)는 기본적으로 양 끝을 포함해야 한다", () => {
    const start = fromUTC("2025-01-01T00:00:00Z", "UTC");
    const end = fromUTC("2025-01-10T00:00:00Z", "UTC");

    const middle = fromUTC("2025-01-05T00:00:00Z", "UTC");
    const atStart = fromUTC("2025-01-01T00:00:00Z", "UTC");
    const atEnd = fromUTC("2025-01-10T00:00:00Z", "UTC");
    const before = fromUTC("2024-12-31T23:59:00Z", "UTC");
    const after = fromUTC("2025-01-10T00:06:00Z", "UTC");

    expect(middle.isBetween(start, end)).toBe(true);
    expect(atStart.isBetween(start, end)).toBe(true);
    expect(atEnd.isBetween(start, end)).toBe(true);

    expect(before.isBetween(start, end)).toBe(false);
    expect(after.isBetween(start, end)).toBe(false);
  });

  it("isBetween(start, end, false)는 양 끝을 제외해야 한다", () => {
    const start = fromUTC("2025-01-01T00:00:00Z", "UTC");
    const end = fromUTC("2025-01-10T00:00:00Z", "UTC");

    const middle = fromUTC("2025-01-05T00:00:00Z", "UTC");
    const atStart = fromUTC("2025-01-01T00:00:00Z", "UTC");
    const atEnd = fromUTC("2025-01-10T00:00:00Z", "UTC");

    expect(middle.isBetween(start, end, false)).toBe(true);
    expect(atStart.isBetween(start, end, false)).toBe(false);
    expect(atEnd.isBetween(start, end, false)).toBe(false);
  });

  it("isBetween(Duration) 오버로드도 동일하게 동작해야 한다", () => {
    const start = fromUTC("2025-01-01T00:00:00Z", "UTC");
    const end = fromUTC("2025-01-10T00:00:00Z", "UTC");
    const duration = new Duration(start, end);

    const middle = fromUTC("2025-01-05T00:00:00Z", "UTC");
    const atStart = fromUTC("2025-01-01T00:00:00Z", "UTC");
    const atEnd = fromUTC("2025-01-10T00:00:00Z", "UTC");

    expect(middle.isBetween(duration)).toBe(true);
    expect(atStart.isBetween(duration)).toBe(true);
    expect(atEnd.isBetween(duration)).toBe(true);

    expect(middle.isBetween(duration, false)).toBe(true);
    expect(atStart.isBetween(duration, false)).toBe(false);
    expect(atEnd.isBetween(duration, false)).toBe(false);
  });
});

describe("DateTime - startOf / endOf (day, week, month)", () => {
  it("startOf('day') / endOf('day')는 같은 날짜 내에서 00:00 / 23:55로 설정해야 한다", () => {
    const dt = fromUTC("2025-03-10T10:20:00Z", "UTC");

    const s = dt.startOf(DATETIME_UNIT.DAY);
    const e = dt.endOf(DATETIME_UNIT.DAY);

    expect(s.toISOString()).toBe("2025-03-10T00:00:00Z");
    expect(e.toISOString()).toBe("2025-03-10T23:55:00Z");
  });

  it("startOf('week', MON) 은 월요일 00:00, endOf('week', MON)은 일요일 23:55여야 한다", () => {
    // 2025-03-12 (수요일)
    const dt = fromUTC("2025-03-12T10:00:00Z", "UTC");

    const start = dt.startOf(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.MON);
    const end = dt.endOf(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.MON);

    expect(start.toISOString()).toBe("2025-03-10T00:00:00Z"); // 월요일
    expect(end.toISOString()).toBe("2025-03-16T23:55:00Z"); // 일요일
  });

  it("startOf('week', SUN)은 일요일 00:00, endOf('week', SUN)은 토요일 23:55여야 한다", () => {
    // 2025-03-12 (수요일)
    const dt = fromUTC("2025-03-12T10:00:00Z", "UTC");

    const start = dt.startOf(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.SUN);
    const end = dt.endOf(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.SUN);

    expect(start.toISOString()).toBe("2025-03-09T00:00:00Z"); // 일요일
    expect(end.toISOString()).toBe("2025-03-15T23:55:00Z"); // 토요일
  });

  it("startOf('month') / endOf('month')는 월의 첫날 / 마지막날을 기준으로 해야 한다", () => {
    const dt = fromUTC("2025-05-17T10:20:00Z", "UTC");

    const start = dt.startOf(DATETIME_UNIT.MONTH);
    const end = dt.endOf(DATETIME_UNIT.MONTH);

    expect(start.getDateOfMonth()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getDateOfMonth()).toBe(31);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(55);
  });
});

describe("DateTime - range(day/week/month)", () => {
  it("range('day')는 해당 날짜의 00:00~23:59 Duration을 반환해야 한다", () => {
    const dt = fromUTC("2025-03-10T10:00:00Z", "UTC");

    const duration = dt.range(DATETIME_UNIT.DAY);
    expect(duration.startDate.toISOString()).toBe("2025-03-10T00:00:00Z");
    expect(duration.endDate.toISOString()).toBe("2025-03-10T23:55:00Z");
  });

  it("range('week', MON)은 월~일 전체를 포함하는 Duration을 반환해야 한다", () => {
    const dt = fromUTC("2025-03-12T10:00:00Z", "UTC");

    const duration = dt.range(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.MON);

    expect(duration.startDate.toISOString()).toBe("2025-03-10T00:00:00Z");
    expect(duration.endDate.toISOString()).toBe("2025-03-16T23:55:00Z");
  });

  it("range('month', MON)은 해당 월을 모두 포함하는 week span Duration을 반환해야 한다", () => {
    const dt = fromUTC("2025-05-17T10:00:00Z", "UTC");

    const duration = dt.range(DATETIME_UNIT.MONTH, WEEK_STARTS_ON.MON);

    // 2025-05-01은 목요일 -> 월요일 시작 week span 이면 4월 말까지 포함될 수 있음
    // 여기서는 정확한 값보단 '시작 <= 5월1일 <= 종료 >= 5월31일' 을 검증
    const start = duration.startDate;
    const end = duration.endDate;

    const firstOfMonth = fromUTC("2025-05-01T00:00:00Z", "UTC");
    const lastOfMonth = fromUTC("2025-05-31T23:55:00Z", "UTC");

    expect(firstOfMonth.isOnOrAfter(start)).toBe(true);
    expect(lastOfMonth.isOnOrBefore(end)).toBe(true);
  });
});

describe("DateTime - format / toISOString", () => {
  it("format은 view 기준으로 dayjs.format 템플릿을 적용해야 한다", () => {
    const dt = fromUTC("2025-07-01T03:04:00Z", "UTC");

    expect(dt.format("YYYY-MM-DD")).toBe("2025-07-01");
    expect(dt.format("HH:mm")).toBe("03:00"); // 5분 단위 truncate
  });

  it("toISOString은 view 기준의 'YYYY-MM-DDTHH:mm:ssZ' 문자열을 반환해야 한다", () => {
    const dt = fromUTC("2025-12-03T09:08:00Z", "UTC");

    expect(dt.toISOString()).toBe("2025-12-03T09:05:00Z");
  });
});

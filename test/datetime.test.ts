// DateTime.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import dayjs from "../src/dayjs";
import {
  DateTime,
  UTC,
  DATETIME_UNIT,
  WEEK_STARTS_ON,
  truncateTime,
} from "../src/date";

const FIXED_LOCAL = new Date();

FIXED_LOCAL.setFullYear(2025);
FIXED_LOCAL.setMonth(11);
FIXED_LOCAL.setDate(31);
FIXED_LOCAL.setHours(21);
FIXED_LOCAL.setMinutes(0);
FIXED_LOCAL.setSeconds(0);
FIXED_LOCAL.setMilliseconds(0);

// 서울/프라하 타임존 상수
const SEOUL = "Asia/Seoul";
const PRAGUE = "Europe/Prague";

describe("truncateTime", () => {
  it("정확히 5분 배수일 때는 그대로 반환한다", () => {
    const fiveMin = 5 * 60 * 1000;
    expect(truncateTime(0)).toBe(0);
    expect(truncateTime(fiveMin)).toBe(fiveMin);
    expect(truncateTime(10 * fiveMin)).toBe(10 * fiveMin);
  });

  it("5분 배수가 아닐 때는 가장 가까운 아래 5분 배수로 내린다", () => {
    const fiveMin = 5 * 60 * 1000;

    expect(truncateTime(fiveMin + 1)).toBe(fiveMin);
    expect(truncateTime(fiveMin - 1)).toBe(0);

    const t = 13 * fiveMin + 1234;
    expect(truncateTime(t)).toBe(13 * fiveMin);
  });

  it("아주 큰 수에 대해서도 정상 동작한다", () => {
    const big = Number.MAX_SAFE_INTEGER;
    const result = truncateTime(big);
    // 몫이 정수 배수인지 확인
    expect(result % (5 * 60 * 1000)).toBe(0);
    // 내림이므로 원래 값보다 커지면 안 됨
    expect(result).toBeLessThanOrEqual(big);
  });
});

describe("UTC", () => {
  beforeAll(() => {
    // isToday 검증을 위해 시스템 시간을 고정
    vi.setSystemTime(FIXED_LOCAL);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("같은 ms로 생성한 두 UTC는 모든 단위에서 diff가 0이다", () => {
    const a = new UTC(FIXED_LOCAL.getTime());
    const b = new UTC(FIXED_LOCAL.getTime());

    expect(a.diff(b, DATETIME_UNIT.MINUTE)).toBe(0);
    expect(a.diff(b, DATETIME_UNIT.HOUR)).toBe(0);
    expect(a.diff(b, DATETIME_UNIT.DAY)).toBe(0);
    expect(a.isEqual(b, DATETIME_UNIT.MINUTE)).toBe(true);
  });

  it("분 단위 경계에서 isEqual / isBefore / isAfter 동작을 검증한다", () => {
    const base = new UTC(FIXED_LOCAL.getTime());
    const plus30s = new UTC(FIXED_LOCAL.getTime() + 30 * 1000);
    const plus1m = new UTC(FIXED_LOCAL.getTime() + 60 * 1000);

    // 같은 분이면 isEqual(minute)는 true
    expect(base.isEqual(plus30s, DATETIME_UNIT.MINUTE)).toBe(true);
    expect(base.isBefore(plus30s)).toBe(false);
    expect(base.isAfter(plus30s)).toBe(false);

    // 정확히 1분 차이
    expect(base.isEqual(plus1m, DATETIME_UNIT.MINUTE)).toBe(false);
    expect(base.isBefore(plus1m)).toBe(true);
    expect(base.isAfter(plus1m)).toBe(false);
    expect(base.isOnOrBefore(plus1m)).toBe(true);
    expect(plus1m.isOnOrAfter(base)).toBe(true);
  });

  it("isOnOrBefore / isOnOrAfter가 경계 포함 여부를 정확히 처리한다", () => {
    const base = new UTC(FIXED_LOCAL.getTime());
    const same = new UTC(FIXED_LOCAL.getTime());
    const later = new UTC(FIXED_LOCAL.getTime() + 5 * 60 * 1000);

    expect(base.isOnOrBefore(same)).toBe(true);
    expect(base.isOnOrAfter(same)).toBe(true);

    expect(base.isOnOrBefore(later)).toBe(true);
    expect(base.isOnOrAfter(later)).toBe(false);
  });

  it("isToday는 시스템 시간과 같은 날일 때만 true를 반환한다", () => {
    const todayUtc = new UTC(FIXED_LOCAL.getTime() + 3 * 60 * 60 * 1000); // 같은 날짜 안
    const yesterdayUtc = new UTC(FIXED_LOCAL.getTime() - 24 * 60 * 60 * 1000);

    expect(todayUtc.isToday()).toBe(true);
    expect(yesterdayUtc.isToday()).toBe(false);
  });
});

describe("DateTime - 타임존별 동작 (Asia/Seoul)", () => {
  beforeAll(() => {
    vi.setSystemTime(FIXED_LOCAL);
  });

  it("지정한 타임존을 사용해 생성된다", () => {
    const dt = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    expect(dt.tz).toBe(SEOUL);
  });

  it("timeZoneOffset이 서울(UTC+9)에서 540분인 것을 보장한다", () => {
    const dt = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    expect(dt.timezoneOffset).toBe(9 * 60);
  });

  it("getDayOfWeek / getDateOfMonth / getHours / getMinutes가 dayjs와 일치한다", () => {
    const view = dayjs(FIXED_LOCAL).tz(SEOUL);
    const dt = new DateTime(FIXED_LOCAL.getTime(), SEOUL);

    expect(dt.getDayOfWeek()).toBe(view.get(DATETIME_UNIT.DAY));
    expect(dt.getDateOfMonth()).toBe(view.get(DATETIME_UNIT.DATE));
    expect(dt.getHours()).toBe(view.get(DATETIME_UNIT.HOUR));
    expect(dt.getMinutes()).toBe(view.get(DATETIME_UNIT.MINUTE));
  });

  it("setTime은 시/분을 변경하고 같은 tz를 유지한다", () => {
    const dt = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const updated = dt.setTime(13, 37);

    expect(updated.tz).toBe(SEOUL);
    expect(updated.getHours()).toBe(13);
    expect(updated.getMinutes()).toBe(35);
  });

  it("add는 지정한 단위만큼 이동하며 tz를 유지한다", () => {
    const dt = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const added = dt.add(1, DATETIME_UNIT.DAY);

    expect(added.tz).toBe(SEOUL);
    expect(added.diff(dt, DATETIME_UNIT.DAY)).toBe(1);
  });

  it("isToday는 _view 기준 오늘 날짜인지 판단한다", () => {
    const today = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const tomorrow = today.add(1, DATETIME_UNIT.DAY);

    expect(today.isToday()).toBe(true);
    expect(tomorrow.isToday()).toBe(false);
  });
});

describe("DateTime - 타임존별 동작 (Europe/Prague)", () => {
  beforeAll(() => {
    vi.setSystemTime(FIXED_LOCAL);
  });

  it("지정한 타임존을 사용해 생성된다", () => {
    const dt = new DateTime(FIXED_LOCAL.getTime(), PRAGUE);
    expect(dt.tz).toBe(PRAGUE);
  });

  it("프라하의 timeZoneOffset은 CET/CEST 범위(60 또는 120분)에 있다", () => {
    const dt = new DateTime(FIXED_LOCAL.getTime(), PRAGUE);
    expect([60, 120]).toContain(dt.timezoneOffset);
  });

  it("get* 계열이 dayjs.tz(PRAGUE)와 일치한다", () => {
    const view = dayjs(FIXED_LOCAL).tz(PRAGUE);
    const dt = new DateTime(FIXED_LOCAL.getTime(), PRAGUE);

    expect(dt.getDayOfWeek()).toBe(view.get(DATETIME_UNIT.DAY));
    expect(dt.getDateOfMonth()).toBe(view.get(DATETIME_UNIT.DATE));
    expect(dt.getHours()).toBe(view.get(DATETIME_UNIT.HOUR));
    expect(dt.getMinutes()).toBe(view.get(DATETIME_UNIT.MINUTE));
  });

  it("DST가 있을 수 있는 타임존에서도 add가 UTC diff를 보존한다", () => {
    // 2024-06-01 00:00:00 UTC (프라하는 DST 가능 시기)
    const ms = Date.UTC(2024, 5, 1, 0, 0, 0, 0);
    const dt = new DateTime(ms, PRAGUE);
    const added = dt.add(1, DATETIME_UNIT.DAY);

    expect(added.diff(dt, DATETIME_UNIT.DAY)).toBe(1);
  });
});

describe("DateTime - 서울과 프라하 비교 (같은 UTC 인스턴스)", () => {
  it("같은 ms로 생성한 DateTime은 tz가 달라도 UTC diff는 0이다", () => {
    const seoul = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const prague = new DateTime(FIXED_LOCAL.getTime(), PRAGUE);

    expect(seoul.diff(prague, DATETIME_UNIT.MINUTE)).toBe(0);
    expect(seoul.isEqual(prague, DATETIME_UNIT.MINUTE)).toBe(true);
    expect(seoul.isBefore(prague)).toBe(false);
    expect(seoul.isAfter(prague)).toBe(false);
  });

  it("같은 UTC 시각이라도 getHours는 타임존에 따라 다르다", () => {
    const seoul = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const prague = new DateTime(FIXED_LOCAL.getTime(), PRAGUE);

    const offsetDiffInMinutes = seoul.timezoneOffset - prague.timezoneOffset;

    // (서울 시각 - 프라하 시각) * 60 ≒ 오프셋 차이
    const hourDiff = seoul.getHours() - prague.getHours();
    const approxOffsetDiff = hourDiff * 60;

    expect(
      Math.abs(approxOffsetDiff - offsetDiffInMinutes)
    ).toBeLessThanOrEqual(60); // DST나 일자 경계로 인해 ±1시간까지 허용
  });

  it("getTime()은 항상 같은 UTC ms를 반환해야 한다", () => {
    const seoul = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const prague = new DateTime(FIXED_LOCAL.getTime(), PRAGUE);

    expect(seoul.getTime()).toBe(prague.getTime());
  });

  it("서울과 프라하 서로 다른 시각에서 isBetween이 UTC 기준으로 동작한다 (포함)", () => {
    const baseUtc = FIXED_LOCAL;
    const seoul = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const pragueEarlier = new DateTime(
      FIXED_LOCAL.getTime() - 60 * 60 * 1000,
      PRAGUE
    ); // 1시간 전
    const pragueLater = new DateTime(
      FIXED_LOCAL.getTime() + 60 * 60 * 1000,
      PRAGUE
    ); // 1시간 후

    // 경계 포함
    expect(seoul.isBetween(pragueEarlier, pragueLater)).toBe(true);
    expect(pragueEarlier.isBetween(pragueEarlier, pragueLater)).toBe(true);
    expect(pragueLater.isBetween(pragueEarlier, pragueLater)).toBe(true);
  });

  it("서울과 프라하 서로 다른 시각에서 isBetween이 UTC 기준으로 동작한다 (배타)", () => {
    const baseUtc = FIXED_LOCAL;
    const seoul = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const pragueEarlier = new DateTime(
      FIXED_LOCAL.getTime() - 60 * 60 * 1000,
      PRAGUE
    );
    const pragueLater = new DateTime(
      FIXED_LOCAL.getTime() + 60 * 60 * 1000,
      PRAGUE
    );

    // 경계 제외
    expect(seoul.isBetween(pragueEarlier, pragueLater, false)).toBe(true);
    expect(pragueEarlier.isBetween(pragueEarlier, pragueLater, false)).toBe(
      false
    );
    expect(pragueLater.isBetween(pragueEarlier, pragueLater, false)).toBe(
      false
    );
  });
});

describe("DateTime - isBetween / 비교 로직 엣지 케이스", () => {
  const baseMs = FIXED_LOCAL;

  it("startDate > endDate일 때는 항상 false를 반환한다", () => {
    const center = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const start = new DateTime(FIXED_LOCAL.getTime() + 60 * 60 * 1000, SEOUL); // 1시간 후
    const end = new DateTime(FIXED_LOCAL.getTime() - 60 * 60 * 1000, SEOUL); // 1시간 전

    expect(center.isBetween(start, end)).toBe(false);
    expect(center.isBetween(start, end, false)).toBe(false);
  });

  it("동일 시각에서 includeBounds가 true/false일 때 차이를 보인다", () => {
    const a = new DateTime(FIXED_LOCAL.getTime(), SEOUL);
    const b = new DateTime(FIXED_LOCAL.getTime(), SEOUL);

    expect(a.isBetween(a, b)).toBe(true);
    expect(a.isBetween(a, b, true)).toBe(true);
    expect(a.isBetween(a, b, false)).toBe(false);
  });
});

describe("DateTime - startOf / endOf / range (서울/프라하 공통 속성 위주)", () => {
  const makeDt = (utcMs: number, tz: string) => new DateTime(utcMs, tz);

  it("DAY 기준 startOf / endOf는 00:00 ~ 23:59로 설정된다", () => {
    const seoul = makeDt(FIXED_LOCAL.getTime(), SEOUL);
    const start = seoul.startOf(DATETIME_UNIT.DAY);
    const end = seoul.endOf(DATETIME_UNIT.DAY);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(55);
  });

  it("WEEK 기준 (weekStartsOn=SUN) startOf / endOf 동작을 검증한다", () => {
    // 2024-01-03(수) UTC 기준
    const ms = Date.UTC(2024, 0, 3, 12, 0, 0, 0);
    const seoul = makeDt(ms, SEOUL);

    const start = seoul.startOf(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.SUN);
    const end = seoul.endOf(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.SUN);

    // 주 시작은 일요일(0), 끝은 토요일(6)
    expect(start.getDayOfWeek()).toBe(0);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getDayOfWeek()).toBe(6);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(55);
  });

  it("WEEK 기준 (weekStartsOn=MON) startOf / endOf 동작을 검증한다", () => {
    // 2024-01-03(수) UTC 기준
    const ms = Date.UTC(2024, 0, 3, 12, 0, 0, 0);
    const seoul = makeDt(FIXED_LOCAL.getTime(), SEOUL);

    const start = seoul.startOf(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.MON);
    const end = seoul.endOf(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.MON);

    // 주 시작은 월요일(1), 끝은 일요일(0)
    expect(start.getDayOfWeek()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getDayOfWeek()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(55);
  });

  it("MONTH range는 달력 그리드 전체(시작 주의 시작 ~ 끝 주의 끝)를 포함한다 (weekStartsOn=MON)", () => {
    // 2024-01-15 기준
    const ms = Date.UTC(2024, 0, 15, 12, 0, 0, 0);
    const seoul = makeDt(ms, SEOUL);

    const range: any = seoul.range(DATETIME_UNIT.MONTH, WEEK_STARTS_ON.MON);

    const start: DateTime = range.startDate;
    const end: DateTime = range.endDate;

    // 시작은 월요일이어야 함
    expect(start.getDayOfWeek()).toBe(1);
    // 끝은 일요일이어야 함
    expect(end.getDayOfWeek()).toBe(0);

    // start ~ end 사이에 해당 월(1월 1일~31일)이 포함되는지 간단 검증
    const firstOfMonth = seoul.startOf(DATETIME_UNIT.MONTH);
    const lastOfMonth = seoul.endOf(DATETIME_UNIT.MONTH);

    expect(firstOfMonth.isOnOrAfter(start)).toBe(true);
    expect(lastOfMonth.isOnOrBefore(end)).toBe(true);
  });

  it("DAY range는 해당 날짜의 startOf/day ~ endOf/day를 반환한다", () => {
    const ms = Date.UTC(2024, 2, 10, 15, 30, 0, 0);
    const seoul = makeDt(ms, SEOUL);

    const range: any = seoul.range(DATETIME_UNIT.DAY);

    const start: DateTime = range.startDate;
    const end: DateTime = range.endDate;

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(55);
  });
});

describe("DateTime - now / fromDate", () => {
  beforeAll(() => {
    vi.setSystemTime(FIXED_LOCAL);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("now는 현재 시간을 기준으로 DateTime을 생성한다 (타임존 명시)", () => {
    const dt = DateTime.now(SEOUL);
    const d = dayjs(FIXED_LOCAL).tz(SEOUL);

    expect(dt.tz).toBe(SEOUL);
    expect(dt.getTime()).toBe(d.valueOf());
  });

  it("fromDate는 주어진 Date의 ms를 그대로 사용한다", () => {
    const date = new Date(FIXED_LOCAL.getTime() + 123456);
    const dt = DateTime.fromDate(date, PRAGUE);

    expect(dt.getTime()).toBe(dayjs(dt.getTime()).tz(PRAGUE).valueOf());
    expect(dt.tz).toBe(PRAGUE);
  });
});

describe("DateTime - range", () => {
  beforeAll(() => {
    vi.setSystemTime(FIXED_LOCAL);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("range는 Duration을 생성한다.", () => {
    const date = new Date(FIXED_LOCAL.getTime());
    const dt = DateTime.fromDate(date);

    console.log(dt.range(DATETIME_UNIT.WEEK, WEEK_STARTS_ON.MON).toArray());
  });
});

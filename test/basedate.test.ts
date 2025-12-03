// BaseDate.test.ts
import { describe, it, expect, test, beforeAll, afterAll, vi } from "vitest";
import { BaseDate, DATETIME_UNIT, truncateTime } from "../src/date"; // 경로는 프로젝트에 맞게 수정
import dayjs from "dayjs";

// UTC 기준 BaseDate 생성 유틸 (테스트 가독성용)
const makeBaseDate = (
  year: number,
  month: number, // 1~12
  date: number,
  hour = 0,
  minute = 0,
  second = 0
) => {
  const ms = Date.UTC(year, month - 1, date, hour, minute, second);
  return { baseDate: new BaseDate(ms), ms };
};

describe("DateTime (Europe/Prague) - endOf/weekRange/monthMatrix (미구현)", () => {
  test.todo("endOf('date'|'month'|'year'|'week'): 경계 시각 반환");
  test.todo("weekRange(weekStartsOn): 속한 주 범위 반환");
  test.todo("monthMatrix(weekStartsOn): 달력 주차 매트릭스 반환");
});

describe("truncateTime", () => {
  it("5분 단위로 내림(truncate)되어야 한다", () => {
    const MINUTES = 60 * 1000;
    const fiveMinutes = 5 * MINUTES; // 300,000 ms
    const threeMinutes = 3 * MINUTES;
    const twoMinutes = 2 * MINUTES;
    const tenMinutes = 10 * MINUTES;
    const fifteenMinutes = 15 * MINUTES;

    expect(truncateTime(0)).toBe(0);
    expect(truncateTime(fiveMinutes - twoMinutes)).toBe(0);
    expect(truncateTime(fiveMinutes)).toBe(fiveMinutes);
    expect(truncateTime(fiveMinutes + twoMinutes)).toBe(fiveMinutes);

    expect(truncateTime(tenMinutes + threeMinutes)).toBe(tenMinutes);
    expect(truncateTime(tenMinutes + fiveMinutes)).toBe(fifteenMinutes);
    expect(truncateTime(fifteenMinutes + twoMinutes)).toBe(fifteenMinutes);
  });
});

describe("BaseDate - Asia/Seoul", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date());
    dayjs.tz.setDefault("Asia/Seoul");
  });
  afterAll(() => vi.useRealTimers());

  it("getTime은 생성시 전달한 ms를 그대로 반환해야 한다.", () => {
    const ms = Date.UTC(2025, 0, 2, 3, 4, 0); // 2025-01-02T03:04:00Z
    const d = new BaseDate(ms);
    expect(d.getTime()).toBe(ms);
  });

  it("diff는 지정한 단위 기준으로 두 날짜의 차이를 계산해야 한다 (day 단위)", () => {
    const { baseDate: d1 } = makeBaseDate(2025, 1, 1, 0, 0, 0);
    const { baseDate: d3 } = makeBaseDate(2025, 1, 21, 0, 0, 0);

    expect(d3.diff(d1, DATETIME_UNIT.DAY)).toBe(20);
    expect(d1.diff(d3, DATETIME_UNIT.DAY)).toBe(-20);
  });

  it("diff는 지정한 단위 기준으로 두 날짜의 차이를 계산해야 한다 (hour 단위)", () => {
    const { baseDate: d1 } = makeBaseDate(2025, 1, 1, 0, 0, 0);
    const { baseDate: d2 } = makeBaseDate(2025, 1, 1, 5, 0, 0);

    expect(d2.diff(d1, DATETIME_UNIT.HOUR)).toBe(5);
    expect(d1.diff(d2, DATETIME_UNIT.HOUR)).toBe(-5);
  });

  it("set은 지정한 단위의 값을 변경한 새로운 BaseDate를 반환해야 하며 원본은 불변이어야 한다", () => {
    const { baseDate: d } = makeBaseDate(2025, 1, 1, 10, 15, 0);

    const changedHour = d.set(0, DATETIME_UNIT.HOUR);

    expect(changedHour.get(DATETIME_UNIT.HOUR)).toBe(0);
    expect(changedHour.get(DATETIME_UNIT.MINUTE)).toBe(15);

    // 원본은 그대로
    expect(d.get(DATETIME_UNIT.HOUR)).toBe(10);
    expect(d.get(DATETIME_UNIT.MINUTE)).toBe(15);
  });

  it("get은 dayjs.get과 동일하게 동작해야 한다", () => {
    const { baseDate: d } = makeBaseDate(2025, 3, 15, 13, 45, 0);

    expect(d.get(DATETIME_UNIT.YEAR)).toBe(2025);
    // month는 0-based
    expect(d.get(DATETIME_UNIT.MONTH)).toBe(2); // 3월 -> 2
    expect(d.get(DATETIME_UNIT.HOUR)).toBe(13);
    expect(d.get(DATETIME_UNIT.MINUTE)).toBe(45);
  });

  it("get은 dayjs.get과 동일하게 동작해야 한다", () => {
    const { baseDate: d } = makeBaseDate(2025, 3, 15, 13, 45, 0);

    expect(d.get(DATETIME_UNIT.YEAR)).toBe(2025);
    // month는 0-based
    expect(d.get(DATETIME_UNIT.MONTH)).toBe(2); // 3월 -> 2
    expect(d.get(DATETIME_UNIT.HOUR)).toBe(13);
    expect(d.get(DATETIME_UNIT.MINUTE)).toBe(45);
  });

  it("add는 지정한 단위만큼 더한 새로운 BaseDate를 반환해야 하며 원본은 불변이어야 한다", () => {
    const { baseDate: d } = makeBaseDate(2025, 1, 1, 10, 0, 0);

    const plusOneDay = d.add(1, DATETIME_UNIT.DAY);
    const plusTwoHours = d.add(2, DATETIME_UNIT.HOUR);

    expect(plusOneDay.get(DATETIME_UNIT.DATE)).toBe(2);
    expect(plusOneDay.get(DATETIME_UNIT.HOUR)).toBe(10);

    expect(plusTwoHours.get(DATETIME_UNIT.DATE)).toBe(1);
    expect(plusTwoHours.get(DATETIME_UNIT.HOUR)).toBe(12);

    // 원본은 그대로
    expect(d.get(DATETIME_UNIT.DATE)).toBe(1);
    expect(d.get(DATETIME_UNIT.HOUR)).toBe(10);
  });

  it("isEqual은 기본적으로 minute 단위로 같음을 비교해야 한다", () => {
    const { baseDate: d1 } = makeBaseDate(2025, 1, 1, 10, 0, 0);
    const { baseDate: d2 } = makeBaseDate(2025, 1, 1, 10, 0, 30); // 30초 차이

    // minute 단위로는 동일
    expect(d1.isEqual(d2)).toBe(true);

    const { baseDate: d3 } = makeBaseDate(2025, 1, 1, 10, 1, 0);
    expect(d1.isEqual(d3)).toBe(false);
  });

  it("isEqual은 unit 인자를 변경하면 해당 단위 기준으로 비교해야 한다", () => {
    const { baseDate: d1 } = makeBaseDate(2025, 1, 1, 10, 0, 0);
    const { baseDate: d2 } = makeBaseDate(2025, 1, 1, 10, 59, 0);

    // hour 단위로는 동일
    expect(d1.isEqual(d2, DATETIME_UNIT.HOUR)).toBe(true);

    const { baseDate: d3 } = makeBaseDate(2025, 1, 1, 11, 0, 0);
    expect(d1.isEqual(d3, DATETIME_UNIT.HOUR)).toBe(false);
  });

  it("isBefore / isOnOrBefore는 minute 단위 비교 기준으로 동작해야 한다", () => {
    const { baseDate: earlier } = makeBaseDate(2025, 1, 1, 10, 0, 0);
    const { baseDate: later } = makeBaseDate(2025, 1, 1, 10, 1, 0);
    const { baseDate: same } = makeBaseDate(2025, 1, 1, 10, 0, 30); // 같은 minute

    // isBefore: 엄격히 이전일 때만 true
    expect(earlier.isBefore(later)).toBe(true);
    expect(later.isBefore(earlier)).toBe(false);
    expect(earlier.isBefore(same)).toBe(false); // 같은 minute 이므로 false

    // isOnOrBefore: 같거나 이전이면 true
    expect(earlier.isOnOrBefore(later)).toBe(true);
    expect(earlier.isOnOrBefore(same)).toBe(true); // 같은 minute
    expect(later.isOnOrBefore(earlier)).toBe(false);
  });

  it("isAfter / isOnOrAfter는 minute 단위 비교 기준으로 동작해야 한다", () => {
    const { baseDate: earlier } = makeBaseDate(2025, 1, 1, 10, 0, 0);
    const { baseDate: later } = makeBaseDate(2025, 1, 1, 10, 1, 0);
    const { baseDate: same } = makeBaseDate(2025, 1, 1, 10, 0, 30);

    expect(later.isAfter(earlier)).toBe(true);
    expect(earlier.isAfter(later)).toBe(false);
    expect(same.isAfter(earlier)).toBe(false); // 같은 minute

    expect(later.isOnOrAfter(earlier)).toBe(true);
    expect(same.isOnOrAfter(earlier)).toBe(true); // 같은 minute
    expect(earlier.isOnOrAfter(later)).toBe(false);
  });

  it("isToday는 오늘 날짜인 경우에만 true를 반환해야 한다", () => {
    const nowMs = Date.now();
    const today = new BaseDate(nowMs);
    expect(today.isToday()).toBe(true);

    const yesterdayMs = nowMs - 24 * 60 * 60 * 1000;
    const yesterday = new BaseDate(yesterdayMs);
    expect(yesterday.isToday()).toBe(false);
  });

  it("startOf는 지정한 단위의 시작 시점을 가지는 새로운 BaseDate를 반환해야 한다", () => {
    const { baseDate: d } = makeBaseDate(2025, 1, 2, 10, 20, 30);

    const startOfDay = d.startOf(DATETIME_UNIT.DAY);
    expect(startOfDay.get(DATETIME_UNIT.HOUR)).toBe(0);
    expect(startOfDay.get(DATETIME_UNIT.MINUTE)).toBe(0);

    // 원본 불변
    expect(d.get(DATETIME_UNIT.HOUR)).toBe(10);
    expect(d.get(DATETIME_UNIT.MINUTE)).toBe(20);
  });

  it("endOf는 지정한 단위의 마지막 시점을 가지는 새로운 BaseDate를 반환해야 한다", () => {
    const { baseDate: d } = makeBaseDate(2025, 1, 2, 10, 20, 30);

    const endOfDay = d.endOf(DATETIME_UNIT.DAY);
    expect(endOfDay.get(DATETIME_UNIT.HOUR)).toBe(23);
    expect(endOfDay.get(DATETIME_UNIT.MINUTE)).toBe(59);
  });

  it("format은 내부 dayjs.format을 래핑해 템플릿에 맞는 문자열을 반환해야 한다", () => {
    const { baseDate: d } = makeBaseDate(2025, 3, 15, 13, 45, 0);

    expect(d.format("YYYY-MM-DD")).toBe("2025-03-15");
    expect(d.format("HH:mm")).toBe("13:45");
  });

  it("toISOString은 'YYYY-MM-DDTHH:mm:ssZ' 형태의 UTC 문자열을 반환해야 한다", () => {
    const { baseDate: d } = makeBaseDate(2025, 12, 3, 9, 8, 7);
    // 초 단위는 버리고 분까지만 표현하므로 09:08:00Z가 된다
    // dayjs.format은 초를 반올림하거나 하지 않고 그대로 사용하므로
    // BaseDate 생성 시 second를 0으로 넣는 것이 안전하다.
    const { baseDate: d2 } = makeBaseDate(2025, 12, 3, 9, 8, 0);

    expect(d2.toISOString()).toBe("2025-12-03T09:08:00Z");
  });
});

describe("BaseDate - Global", () => {
  test.todo("dd");
});

describe("BaseDate", () => {});

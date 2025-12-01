import { BaseDate, DATETIME_UNIT, truncateTime } from "../src/date";
import { describe, expect, it } from "vitest"; // <-- **

const EPOCH = (iso: string) => new Date(iso).getTime();

describe("BaseDate - 생성자와 기본 getter", () => {
  it("UTC ms 입력을 정확히 분해해야 한다", () => {
    const b = new BaseDate(EPOCH("2025-09-22T04:30:00Z"));
    expect(b.year).toBe(2025);
    expect(b.month).toBe(8); // 0-based (September=8)
    expect(b.date).toBe(22);
    expect(b.hours).toBe(4);
    expect(b.minutes).toBe(30);
    expect(b.day).toBe(1); // Monday
  });

  it("toJSON(): 구조화된 객체를 반환한다", () => {
    const b = new BaseDate(EPOCH("2025-01-01T00:00:00Z"));
    expect(b.toJSON()).toEqual({
      year: 2025,
      month: 0,
      date: 1,
      hours: 0,
      minutes: 0,
    });
  });

  it("getTime(): epoch ms 반환", () => {
    const ms = EPOCH("2025-09-22T04:30:00Z");
    const b = new BaseDate(ms);
    expect(b.getTime()).toBe(ms);
  });
});

describe("BaseDate - diff()", () => {
  const a = new BaseDate(EPOCH("2025-01-01T00:00:00Z"));
  const b = new BaseDate(EPOCH("2026-03-01T00:00:00Z"));

  it("year 단위 차이", () => {
    expect(a.diff(b, DATETIME_UNIT.YEAR)).toBe(1);
    expect(b.diff(a, DATETIME_UNIT.YEAR)).toBe(-1);
  });

  it("month 단위 차이 (연도 경계 포함)", () => {
    expect(a.diff(b, DATETIME_UNIT.MONTH)).toBe(14);
  });

  it("date 단위 차이", () => {
    const c = new BaseDate(EPOCH("2025-01-10T00:00:00Z"));
    expect(a.diff(c, DATETIME_UNIT.DAYS)).toBe(9);
    expect(c.diff(a, DATETIME_UNIT.DAYS)).toBe(-9);
  });

  it("hours 단위 차이", () => {
    const c = new BaseDate(EPOCH("2025-01-01T12:00:00Z"));
    expect(a.diff(c, DATETIME_UNIT.HOURS)).toBe(12);
  });

  it("minutes 단위 차이", () => {
    const c = new BaseDate(EPOCH("2025-01-01T00:30:00Z"));
    expect(a.diff(c, DATETIME_UNIT.MINUTES)).toBe(30);
  });
});

describe("BaseDate - set()", () => {
  const base = new BaseDate(EPOCH("2025-09-22T04:30:00Z"));

  it("연도 변경", () => {
    const changed = base.set(2030, DATETIME_UNIT.YEAR);
    expect(changed.year).toBe(2030);
    expect(changed.month).toBe(base.month);
  });

  it("월 변경", () => {
    const changed = base.set(0, DATETIME_UNIT.MONTH); // January
    expect(changed.month).toBe(0);
  });

  it("일 변경", () => {
    const changed = base.set(1, DATETIME_UNIT.DAYS);
    expect(changed.date).toBe(1);
  });

  it("시간 변경", () => {
    const changed = base.set(12, DATETIME_UNIT.HOURS);
    expect(changed.hours).toBe(12);
  });

  it("분 변경", () => {
    const changed = base.set(59, DATETIME_UNIT.MINUTES);
    expect(changed.minutes).toBe(59);
  });

  it("범위 밖 값도 정상화 (date=0 → 전월 말일)", () => {
    const changed = base.set(0, DATETIME_UNIT.DAYS);
    expect(changed.date).toBeGreaterThan(27); // 전월 말일
  });

  it("범위 밖 값도 정상화 (hours=24 → 다음날 00:00)", () => {
    const changed = base.set(24, DATETIME_UNIT.HOURS);
    expect(changed.hours).toBe(0);
    expect(changed.date).toBe(23);
  });

  it("범위 밖 값도 정상화 (minutes=60 → +1시간)", () => {
    const changed = base.set(60, DATETIME_UNIT.MINUTES);
    expect(changed.minutes).toBe(0);
    expect(changed.hours).toBe(5);
  });
});

describe("BaseDate - add()", () => {
  const base = new BaseDate(EPOCH("2025-01-31T00:00:00Z"));

  it("분 단위 더하기", () => {
    const added = base.add(90, DATETIME_UNIT.MINUTES);
    expect(added.hours).toBe(1);
    expect(added.minutes).toBe(30);
  });

  it("시간 단위 더하기", () => {
    const added = base.add(25, DATETIME_UNIT.HOURS);
    expect(added.date).toBe(1); // 다음날
  });

  it("일 단위 더하기", () => {
    const added = base.add(2, DATETIME_UNIT.DAYS);
    expect(added.date).toBe(2); // 1월 31일 + 2일 = 2월 2일
  });

  it("월 단위 더하기: 말일 케이스", () => {
    const febAdded = base.add(1, DATETIME_UNIT.MONTH);
    expect(febAdded.month).toBe(1); // February
  });

  it("윤년 케이스: 2024-02-29에서 1일 추가 → 3월1일", () => {
    const leap = new BaseDate(EPOCH("2024-02-29T00:00:00Z"));
    const added = leap.add(1, DATETIME_UNIT.DAYS);
    expect(added.month).toBe(2); // March
    expect(added.date).toBe(1);
  });

  it("음수 값도 동작해야 한다", () => {
    const sub = base.add(-1, DATETIME_UNIT.DAYS);
    expect(sub.date).toBe(30); // Jan 30
  });
});

describe("BaseDate - 비교자", () => {
  const a = new BaseDate(EPOCH("2025-09-22T04:30:00Z"));
  const b = new BaseDate(EPOCH("2025-09-22T06:00:00Z"));
  const same = new BaseDate(EPOCH("2025-09-22T04:30:00Z"));

  it("isEqual", () => {
    expect(a.isEqual(same)).toBe(true);
    expect(a.isEqual(b)).toBe(false);
  });

  it("isBefore/isAfter", () => {
    expect(a.isBefore(b)).toBe(true);
    expect(b.isAfter(a)).toBe(true);
    expect(a.isBefore(same)).toBe(false);
    expect(a.isAfter(same)).toBe(false);
  });

  it("isOnOrBefore/isOnOrAfter", () => {
    expect(a.isOnOrBefore(same)).toBe(true);
    expect(a.isOnOrAfter(same)).toBe(true);
  });

  it("isSameMonth: 같은 월/다른 월", () => {
    expect(a.isSameMonth(same)).toBe(true);
    expect(a.isSameMonth(b)).toBe(true); // 같은 달
    const c = new BaseDate(EPOCH("2025-10-01T00:00:00Z"));
    expect(a.isSameMonth(c)).toBe(false);
  });
});

describe("BaseDate", () => {
  const now = new Date("2025-09-22T04:30:00Z");
  let time = truncateTime(now.getTime());
  const nextMinutes = new BaseDate(Date.UTC(2025, 8, 22, 4, 40)); // 10분 뒤
  const nextHours = new BaseDate(Date.UTC(2025, 8, 22, 6, 30)); // 2시간 뒤
  const nextDay = new BaseDate(Date.UTC(2025, 8, 23, 4, 30)); // 하루 뒤
  const nextMonth = new BaseDate(Date.UTC(2025, 9, 22, 4, 30)); // 한 달 뒤
  const nextYear = new BaseDate(Date.UTC(2026, 8, 22, 4, 30)); // 1년 뒤
  const base = new BaseDate(time);

  it("diff - year", () => {
    expect(base.diff(nextYear, DATETIME_UNIT.YEAR)).toBe(1);
  });

  it("diff - month", () => {
    expect(base.diff(nextMonth, DATETIME_UNIT.MONTH)).toBe(1);
  });

  it("diff - date", () => {
    expect(base.diff(nextDay, DATETIME_UNIT.DAYS)).toBe(1);
  });

  it("diff - hours", () => {
    expect(base.diff(nextDay, DATETIME_UNIT.HOURS)).toBe(24);
  });

  it("diff - minutes", () => {
    expect(base.diff(nextDay, DATETIME_UNIT.MINUTES)).toBe(24 * 60);
  });

  it("diff - hours", () => {
    expect(base.diff(nextHours, DATETIME_UNIT.HOURS)).toBe(2);
  });

  it("diff - minutes", () => {
    expect(base.diff(nextMinutes, DATETIME_UNIT.MINUTES)).toBe(10);
  });

  it("set - year", () => {
    const changed = base.set(2026, DATETIME_UNIT.YEAR);
    const diff = changed.toJSON();
    expect(diff.year).toBe(base.year + 1);
    expect(diff.month).toBe(base.month);
    expect(diff.date).toBe(base.date);
    expect(diff.hours).toBe(base.hours);
    expect(diff.minutes).toBe(base.minutes);
  });

  it("set - month", () => {
    const changed = base.set(5, DATETIME_UNIT.MONTH); // June
    const diff = changed.toJSON();
    expect(diff.year).toBe(base.year);
    expect(diff.month).toBe(base.month - 3);
    expect(diff.date).toBe(base.date);
    expect(diff.hours).toBe(base.hours);
    expect(diff.minutes).toBe(base.minutes);
  });

  it("add - date", () => {
    const added = base.add(1, DATETIME_UNIT.DAYS);
    expect(added.isEqual(nextDay)).toBe(true);
  });

  it("add - hours", () => {
    const added = base.add(2, DATETIME_UNIT.HOURS);
    expect(added.isEqual(nextHours)).toBe(true);
  });

  it("add - minutes", () => {
    const added = base.add(10, DATETIME_UNIT.MINUTES);
    expect(added.isEqual(nextMinutes)).toBe(true);
  });

  it("isEqual", () => {
    const same = new BaseDate(Date.UTC(2025, 8, 22, 4, 30));
    expect(base.isEqual(same)).toBe(true);
  });

  it("isBefore / isAfter", () => {
    expect(base.isBefore(nextDay)).toBe(true);
    expect(nextDay.isAfter(base)).toBe(true);
  });

  it("isOnOrBefore / isOnOrAfter", () => {
    const same = new BaseDate(Date.UTC(2025, 8, 22, 4, 40));
    expect(base.isOnOrBefore(same)).toBe(true);
    expect(base.isOnOrAfter(same)).toBe(false);
  });

  it("isSameMonth", () => {
    expect(base.isSameMonth(nextDay)).toBe(true);
    expect(base.isSameMonth(nextMonth)).toBe(false);
  });
});

describe("BaseDate Edge Cases", () => {
  const now = new Date("2025-09-22T04:30:00Z");
  const base = new BaseDate(now.getTime());

  it("isEqual should return true for the same instant", () => {
    const same = new BaseDate(new Date("2025-09-22T04:30:00Z").getTime());
    expect(base.isEqual(same)).toBe(true);
  });

  it("isBefore should return false for same instant", () => {
    const same = new BaseDate(new Date("2025-09-22T04:30:00Z").getTime());
    expect(base.isBefore(same)).toBe(false);
  });

  it("add date across month boundary", () => {
    const sept30 = new BaseDate(Date.UTC(2025, 8, 30, 4, 30)); // 9월 30일 04:30 UTC
    const added = sept30.add(1, DATETIME_UNIT.DAYS); // → 10월 1일
    expect(added.isEqual(new BaseDate(Date.UTC(2025, 9, 1, 4, 30)))).toBe(true);
  });

  it("set month to February on leap year", () => {
    const leap = new BaseDate(Date.UTC(2024, 1, 29, 4, 30)); // 2024-02-29
    const changed = leap.set(2, DATETIME_UNIT.MONTH); // 3월
    expect(changed.isEqual(new BaseDate(Date.UTC(2024, 2, 29, 4, 30)))).toBe(
      true
    );
  });

  it("set date beyond last day of month should auto adjust", () => {
    const jan31 = new BaseDate(Date.UTC(2025, 0, 31, 4, 30)); // 1월 31일
    const changed = jan31.set(32, DATETIME_UNIT.DAYS); // 없는 날짜 → 자동 2월 1일
    expect(changed.isEqual(new BaseDate(Date.UTC(2025, 1, 1, 4, 30)))).toBe(
      true
    );
  });

  it("add hours across day boundary", () => {
    const late = new BaseDate(Date.UTC(2025, 8, 22, 23, 30)); // 9월 22일 23:30
    const added = late.add(2, DATETIME_UNIT.HOURS); // 다음날 01:30
    expect(added.isEqual(new BaseDate(Date.UTC(2025, 8, 23, 1, 30)))).toBe(
      true
    );
  });

  it("isSameMonth should return false across year boundary", () => {
    const dec2025 = new BaseDate(Date.UTC(2025, 11, 31, 23, 59));
    const jan2026 = new BaseDate(Date.UTC(2026, 0, 1, 0, 0));
    expect(dec2025.isSameMonth(jan2026)).toBe(false);
  });

  it("diff in years should handle negative case", () => {
    const past = new BaseDate(Date.UTC(2020, 8, 22, 4, 30));
    expect(past.diff(base, DATETIME_UNIT.YEAR)).toBe(5);
    expect(base.diff(past, DATETIME_UNIT.YEAR)).toBe(-5); // 음수도 확인
  });

  it("add month should account for varying month length", () => {
    const jan31 = new BaseDate(Date.UTC(2025, 0, 31, 4, 30)); // 1월 31일
    const added = jan31.add(1, DATETIME_UNIT.MONTH); // 2월 말일 보정 필요
    // 여기서는 BaseDate.add가 단순히 일수 * 24시간 기준으로 동작하므로 Feb 28/29로 가지 않을 수 있음
    // → 구현 제한 사항 확인용
    expect(added.isEqual(new BaseDate(Date.UTC(2025, 1, 28, 4, 30)))).toBe(
      true
    );
  });
});

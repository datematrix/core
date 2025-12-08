import dayjs from "./dayjs";
import type { Dayjs } from "dayjs";

/**
 * DateTime에서 사용하는 시간 단위.
 */

export const DATETIME_UNIT = {
  MINUTE: "minute",
  HOUR: "hour",
  DATE: "date",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
} as const;

export type DateTimeUnit = (typeof DATETIME_UNIT)[keyof typeof DATETIME_UNIT];

export const WEEK_STARTS_ON = {
  SUN: 0,
  MON: 1,
} as const;

export type WeekStartsOnType =
  (typeof WEEK_STARTS_ON)[keyof typeof WEEK_STARTS_ON];

const TIME_UNIT = 5 * 60 * 1000; // 5분 단위로 시간 표현

export function truncateTime(time: number) {
  return time - (time % TIME_UNIT);
}

export class UTC {
  private readonly d: Dayjs;

  constructor(ms: number) {
    // ! milliseconds값은 로컬 기준으로 들어온다고 가정한다.
    this.d = dayjs(ms).utc();
  }

  getTime() {
    return this.d.valueOf();
  }

  /**
   * UTC 간의 차이를 계산하는 기능을 제공합니다.
   * @param datetime - 비교 대상이 될 UTC 객체
   * @param unit - 시간 단위
   */
  diff(utc: UTC, unit: Exclude<DateTimeUnit, "date"> = DATETIME_UNIT.DAY) {
    return this.d.diff(utc.d, unit);
  }

  /**
   * 두 UTC가 같은지 계산하는 기능을 제공합니다.
   * @param utc - 비교 대상이 될 UTC 객체
   * @param unit - 시간 단위
   */
  isEqual(
    utc: UTC,
    unit: Exclude<DateTimeUnit, "week" | "day"> = DATETIME_UNIT.MINUTE
  ): boolean {
    return this.d.isSame(utc.d, unit);
  }

  /**
   * UTC 인스턴스가 인자로 받은 UTC보다 이전에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 false를 반환합니다.
   * @param utc - 비교 대상이 될 UTC 객체
   */
  isBefore(utc: UTC): boolean {
    return this.d.isBefore(utc.d, DATETIME_UNIT.MINUTE);
  }

  /**
   * UTC 인스턴스가 인자로 받은 DateTime보다 이전에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 true를 반환합니다.
   * @param utc - 비교 대상이 될 UTC 객체
   */
  isOnOrBefore(utc: UTC) {
    return this.isEqual(utc) || this.isBefore(utc);
  }

  /**
   * UTC 인스턴스가 인자로 받은 DateTime보다 이후에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 false를 반환합니다.
   * @param utc - 비교 대상이 될 UTC 객체
   */
  isAfter(utc: UTC): boolean {
    return this.d.isAfter(utc.d, DATETIME_UNIT.MINUTE);
  }

  /**
   * UTC 인스턴스가 인자로 받은 UTC보다 이후에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 true를 반환합니다.
   * @param utc - 비교 대상이 될 UTC 객체
   */
  isOnOrAfter(utc: UTC): boolean {
    return this.isEqual(utc) || this.isAfter(utc);
  }

  /**
   * UTC 인스턴스가 오늘 날짜인지 계산하는 기능을 제공합니다.
   */
  isToday(): boolean {
    return this.d.isToday();
  }
}

export class DateTime {
  private readonly utc: UTC;
  private readonly _view: Dayjs;
  readonly tz: string;
  readonly timezoneOffset: number; // unit: minutes

  constructor(ms: number, tz?: string) {
    // ! milliseconds값은 로컬 기준으로 들어온다고 가정.
    this.tz = tz ?? dayjs.tz.guess();
    this.timezoneOffset = dayjs().tz(this.tz).utcOffset();
    const _ms = truncateTime(ms);
    this.utc = new UTC(_ms);
    this._view = dayjs(_ms).tz(this.tz);
  }

  static now(tz?: string) {
    const now = new Date();
    return new DateTime(now.getTime(), tz);
  }

  static fromDate(date: Date, tz?: string) {
    return new DateTime(date.getTime(), tz);
  }

  getDayOfWeek() {
    return this._view.get(DATETIME_UNIT.DAY);
  }

  getDateOfMonth() {
    return this._view.get(DATETIME_UNIT.DATE);
  }

  getHours() {
    return this._view.get(DATETIME_UNIT.HOUR);
  }

  getMinutes() {
    return this._view.get(DATETIME_UNIT.MINUTE);
  }

  getTime() {
    return this._view.valueOf();
  }

  /**
   * DateTime 간의 차이를 계산하는 기능을 제공합니다. 인자로 받은 날짜가 크다면 음수를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   * @param unit - 시간 단위
   */
  diff(
    datetime: DateTime,
    unit: Exclude<DateTimeUnit, "date" | "week"> = DATETIME_UNIT.DAY
  ): number {
    if (unit === DATETIME_UNIT.DAY) {
      const hours = this._view.diff(datetime._view, DATETIME_UNIT.HOUR);
      return Math.ceil(hours / 24);
    }

    if (unit === DATETIME_UNIT.MONTH) {
      const days = this.diff(datetime, DATETIME_UNIT.DAY);
      if (Math.abs(days) < 31) {
        const monthA = this._view.get(DATETIME_UNIT.MONTH);
        const monthB = datetime._view.get(DATETIME_UNIT.MONTH);
        return monthA - monthB;
      }
    }

    if (unit === DATETIME_UNIT.YEAR) {
      const months = this.diff(datetime, DATETIME_UNIT.MONTH);
      if (Math.abs(months) < 12) {
        const yearA = this._view.get(DATETIME_UNIT.YEAR);
        const yearB = datetime._view.get(DATETIME_UNIT.YEAR);
        return yearA - yearB;
      }
    }

    return this._view.diff(datetime._view, unit);
  }

  /**
   * DateTime 객체의 시(hours)와 분(minute)을 변경하여 새로운 DateTime을 반환합니다.
   * @param hours - 시간
   * @param minutes - 분
   */
  setTime(hours: number, minutes: number): DateTime {
    const newView = this._view
      .set(DATETIME_UNIT.HOUR, hours)
      .set(DATETIME_UNIT.MINUTE, minutes);

    return new DateTime(newView.valueOf(), this.tz);
  }

  /**
   * DateTime 객체의 값을 변경하여 새로운 DateTime을 반환하는 기능을 제공합니다.
   * @param value - 변경하고 싶은 정도
   * @param unit - 변경하려는 시간 단위
   */
  add(value: number, unit: Exclude<DateTimeUnit, "date">): DateTime {
    const newView = this._view.add(value, unit);
    return new DateTime(newView.valueOf(), this.tz);
  }

  /**
   * DateTime 인스턴스가 오늘 날짜인지 계산하는 기능을 제공합니다.
   */
  isToday(): boolean {
    return this._view.isToday();
  }

  /**
   * 두 DateTime가 같은지 계산하는 기능을 제공합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isEqual(
    datetime: DateTime,
    unit: Exclude<DateTimeUnit, "week" | "day"> = DATETIME_UNIT.MINUTE
  ): boolean {
    return this.utc.isEqual(datetime.utc, unit);
  }

  /**
   * DateTime 인스턴스가 인자로 받은 DateTime보다 이전에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 false를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isBefore(datetime: DateTime): boolean {
    return this.utc.isBefore(datetime.utc);
  }

  /**
   * DateTime 인스턴스가 인자로 받은 DateTime보다 이전에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 true를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isOnOrBefore(datetime: DateTime) {
    return this.utc.isOnOrBefore(datetime.utc);
  }

  /**
   * DateTime 인스턴스가 인자로 받은 DateTime보다 이후에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 false를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isAfter(datetime: DateTime): boolean {
    return this.utc.isAfter(datetime.utc);
  }

  /**
   * DateTime 인스턴스가 인자로 받은 DateTime보다 이후에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 true를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isOnOrAfter(datetime: DateTime): boolean {
    return this.utc.isOnOrAfter(datetime.utc);
  }

  /**
   * DateTime 인스턴스가 특정 구간 사이에 있는 날짜인지 계산하는 기능을 제공합니다.
   * @param {Duration} range - 특정 구간
   * @param {boolean} [includeBounds] - 구간의 시작과 끝 날짜와 일치하는 경우 포함할지 여부. false인 경우, 구간의 시작과 끝 날짜와 일치하는 경우는 포함하지 않습니다.
   */
  isBetween(range: Duration, includeBounds?: boolean): boolean;
  /**
   * DateTime 인스턴스가 특정 구간 사이에 있는 날짜인지 계산하는 기능을 제공합니다.
   * @param {DateTime} startDate - 시작 날짜
   * @param {DateTime} endDate - 마지막 날짜
   * @param {boolean} [includeBounds] - 시작 날짜 혹은 마지막 날짜와 일치하는 경우 포함할지 여부. false인 경우, 시작 날짜 혹은 마지막 날짜와 일치하는 경우는 포함하지 않습니다.
   */
  isBetween(
    startDate: DateTime,
    endDate: DateTime,
    includeBounds?: boolean
  ): boolean;
  /**
   * DateTime 인스턴스가 특정 구간 사이에 있는 날짜인지 계산하는 기능을 제공합니다.
   */
  isBetween(
    startDateOrRange: DateTime | Duration,
    endDateOrIncludeBounds?: DateTime | boolean,
    includeBounds: boolean = true
  ): boolean {
    let startDate: DateTime | null = null;
    let endDate: DateTime | null = null;
    let _includeBounds: boolean = true;

    if (startDateOrRange instanceof Duration) {
      startDate = startDateOrRange.startDate;
      endDate = startDateOrRange.endDate;
      _includeBounds = (endDateOrIncludeBounds as boolean | undefined) ?? true;
    } else {
      startDate = startDateOrRange as DateTime;
      endDate = endDateOrIncludeBounds as DateTime;
      _includeBounds = includeBounds;
    }

    if (_includeBounds) {
      return this.isOnOrAfter(startDate) && this.isOnOrBefore(endDate);
    }
    return this.isAfter(startDate) && this.isBefore(endDate);
  }

  startOf(
    unit: Exclude<DateTimeUnit, "week" | "hour" | "minute" | "date">
  ): DateTime;
  startOf(
    unit: Extract<DateTimeUnit, "week">,
    weekStartsOn: WeekStartsOnType
  ): DateTime;
  startOf(
    unit: Exclude<DateTimeUnit, "date" | "hour" | "minute">,
    weekStartsOn?: WeekStartsOnType
  ): DateTime {
    if (unit === DATETIME_UNIT.DAY) {
      return this.setTime(0, 0);
    }

    if (unit === DATETIME_UNIT.WEEK) {
      let dayOfWeek = this.getDayOfWeek();
      if (weekStartsOn === dayOfWeek) {
        return this.setTime(0, 0);
      }
      if (weekStartsOn === WEEK_STARTS_ON.MON) {
        dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return this.add(-dayOfWeek, DATETIME_UNIT.DAY).setTime(0, 0);
      }
      if (weekStartsOn === WEEK_STARTS_ON.SUN) {
        return this.add(-dayOfWeek, DATETIME_UNIT.DAY).setTime(0, 0);
      }
      throw Error("Not Implemented");
    }

    const d = this._view.startOf(unit);

    return new DateTime(d.valueOf(), this.tz);
  }

  endOf(
    unit: Exclude<DateTimeUnit, "week" | "hour" | "minute" | "date">
  ): DateTime;
  endOf(
    unit: Extract<DateTimeUnit, "week">,
    weekStartsOn: WeekStartsOnType
  ): DateTime;
  endOf(
    unit: Exclude<DateTimeUnit, "date" | "hour" | "minute">,
    weekStartsOn?: WeekStartsOnType
  ) {
    if (unit === DATETIME_UNIT.DAY) {
      return this.setTime(23, 59);
    }

    if (unit === DATETIME_UNIT.WEEK) {
      let dayOfWeek = this.getDayOfWeek();

      if (weekStartsOn === WEEK_STARTS_ON.MON) {
        if (dayOfWeek === WEEK_STARTS_ON.SUN) {
          return this.setTime(23, 59);
        }
        dayOfWeek = 7 - dayOfWeek;
        return this.add(dayOfWeek, DATETIME_UNIT.DAY).setTime(23, 59);
      }
      if (weekStartsOn === WEEK_STARTS_ON.SUN) {
        dayOfWeek = 6 - dayOfWeek;
        return this.add(dayOfWeek, DATETIME_UNIT.DAY).setTime(23, 59);
      }
      throw Error("Not Implemented");
    }

    const d = this._view.endOf(unit);

    return new DateTime(d.valueOf(), this.tz);
  }

  range(unit: typeof DATETIME_UNIT.DAY): Duration;
  range(
    unit: typeof DATETIME_UNIT.WEEK,
    weekStartsOn: WeekStartsOnType
  ): Duration;
  range(
    unit: typeof DATETIME_UNIT.MONTH,
    weekStartsOn: WeekStartsOnType
  ): Duration;
  range(
    unit:
      | typeof DATETIME_UNIT.DAY
      | typeof DATETIME_UNIT.WEEK
      | typeof DATETIME_UNIT.MONTH,
    weekStartsOn?: WeekStartsOnType
  ): Duration {
    if (unit === DATETIME_UNIT.DAY) {
      const startDate = this.startOf(unit);
      const endDate = this.endOf(unit);

      return new Duration(startDate, endDate);
    }

    if (weekStartsOn === undefined) throw Error("Not Implemented");

    if (unit === DATETIME_UNIT.WEEK) {
      const startOfWeek = this.startOf(DATETIME_UNIT.WEEK, weekStartsOn);
      const endOfWeek = this.endOf(DATETIME_UNIT.WEEK, weekStartsOn);

      return new Duration(startOfWeek, endOfWeek);
    }

    const startOfMonth = this.startOf(DATETIME_UNIT.MONTH).startOf(
      DATETIME_UNIT.WEEK,
      weekStartsOn
    );
    const endOfMonth = this.endOf(DATETIME_UNIT.MONTH).endOf(
      DATETIME_UNIT.WEEK,
      weekStartsOn
    );

    return new Duration(startOfMonth, endOfMonth);
  }

  toISOString() {
    return this._view.toISOString();
  }

  format(template: string) {
    return this._view.format(template);
  }
}

export class Duration {
  private _start: DateTime;
  private _end: DateTime;

  /**
   *
   * @param start - 구간의 시작을 나타내는 DateTime 객체
   * @param end - 구간의 마지막을 나타내는 DateTime 객체
   */
  constructor(start: DateTime, end: DateTime) {
    if (start.isAfter(end)) {
      throw Error("End date must be after start date");
    }
    this._start = start;
    this._end = end;
  }

  /**
   * 구간의 시작
   */
  get startDate() {
    return this._start;
  }

  /**
   * 구간의 끝
   */
  get endDate() {
    return this._end;
  }

  /**
   * 구간 사이의 모든 날짜를 DateTime Array로 반환한다.
   */
  toArray(): DateTime[] {
    const diff = this._end.diff(this._start, DATETIME_UNIT.DAY);
    return Array.from({ length: diff + 1 }, (_, i) =>
      this._start.add(i, DATETIME_UNIT.DAY)
    );
  }

  /**
   * 구간 사이의 모든 Week를 DateTimeRange Array로 반환한다.
   */
  toMatrix(): Duration[] {
    const dayOfWeek = this._start.getDayOfWeek() as WeekStartsOnType;
    let date = this._start;
    return Array.from({ length: 6 }, () => {
      const week = date.range(DATETIME_UNIT.WEEK, dayOfWeek);
      date = date.add(1, DATETIME_UNIT.WEEK);
      return week;
    });
  }

  /**
   * 두 DateTimeRange가 겹치는지 계산하는 기능을 제공합니다.
   * @param range - 특정 구간
   * @param includeBounds - 구간의 시작과 끝 날짜와 일치하는 경우 포함할지 여부. false인 경우, 구간의 시작과 끝 날짜와 일치하는 경우는 포함하지 않습니다.
   */
  isOverlap(range: Duration, includeBounds: boolean = false): boolean {
    const partially =
      this._start.isBetween(range, includeBounds) ||
      this._end.isBetween(range, includeBounds);
    if (partially) return true;

    if (includeBounds) {
      return (
        (this._start.isOnOrBefore(range.startDate) &&
          this._end.isOnOrAfter(range.endDate)) ||
        (this._start.isOnOrAfter(range.startDate) &&
          this._end.isOnOrBefore(range.endDate))
      );
    }
    return (
      (this._start.isBefore(range.startDate) &&
        this._end.isAfter(range.endDate)) ||
      (this._start.isAfter(range.startDate) &&
        this._end.isBefore(range.endDate))
    );
  }
}

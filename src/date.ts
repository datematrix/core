/**
 * DateTime에서 사용하는 시간 단위.
 */

export const DATETIME_UNIT = {
  MINUTES: "minutes",
  HOURS: "hours",
  DAYS: "days",
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

const isoUtcRegex =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d{3})?Z$/;

export function truncateTime(time: number) {
  return time - (time % TIME_UNIT);
}

function validateISO(iso: string): [number, number, number, number, number] {
  const match = isoUtcRegex.exec(iso);
  if (match === null) throw Error("Invalid ISO String.");

  const [_, year, month, date, hours, minutes, __, ___, ____] = match;
  return [+year!, +month! - 1, +date!, +hours!, +minutes!];
}

/**
 * dayjs와 Built-in Date 객체를 Wrapping한 클래스
 */
export class BaseDate {
  /**
   * Milliseconds since epoch
   */
  private readonly _ms: number;
  readonly year: number;
  readonly month: number;
  readonly date: number;
  readonly hours: number;
  readonly minutes: number;
  readonly day: number;

  constructor(ms: number) {
    // ! milliseconds값이 UTC 기준으로 들어온다고 가정한다.
    this._ms = ms;
    const date = new Date(ms);
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth();
    this.date = date.getUTCDate();
    this.hours = date.getUTCHours();
    this.minutes = date.getUTCMinutes();
    this.day = date.getUTCDay();
  }

  toJSON() {
    return {
      year: this.year,
      month: this.month,
      date: this.date,
      hours: this.hours,
      minutes: this.minutes,
    };
  }

  getTime() {
    return this._ms;
  }

  /**
   * BaseDate 간의 차이를 계산하는 기능을 제공합니다.
   * @param datetime - 비교 대상이 될 BaseDate 객체
   * @param unit - 시간 단위
   */
  diff(datetime: BaseDate, unit: Exclude<DateTimeUnit, "week">): number {
    if (unit === DATETIME_UNIT.YEAR) {
      return datetime.year - this.year;
    }

    if (unit === DATETIME_UNIT.MONTH) {
      const yearDiff = this.year - datetime.year;
      return datetime.month - (12 * yearDiff + this.month);
    }

    if (unit === DATETIME_UNIT.DAYS) {
      return Math.floor((datetime._ms - this._ms) / (24 * 60 * 60 * 1000));
    }

    if (unit === DATETIME_UNIT.HOURS) {
      return Math.floor((datetime._ms - this._ms) / (60 * 60 * 1000));
    }

    if (unit === DATETIME_UNIT.MINUTES) {
      return Math.floor((datetime._ms - this._ms) / (60 * 1000));
    }

    throw Error("NotImplemented");
  }

  /**
   * BaseDate 객체의 시간 값을 변경하여 새로운 BaseDate 객체를 반환하는 기능을 제공합니다.
   * @param value - 변경하고 싶은 정도
   * @param unit - 변경하려는 시간 단위
   * @returns
   */
  set(value: number, unit: Exclude<DateTimeUnit, "week">): BaseDate {
    let utc = 0;
    switch (unit) {
      case DATETIME_UNIT.YEAR:
        utc = Date.UTC(value, this.month, this.date, this.hours, this.minutes);
        break;

      case DATETIME_UNIT.MONTH:
        utc = Date.UTC(this.year, value, this.date, this.hours, this.minutes);
        break;

      case DATETIME_UNIT.DAYS:
        utc = Date.UTC(this.year, this.month, value, this.hours, this.minutes);
        break;

      case DATETIME_UNIT.HOURS:
        utc = Date.UTC(this.year, this.month, this.date, value, this.minutes);
        break;

      case DATETIME_UNIT.MINUTES:
        utc = Date.UTC(this.year, this.month, this.date, this.hours, value);
        break;

      default:
        utc = Date.UTC(
          this.year,
          this.month,
          this.date,
          this.hours,
          this.minutes
        );
        break;
    }

    return new BaseDate(utc);
  }

  /**
   * BaseDate 객체의 값을 변경하여 새로운 BaseDate 객체 반환하는 기능을 제공합니다.
   * @param value - 변경하고 싶은 정도
   * @param unit - 변경하려는 시간 단위
   */
  add(value: number, unit: DateTimeUnit): BaseDate {
    const MINUTES = 60 * 1000;
    if (unit === DATETIME_UNIT.MINUTES) {
      return new BaseDate(this._ms + value * MINUTES);
    }

    const HOURS = 60 * MINUTES;
    if (unit === DATETIME_UNIT.HOURS) {
      return new BaseDate(this._ms + value * HOURS);
    }

    const DATE = 24 * HOURS;
    if (unit === DATETIME_UNIT.DAYS) {
      return new BaseDate(this._ms + value * DATE);
    }

    const WEEK = 7 * DATE;
    if (unit === DATETIME_UNIT.WEEK) {
      return new BaseDate(this._ms + value * WEEK);
    }

    const lastDayOfNextMonth = new Date(
      Date.UTC(this.year, this.month + 2, 0)
    ).getUTCDate();
    const lastDayOfMonth = new Date(
      Date.UTC(this.year, this.month + 1, 0)
    ).getUTCDate();

    let factor = 1;

    if (this.date > lastDayOfNextMonth) {
      factor = lastDayOfMonth - this.date + lastDayOfNextMonth;
    } else {
      factor = lastDayOfMonth;
    }

    const MONTH = factor * DATE;
    if (unit === DATETIME_UNIT.MONTH) {
      return new BaseDate(this._ms + value * MONTH);
    }

    throw Error("NotImplemented");

    const YEAR = 1 * DATE;
    return new BaseDate(this._ms + value * YEAR);
  }

  /**
   * 두 BaseDate가 같은지 계산하는 기능을 제공합니다.
   * @param datetime - 비교 대상이 될 UTCBaseDate 객체
   */
  isEqual(datetime: BaseDate): boolean {
    return this._ms === datetime._ms;
  }

  /**
   * BaseDate 인스턴스가 인자로 받은 DateTime보다 이전에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 false를 반환합니다.
   * @param datetime - 비교 대상이 될 BaseDate 객체
   */
  isBefore(datetime: BaseDate): boolean {
    return this._ms < datetime._ms;
  }

  /**
   * BaseDate 인스턴스가 인자로 받은 DateTime보다 이전에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 true를 반환합니다.
   * @param datetime - 비교 대상이 될 BaseDate 객체
   */
  isOnOrBefore(datetime: BaseDate) {
    return this.isEqual(datetime) || this.isBefore(datetime);
  }

  /**
   * BaseDate 인스턴스가 인자로 받은 DateTime보다 이후에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 false를 반환합니다.
   * @param datetime - 비교 대상이 될 BaseDate 객체
   */
  isAfter(datetime: BaseDate): boolean {
    return this._ms > datetime._ms;
  }

  /**
   * BaseDate 인스턴스가 인자로 받은 BaseDate보다 이후에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 true를 반환합니다.
   * @param datetime - 비교 대상이 될 BaseDate 객체
   */
  isOnOrAfter(datetime: BaseDate): boolean {
    return this.isEqual(datetime) || this.isAfter(datetime);
  }

  /**
   * BaseDate 인스턴스가 인자로 받은 BaseDate과 같은 연월인지 계산하는 기능을 제공합니다.
   * @param datetime - 비교 대상이 될 BaseDate 객체
   */
  isSameMonth(datetime: BaseDate): boolean {
    return this.year === datetime.year && this.month === datetime.month;
  }
}

export class DateTime {
  private readonly _base: BaseDate;
  private readonly _view: BaseDate;
  private readonly _tz: string;
  private readonly _tzOffset: number;

  constructor(msOrDate: number | BaseDate, tz?: string) {
    let ms = 0;
    if (typeof msOrDate === "number") {
      ms = truncateTime(msOrDate);
      this._base = new BaseDate(ms);
    } else if (msOrDate instanceof BaseDate) {
      this._base = msOrDate;
      ms = msOrDate.getTime();
    } else {
      throw Error("Not Implemented");
    }
    const resolvedDateTimeFormatOptions =
      new Intl.DateTimeFormat().resolvedOptions();

    // this._locale = resolvedDateTimeFormatOptions.locale;
    this._tz = tz ?? resolvedDateTimeFormatOptions.timeZone;

    this._tzOffset = DateTime.getTimezoneOffset(tz);
    this._view = new BaseDate(ms + this._tzOffset * 60 * 60 * 1000);
  }

  static getTimezoneOffset(timeZone?: string) {
    const formattedDate = new Intl.DateTimeFormat("sv-SE", {
      timeZoneName: "shortOffset",
      timeZone,
    }).format(new Date());

    return +formattedDate.split("GMT")[1]!;
  }

  static fromUTC(utcString: string, tz?: string): DateTime {
    const [year, month, date, hours, minutes] = validateISO(utcString);
    const epochMs = Date.UTC(year, month, date, hours, minutes);
    return new DateTime(epochMs, tz);
  }

  static fromTZ(tzTime: number | BaseDate, tz?: string): DateTime {
    const timeZoneOffset = DateTime.getTimezoneOffset(tz);
    if (typeof tzTime === "number") {
      const newBase = tzTime - timeZoneOffset * 60 * 60 * 1000;
      return new DateTime(newBase, tz);
    }

    if (tzTime instanceof BaseDate) {
      const newBase = tzTime.add(-timeZoneOffset, DATETIME_UNIT.HOURS);
      return new DateTime(newBase, tz);
    }

    throw Error("NotImplemented");
  }

  static now(tz?: string): DateTime {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    return new DateTime(utc, tz);
  }

  /**
   * 요일을 반환합니다. 0은 일요일, 6은 토요일입니다.
   */
  getDayOfWeek() {
    return this._view.day;
  }

  /**
   * 시(hour)를 반환합니다. 0~23를 반환합니다.
   */
  getHours() {
    return this._view.hours;
  }

  /**
   * 분(minute)를 반환합니다. 0~59를 반환합니다.
   */
  getMinutes() {
    return this._view.minutes;
  }

  /**
   * 월(Month)의 일을 반환합니다.
   */
  getDateOfMonth() {
    return this._view.date;
  }

  getTime() {
    return this._view.getTime();
  }

  /**
   * DateTime 객체를 ISO8601 문자열로 변경하는 기능을 제공합니다.
   */
  format(includeTime: boolean = false): string {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "short",
      timeStyle: includeTime ? "medium" : undefined,
      timeZone: "UTC",
    }).format(this._view.getTime());
  }

  /**
   * DateTime 간의 차이를 계산하는 기능을 제공합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   * @param unit - 시간 단위
   */
  diff(
    datetime: DateTime,
    unit: Exclude<DateTimeUnit, "week"> = DATETIME_UNIT.DAYS
  ): number {
    return this._base.diff(datetime._base, unit);
  }

  /**
   * DateTime 객체의 시(hours)와 분(minute)을 변경하여 새로운 DateTime을 반환합니다.
   * @param hours - 시간
   * @param minutes - 분
   */
  setTime(hours: number, minutes: number): DateTime {
    const newBase = this._view
      .set(hours, DATETIME_UNIT.HOURS)
      .set(minutes, DATETIME_UNIT.MINUTES);
    return DateTime.fromTZ(newBase, this._tz);
  }

  /**
   * DateTime 객체의 값을 변경하여 새로운 DateTime을 반환하는 기능을 제공합니다.
   * @param value - 변경하고 싶은 정도
   * @param unit - 변경하려는 시간 단위
   */
  add(value: number, unit: DateTimeUnit): DateTime {
    const newBase = this._base.add(value, unit);
    return new DateTime(newBase, this._tz);
  }

  /**
   * DateTime 인스턴스가 오늘 날짜인지 계산하는 기능을 제공합니다.
   */
  isToday(): boolean {
    const now = DateTime.now();
    const time = now.getTime();
    const nowISO = new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "short",
      timeZone: this._tz,
    }).format(time);
    const baseISO = this.format();
    return baseISO === nowISO;
  }

  /**
   * 두 DateTime가 같은지 계산하는 기능을 제공합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isEqual(datetime: DateTime): boolean {
    return this._base.isEqual(datetime._base);
  }

  /**
   * DateTime 인스턴스가 인자로 받은 DateTime보다 이전에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 false를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isBefore(datetime: DateTime): boolean {
    return this._base.isBefore(datetime._base);
  }

  /**
   * DateTime 인스턴스가 인자로 받은 DateTime보다 이전에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 true를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isOnOrBefore(datetime: DateTime) {
    return this._base.isOnOrBefore(datetime._base);
  }

  /**
   * DateTime 인스턴스가 인자로 받은 DateTime보다 이후에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 false를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isAfter(datetime: DateTime): boolean {
    return this._base.isAfter(datetime._base);
  }

  /**
   * DateTime 인스턴스가 인자로 받은 DateTime보다 이후에 있는 날짜인지 계산하는 기능을 제공합니다. 같은 날짜인 경우 true를 반환합니다.
   * @param datetime - 비교 대상이 될 DateTime 객체
   */
  isOnOrAfter(datetime: DateTime): boolean {
    return this._base.isOnOrAfter(datetime._base);
  }

  /**
   * DateTime 인스턴스가 특정 구간 사이에 있는 날짜인지 계산하는 기능을 제공합니다.
   * @param {DateTimeRange} range - 특정 구간
   * @param {boolean} [includeBounds] - 구간의 시작과 끝 날짜와 일치하는 경우 포함할지 여부. false인 경우, 구간의 시작과 끝 날짜와 일치하는 경우는 포함하지 않습니다.
   */
  isBetween(range: DateTimeRange, includeBounds?: boolean): boolean;
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
    startDateOrRange: DateTime | DateTimeRange,
    endDateOrIncludeBounds?: DateTime | boolean,
    includeBounds: boolean = true
  ): boolean {
    let startDate: DateTime | null = null;
    let endDate: DateTime | null = null;
    let _includeBounds: boolean = true;

    if (startDateOrRange instanceof DateTimeRange) {
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

  startOf(unit: Exclude<DateTimeUnit, "minutes" | "hours" | "week">): DateTime;
  startOf(
    unit: Extract<DateTimeUnit, "week">,
    weekStartsOn: WeekStartsOnType
  ): DateTime;
  startOf(
    unit: Exclude<DateTimeUnit, "minutes" | "hours">,
    weekStartsOn?: WeekStartsOnType
  ): DateTime {
    if (unit === DATETIME_UNIT.DAYS) {
      return this.setTime(0, 0);
    }

    if (unit === DATETIME_UNIT.WEEK) {
      let dayOfWeek = this.getDayOfWeek();
      if (weekStartsOn === dayOfWeek) {
        return this.setTime(0, 0);
      }
      if (weekStartsOn === WEEK_STARTS_ON.MON) {
        dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return this.add(-dayOfWeek, DATETIME_UNIT.DAYS).setTime(0, 0);
      }
      if (weekStartsOn === WEEK_STARTS_ON.SUN) {
        return this.add(-dayOfWeek, DATETIME_UNIT.DAYS).setTime(0, 0);
      }
      throw Error("Not Implemented");
    }

    if (unit === DATETIME_UNIT.MONTH) {
      const newBase = this._view
        .set(this._view.month, DATETIME_UNIT.MONTH)
        .set(1, DATETIME_UNIT.DAYS)
        .set(0, DATETIME_UNIT.HOURS)
        .set(0, DATETIME_UNIT.MINUTES);
      return DateTime.fromTZ(newBase, this._tz);
    }

    const newBase = this._view
      .set(this._view.year, DATETIME_UNIT.YEAR)
      .set(0, DATETIME_UNIT.MONTH)
      .set(1, DATETIME_UNIT.DAYS)
      .set(0, DATETIME_UNIT.HOURS)
      .set(0, DATETIME_UNIT.MINUTES);
    return DateTime.fromTZ(newBase, this._tz);
  }

  endOf(unit: Exclude<DateTimeUnit, "week">): DateTime;
  endOf(
    unit: Extract<DateTimeUnit, "week">,
    weekStartsOn: WeekStartsOnType
  ): DateTime;
  endOf(unit: DateTimeUnit, weekStartsOn?: WeekStartsOnType): DateTime {
    if (unit === DATETIME_UNIT.DAYS) {
      return this.setTime(23, 59);
    }

    if (unit === DATETIME_UNIT.WEEK) {
      let dayOfWeek = this.getDayOfWeek();

      if (weekStartsOn === WEEK_STARTS_ON.MON) {
        if (dayOfWeek === WEEK_STARTS_ON.SUN) {
          return this.setTime(23, 59);
        }
        dayOfWeek = 7 - dayOfWeek;
        return this.add(dayOfWeek, DATETIME_UNIT.DAYS).setTime(23, 59);
      }
      if (weekStartsOn === WEEK_STARTS_ON.SUN) {
        dayOfWeek = 6 - dayOfWeek;
        return this.add(dayOfWeek, DATETIME_UNIT.DAYS).setTime(23, 59);
      }
      throw Error("Not Implemented");
    }

    if (unit === DATETIME_UNIT.MONTH) {
      const newBase = this._view
        .set(this._view.month + 1, DATETIME_UNIT.MONTH)
        .set(0, DATETIME_UNIT.DAYS)
        .set(23, DATETIME_UNIT.HOURS)
        .set(59, DATETIME_UNIT.MINUTES);
      return DateTime.fromTZ(newBase, this._tz);
    }

    const newBase = this._view
      .set(this._view.year + 1, DATETIME_UNIT.YEAR)
      .set(0, DATETIME_UNIT.MONTH)
      .set(0, DATETIME_UNIT.DAYS)
      .set(23, DATETIME_UNIT.HOURS)
      .set(59, DATETIME_UNIT.MINUTES);
    return DateTime.fromTZ(newBase, this._tz);
  }

  weekRange(weekStartsOn: WeekStartsOnType): DateTimeRange {
    const startOfWeek = this.startOf(DATETIME_UNIT.WEEK, weekStartsOn);
    const endOfWeek = this.endOf(DATETIME_UNIT.WEEK, weekStartsOn);
    return new DateTimeRange(startOfWeek, endOfWeek);
  }

  monthMatrix(weekStartsOn: WeekStartsOnType): Array<DateTimeRange> {
    const matrix: Array<DateTimeRange> = [];

    let d = this.startOf(DATETIME_UNIT.MONTH);
    for (let index = 0; index < 6; index++) {
      matrix.push(d.weekRange(weekStartsOn));
      d = d.add(1, DATETIME_UNIT.WEEK);
    }

    return matrix;
  }
}

export class DateTimeRange {
  private _start: DateTime;
  private _end: DateTime;
  private _dates: DateTime[] = [];

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
   * 구간 사이의 모든 날짜
   */
  getDateTimes(): DateTime[] {
    if (this._dates.length === 0) {
      const diff = this._start.diff(this._end, DATETIME_UNIT.DAYS);
      this._dates = Array.from({ length: diff + 1 }, (_, i) =>
        this._start.add(i, DATETIME_UNIT.DAYS)
      );
    }
    return this._dates;
  }

  /**
   * 두 DateTimeRange가 겹치는지 계산하는 기능을 제공합니다.
   * @param range - 특정 구간
   * @param includeBounds - 구간의 시작과 끝 날짜와 일치하는 경우 포함할지 여부. false인 경우, 구간의 시작과 끝 날짜와 일치하는 경우는 포함하지 않습니다.
   */
  isOverlap(range: DateTimeRange, includeBounds: boolean = false): boolean {
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

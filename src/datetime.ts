import dayjs from "./dayjs";
import type { Dayjs } from "dayjs";
import { UTC } from "./utc";
import { Duration } from "./duration";
import { assertWeekStartsOn, truncateTime } from "./utils";
import {
  DATETIME_UNIT,
  WEEK_STARTS_ON,
  type DateTimeUnit,
  type WeekStartsOnType,
} from "./types";

/**
 * 주어진 view 기준으로 week의 시작(00:00)과 끝(23:59:59.999)을 계산합니다.
 * - weekStartsOn = MON이면 (Mon..Sun), SUN이면 (Sun..Sat)
 */
function startOfWeekView(view: Dayjs, weekStartsOn: WeekStartsOnType): Dayjs {
  const day = view.day(); // 0..6 (Sun..Sat)
  // MON 시작이면, Sun(0)을 6으로 보고 나머지는 -1 shift
  const offset =
    weekStartsOn === WEEK_STARTS_ON.MON ? (day === 0 ? 6 : day - 1) : day;

  return view.startOf(DATETIME_UNIT.DAY).subtract(offset, DATETIME_UNIT.DAY);
}

function endOfWeekView(view: Dayjs, weekStartsOn: WeekStartsOnType): Dayjs {
  const start = startOfWeekView(view, weekStartsOn);
  return start.add(6, DATETIME_UNIT.DAY).endOf(DATETIME_UNIT.DAY);
}

/**
 * DateTime:
 * - 내부적으로는 "절대시간(epoch ms)"을 보관(utc)하고,
 * - 표시/달력 연산용으로 "tz view(dayjs.tz)"를 함께 유지합니다.
 *
 * 설계 원칙:
 * - 비교(isBefore/isAfter/isEqual)는 utc(절대시간) 기준
 * - 달력 연산(startOf/endOf/range/diff의 일부)은 view(표시 타임존) 기준
 */
export class DateTime {
  private readonly utc: UTC;
  private readonly view: Dayjs;

  readonly tz: string;

  /**
   * 해당 시점(view 기준)의 timezone offset (minutes)
   * - DST가 있는 타임존에서는 시점에 따라 변할 수 있으므로 "now"가 아니라 이 인스턴스의 view로 계산합니다.
   */
  readonly timezoneOffset: number;

  /**
   * @param ms - epoch ms(절대시간)
   * @param tz - IANA time zone (없으면 dayjs.tz.guess())
   */
  constructor(ms: number, tz?: string) {
    this.tz = tz ?? dayjs.tz.guess();

    // 스냅(정규화) 정책: 모든 DateTime은 TIME_UNIT 경계로 잘림
    const _ms = truncateTime(ms);

    this.utc = new UTC(_ms);
    this.view = dayjs(_ms).tz(this.tz);

    // "해당 ms 시점"의 offset (DST 안전)
    this.timezoneOffset = this.view.utcOffset();
  }

  /**
   * 현재 시각의 DateTime을 생성합니다.
   * @param tz - 표시 타임존
   */
  static now(tz?: string) {
    return new DateTime(Date.now(), tz);
  }

  /**
   * JS Date로부터 DateTime을 생성합니다.
   * @param date - JS Date (내부는 epoch ms)
   * @param tz - 표시 타임존
   */
  static fromDate(date: Date, tz?: string) {
    return new DateTime(date.getTime(), tz);
  }

  /**
   * 월을 반환합니다. (view 기준)
   */
  getMonth() {
    return this.view.month() + 1;
  }

  /**
   * 요일(0..6, Sun..Sat)을 반환합니다. (view 기준)
   */
  getDayOfWeek() {
    return this.view.day();
  }

  /**
   * 월의 일(day of month, 1..31)을 반환합니다. (view 기준)
   */
  getDateOfMonth() {
    return this.view.date();
  }

  /**
   * 시(hours, 0..23)을 반환합니다. (view 기준)
   */
  getHours() {
    return this.view.hour();
  }

  /**
   * 분(minutes, 0..59)을 반환합니다. (view 기준)
   */
  getMinutes() {
    return this.view.minute();
  }

  /**
   * epoch ms(절대시간)을 반환합니다.
   * - view.valueOf()와 같지만, 의도를 명확히 하기 위해 utc 기준으로 반환합니다.
   */
  getTime() {
    return this.utc.getTime();
  }

  /**
   * DateTime 간 차이를 계산합니다.
   *
   * 정책:
   * - DAY/MONTH/YEAR: "달력 단위(calendar diff)"로 계산
   *   - 각 단위 startOf로 정규화 후 diff → 월/연 경계에서 안전
   * - HOUR/MINUTE 등: "기간 단위(duration diff)"로 계산
   *
   * @param other - 비교 대상
   * @param unit - 단위 (기본: day)
   */
  diff(
    other: DateTime,
    unit: Exclude<DateTimeUnit, "date" | "week"> = DATETIME_UNIT.DAY
  ): number {
    if (unit === DATETIME_UNIT.DAY) {
      return this.view
        .startOf(DATETIME_UNIT.DAY)
        .diff(other.view.startOf(DATETIME_UNIT.DAY), DATETIME_UNIT.DAY);
    }

    if (unit === DATETIME_UNIT.MONTH) {
      return this.view
        .startOf(DATETIME_UNIT.MONTH)
        .diff(other.view.startOf(DATETIME_UNIT.MONTH), DATETIME_UNIT.MONTH);
    }

    if (unit === DATETIME_UNIT.YEAR) {
      return this.view
        .startOf(DATETIME_UNIT.YEAR)
        .diff(other.view.startOf(DATETIME_UNIT.YEAR), DATETIME_UNIT.YEAR);
    }

    return this.view.diff(other.view, unit);
  }

  /**
   * 시간(시/분)을 변경한 새 DateTime을 반환합니다. (view 기준)
   * - DST로 인해 "존재하지 않는 시각"이 발생하면 dayjs.tz 정책에 따라 보정될 수 있습니다.
   * @param hours - 0..23
   * @param minutes - 0..59
   */
  setTime(hours: number, minutes: number): DateTime {
    const next = this.view.hour(hours).minute(minutes);
    return new DateTime(next.valueOf(), this.tz);
  }

  /**
   * 지정 단위만큼 더한 새 DateTime을 반환합니다. (view 기준)
   * @param value - 더할 값 (음수 가능)
   * @param unit - 단위 (date 제외)
   */
  add(value: number, unit: Exclude<DateTimeUnit, "date">): DateTime {
    const next = this.view.add(value, unit);
    return new DateTime(next.valueOf(), this.tz);
  }

  /**
   * view 기준으로 오늘인지 여부를 반환합니다.
   * - dayjs 플러그인(isToday)이 활성화되어 있어야 합니다.
   */
  isToday(): boolean {
    return this.view.isToday();
  }

  /**
   * 같은 시각인지 비교합니다. (절대시간 기준)
   * @param other - 비교 대상
   * @param unit - 비교 단위 (기본: minute)
   */
  isEqual(
    other: DateTime,
    unit: Exclude<DateTimeUnit, "week" | "day"> = DATETIME_UNIT.MINUTE
  ): boolean {
    return this.utc.isEqual(other.utc, unit);
  }

  /**
   * 다른 DateTime보다 이전인지 판단합니다. (절대시간 기준)
   */
  isBefore(other: DateTime): boolean {
    return this.utc.isBefore(other.utc);
  }

  /**
   * 다른 DateTime보다 이전이거나 같은지 판단합니다. (절대시간 기준)
   */
  isOnOrBefore(other: DateTime) {
    return this.utc.isOnOrBefore(other.utc);
  }

  /**
   * 다른 DateTime보다 이후인지 판단합니다. (절대시간 기준)
   */
  isAfter(other: DateTime): boolean {
    return this.utc.isAfter(other.utc);
  }

  /**
   * 다른 DateTime보다 이후이거나 같은지 판단합니다. (절대시간 기준)
   */
  isOnOrAfter(other: DateTime): boolean {
    return this.utc.isOnOrAfter(other.utc);
  }

  /**
   * 이 DateTime이 특정 구간(Duration) 사이에 있는지 확인합니다.
   * @param duration - 구간
   */
  isBetween(duration: Duration): boolean;

  /**
   * 이 DateTime이 [startDate, endDate] 사이에 있는지 확인합니다.
   * @param startDate - 시작
   * @param endDate - 끝
   */
  isBetween(startDate: DateTime, endDate: DateTime): boolean;

  /**
   * isBetween 구현부 (오버로드 통합)
   */
  isBetween(
    startDateOrDuration: DateTime | Duration,
    endDate?: DateTime
  ): boolean {
    let start: DateTime;
    let end: DateTime;

    if (startDateOrDuration instanceof Duration) {
      start = startDateOrDuration.startDate;
      end = startDateOrDuration.endDate;
    } else {
      start = startDateOrDuration;
      end = endDate as DateTime;
    }

    return this.isOnOrAfter(start) && this.isOnOrBefore(end);
  }

  /**
   * 지정 단위의 시작 시각을 반환합니다.
   * - week는 weekStartsOn 필요
   * - day/month/year 등은 view.startOf(unit) 사용
   */
  startOf(
    unit: Exclude<DateTimeUnit, "week" | "hour" | "minute" | "date">
  ): DateTime;

  /**
   * 주의 시작 시각(weekStartsOn 기준)을 반환합니다.
   * @param unit - "week"
   * @param weekStartsOn - 주 시작 요일
   */
  startOf(
    unit: Extract<DateTimeUnit, "week">,
    weekStartsOn: WeekStartsOnType
  ): DateTime;

  /**
   * startOf 구현부 (오버로드 통합)
   */
  startOf(
    unit: Exclude<DateTimeUnit, "date" | "hour" | "minute">,
    weekStartsOn?: WeekStartsOnType
  ): DateTime {
    if (unit === DATETIME_UNIT.WEEK) {
      const ws = assertWeekStartsOn(weekStartsOn);
      const d = startOfWeekView(this.view, ws);
      return new DateTime(d.valueOf(), this.tz);
    }

    const d = this.view.startOf(unit);
    return new DateTime(d.valueOf(), this.tz);
  }

  /**
   * 지정 단위의 끝 시각을 반환합니다.
   * - week는 weekStartsOn 필요
   * - day/month/year 등은 view.endOf(unit) 사용
   */
  endOf(
    unit: Exclude<DateTimeUnit, "week" | "hour" | "minute" | "date">
  ): DateTime;

  /**
   * 주의 끝 시각(weekStartsOn 기준)을 반환합니다.
   * @param unit - "week"
   * @param weekStartsOn - 주 시작 요일
   */
  endOf(
    unit: Extract<DateTimeUnit, "week">,
    weekStartsOn: WeekStartsOnType
  ): DateTime;

  /**
   * endOf 구현부 (오버로드 통합)
   */
  endOf(
    unit: Exclude<DateTimeUnit, "date" | "hour" | "minute">,
    weekStartsOn?: WeekStartsOnType
  ): DateTime {
    if (unit === DATETIME_UNIT.WEEK) {
      const ws = assertWeekStartsOn(weekStartsOn);
      const d = endOfWeekView(this.view, ws);
      return new DateTime(d.valueOf(), this.tz);
    }

    const d = this.view.endOf(unit);
    return new DateTime(d.valueOf(), this.tz);
  }

  /**
   * 특정 단위의 구간(Duration)을 반환합니다.
   * - DAY: 해당 날짜의 시작~끝
   * - WEEK: weekStartsOn 기준 주 시작~끝
   * - MONTH: month를 week 경계로 확장(월간 그리드용)
   */
  duration(unit: typeof DATETIME_UNIT.DAY): Duration;

  /**
   * 주 구간(Duration)을 반환합니다.
   * @param unit - "week"
   * @param weekStartsOn - 주 시작 요일
   */
  duration(
    unit: typeof DATETIME_UNIT.WEEK,
    weekStartsOn: WeekStartsOnType
  ): Duration;

  /**
   * 월 구간(Duration)을 반환합니다. (월간 그리드)
   * - start: month.startOf().startOf(week)
   * - end: month.endOf().endOf(week)
   */
  duration(
    unit: typeof DATETIME_UNIT.MONTH,
    weekStartsOn: WeekStartsOnType
  ): Duration;

  /**
   * range 구현부 (오버로드 통합)
   */
  duration(
    unit:
      | typeof DATETIME_UNIT.DAY
      | typeof DATETIME_UNIT.WEEK
      | typeof DATETIME_UNIT.MONTH,
    weekStartsOn?: WeekStartsOnType
  ): Duration {
    if (unit === DATETIME_UNIT.DAY) {
      return new Duration(this.startOf(unit), this.endOf(unit));
    }

    const ws = assertWeekStartsOn(weekStartsOn);

    if (unit === DATETIME_UNIT.WEEK) {
      return new Duration(
        this.startOf(DATETIME_UNIT.WEEK, ws),
        this.endOf(DATETIME_UNIT.WEEK, ws)
      );
    }

    const start = this.startOf(DATETIME_UNIT.MONTH).startOf(
      DATETIME_UNIT.WEEK,
      ws
    );
    const end = this.endOf(DATETIME_UNIT.MONTH).endOf(DATETIME_UNIT.WEEK, ws);
    return new Duration(start, end);
  }

  /**
   * view 기준으로 포맷 문자열을 적용한 결과를 반환합니다.
   * @param template - dayjs format template
   */
  format(template: string) {
    return this.view.format(template);
  }
}

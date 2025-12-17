import { DATETIME_UNIT, type DateTimeUnit } from "./types";
import dayjs from "./dayjs";
import type { Dayjs } from "dayjs";

/**
 * UTC 래퍼.
 * - 비교/정렬/동등성 판단을 "절대시간(UTC)" 기준으로 통일하기 위해 사용합니다.
 * - 내부 Dayjs는 utc()로 고정합니다.
 */
export class UTC {
  private readonly d: Dayjs;

  /**
   * @param ms - epoch ms(절대시간)
   */
  constructor(ms: number) {
    this.d = dayjs(ms).utc();
  }

  /**
   * @returns epoch ms(절대시간)
   */
  getTime() {
    return this.d.valueOf();
  }

  /**
   * UTC 간의 차이를 계산합니다.
   * - dayjs#diff의 의미(단위별 duration diff)를 그대로 따릅니다.
   * @param utc - 비교 대상
   * @param unit - diff 단위 (기본: day)
   */
  diff(utc: UTC, unit: Exclude<DateTimeUnit, "date"> = DATETIME_UNIT.DAY) {
    return this.d.diff(utc.d, unit);
  }

  /**
   * 같은 시각인지 비교합니다.
   * - unit 정밀도까지 같으면 true
   * - 예: MINUTE면 같은 분(초 이하는 무시)인지
   * @param utc - 비교 대상
   * @param unit - 비교 단위 (기본: minute)
   */
  isEqual(
    utc: UTC,
    unit: Exclude<DateTimeUnit, "week" | "day"> = DATETIME_UNIT.MINUTE
  ): boolean {
    return this.d.isSame(utc.d, unit);
  }

  /**
   * 비교 대상보다 이전인지 판단합니다.
   * - 같은 분이면 false
   * - 분 단위로 비교하여 초/밀리초 노이즈를 제거합니다.
   */
  isBefore(utc: UTC): boolean {
    return this.d.isBefore(utc.d, DATETIME_UNIT.MINUTE);
  }

  /**
   * 비교 대상보다 이전이거나 같은지 판단합니다.
   */
  isOnOrBefore(utc: UTC) {
    return this.isEqual(utc) || this.isBefore(utc);
  }

  /**
   * 비교 대상보다 이후인지 판단합니다.
   * - 같은 분이면 false
   */
  isAfter(utc: UTC): boolean {
    return this.d.isAfter(utc.d, DATETIME_UNIT.MINUTE);
  }

  /**
   * 비교 대상보다 이후이거나 같은지 판단합니다.
   */
  isOnOrAfter(utc: UTC): boolean {
    return this.isEqual(utc) || this.isAfter(utc);
  }
}

import type { DateTime } from "./datetime";
import { DATETIME_UNIT, type WeekStartsOnType } from "./types";
import { assertWeekStartsOn } from "./utils";

/**
 * Duration:
 * - [start, end]를 나타내는 폐구간(기본) 래퍼
 * - 생성 시 start <= end를 보장합니다.
 */
export class Duration {
  private readonly _start: DateTime;
  private readonly _end: DateTime;

  /**
   * @param start - 시작 DateTime
   * @param end - 끝 DateTime
   * @throws start > end 인 경우 에러
   */
  constructor(start: DateTime, end: DateTime) {
    if (start.isAfter(end)) {
      throw new Error("End date must be after start date");
    }
    this._start = start;
    this._end = end;
  }

  /**
   * 구간의 시작 DateTime
   */
  get startDate() {
    return this._start;
  }

  /**
   * 구간의 끝 DateTime
   */
  get endDate() {
    return this._end;
  }

  /**
   * 구간에 포함되는 모든 날짜(DateTime)를 배열로 반환합니다.
   * - DAY 단위 calendar diff를 사용하므로 월/연 경계에서도 안정적입니다.
   * - 반환은 start 기준으로 0..N일 add(DAY)합니다.
   */
  toArray(): DateTime[] {
    const days = this._end.diff(this._start, DATETIME_UNIT.DAY) + 1;
    return Array.from({ length: Math.max(days, 1) }, (_, i) =>
      this._start.add(i, DATETIME_UNIT.DAY)
    );
  }

  /**
   * 월간 그리드(보통 6주) 생성을 위한 주 단위 Duration[]을 반환합니다.
   * - 기존 코드의 (요일 0..6을 0|1로 캐스팅) 런타임 버그를 제거하고,
   *   weekStartsOn을 명시 입력으로 받도록 변경했습니다.
   * @param weekStartsOn - 주 시작 요일
   * @returns 길이 6의 주 구간 배열
   */
  toMatrix(weekStartsOn: WeekStartsOnType): Duration[] {
    const ws = assertWeekStartsOn(weekStartsOn);

    // 매트릭스 시작은 "startDate가 포함된 주의 시작"
    let cursor = this._start.startOf(DATETIME_UNIT.WEEK, ws);

    return Array.from({ length: 6 }, () => {
      const week = cursor.duration(DATETIME_UNIT.WEEK, ws);
      cursor = cursor.add(1, DATETIME_UNIT.WEEK);
      return week;
    });
  }

  /**
   * 두 Duration이 겹치는지 계산합니다.
   *
   * @param duration - 비교 대상 구간
   */
  isOverlap(duration: Duration): boolean {
    return (
      this._start.isOnOrBefore(duration.endDate) &&
      this._end.isOnOrAfter(duration.startDate)
    );
  }
}

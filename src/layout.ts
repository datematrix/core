import { DATETIME_UNIT, type Duration } from "./date";
import type { EngineEntryRef } from "./engine";
import type { ScheduledEntry } from "./entry";
import { sortEntries } from "./utils";

export interface LayoutState {
  id: string;
  startPos: number;
  spanLength: number;
  stackLevel: number;
}

export class CalendarLayoutEngine {
  compute<T extends EngineEntryRef>(entries: T[], duration: Duration) {
    const sorted = entries.sort(sortEntries);

    const state = new Map<string, LayoutState>();
    const lastEndOfLevel: Array<number> = [];
    const rangeLength = duration.toArray().length;

    for (const span of sorted) {
      let level = 0;
      let startPos = span.startDate!.diff(duration.startDate);
      let spanLength = 0;

      if (startPos < 0) {
        spanLength = Math.min(
          span.endDate.diff(duration.startDate) + 1,
          rangeLength
        );
      } else {
        spanLength = Math.min(
          span.endDate.diff(span.startDate) + 1,
          rangeLength - startPos
        );
      }

      while (
        level < lastEndOfLevel.length &&
        startPos < lastEndOfLevel[level]
      ) {
        level += 1;
      }

      if (level === lastEndOfLevel.length) {
        lastEndOfLevel.push(Math.max(startPos, 0) + spanLength);
      } else {
        lastEndOfLevel[level] = Math.max(startPos, 0) + spanLength;
      }

      state.set(span.id, {
        id: span.id,
        startPos: Math.max(startPos, 0),
        spanLength,
        stackLevel: level,
      });
    }

    return state;
  }

  /**
   * Entry의 시작 시간을 기반으로 Y 좌표(픽셀)를 계산합니다.
   * Day/Week TimeGrid에서 Entry의 확정된 렌더링 위치를 구할 때 사용됩니다.
   * @param entry - SchduledEntry
   * @param dayStartsAt - 하루가 시작하는 시간
   * @param blockHeight - 한 시간 단위의 블럭의 높이 (px)
   */
  static posFromTime(
    entry: ScheduledEntry,
    dayStartsAt: number,
    blockHeight: number = 84
  ) {
    const hours = entry.startDate.getHours();
    const minutes = entry.startDate.getMinutes();

    const pieceHeight = blockHeight / 12; // 5분 단위로 움직임
    const minutesPerPiece = 60 / 12;

    const hourOffset = (hours - dayStartsAt) * blockHeight;
    const minuteOffset = (minutes / minutesPerPiece) * pieceHeight;

    return hourOffset + minuteOffset;
  }

  static heightFromTime(entry: ScheduledEntry, blockHeight: number = 84) {
    const minutes = entry.endDate.diff(entry.startDate, DATETIME_UNIT.MINUTE);

    const pieceHeight = blockHeight / 12; // 5분 단위로 움직임
    const minutesPerPiece = 60 / 12;

    return (minutes / minutesPerPiece) * pieceHeight;
  }

  /**
   * Day/Week 뷰에서 위치에 따른 시(hour)와 분(minute)을 계산하는 기능을 제공합니다.
   * 이 함수는 Entry를 드래그하여 시간을 변경하고자할 때 사용합니다.
   * @param top - 드래그 중인Entry의 top 값
   * @param blockHeight - 한 시간 단위의 블럭의 높이 (px)
   * @returns
   */
  static timeFromPos(
    top: number,
    dayStartsAt: number,
    blockHeight: number = 84
  ): [number, number] {
    const pieceHeight = blockHeight / 12;
    const unit = 60 / 12;
    const minutes = Math.round(top / pieceHeight) * unit;
    const hour = Math.floor(minutes / 60);
    const minute = minutes - hour * 60;
    return [hour + dayStartsAt, minute];
  }
}

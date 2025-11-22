import { DateTime } from "./date";

export const ENTRY_PRIORITY = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5,
} as const;

export const ENTRY_TYPE = {
  TASK: "task",
  EVENT: "event",
  SLOT: "slot",
} as const;

export const ENTRY_STATUS = {
  DEFAULT: "default",
  DELETED: "deleted",
} as const;

export type EntryPriority =
  (typeof ENTRY_PRIORITY)[keyof typeof ENTRY_PRIORITY];

export type EntryType = (typeof ENTRY_TYPE)[keyof typeof ENTRY_TYPE];

export type EntryStatus = (typeof ENTRY_STATUS)[keyof typeof ENTRY_STATUS];

export interface EntryConfig {
  id: string;
  title: string;
  description?: string;
  review?: string;
  startDate?: DateTime;
  endDate?: DateTime;
  deadline?: DateTime;
  allDay: boolean;
  completed: boolean;
  tags: string[];
  priority: EntryPriority;
  type: EntryType;
  directory?: string;
  url?: string;
  flag?: boolean;
  mention?: any;
  status: EntryStatus;
}

/**
 * 일정, 할일 등을 나타내는 클래스
 */
export class Entry {
  private _config: EntryConfig;

  constructor(config: EntryConfig) {
    this._config = config;
  }

  /**
   * Entry를 업데이트하는 기능을 제공합니다.
   * @param config - Entry에 필요한 정보
   */
  update(config: Partial<EntryConfig>) {
    return new Entry({ ...this._config, ...config });
  }

  /**
   * Entry 정보를 JSON으로 반환합니다.
   */
  toJSON() {
    return this._config;
  }

  /**
   * startDate와 endDate 간의 차이를 5분 단위로 나눠서 반환합니다.
   * 예를 들어, 10:00와 10:30이라면, 30/5 = 6을 반환합니다.
   */
  get duration() {
    if (!this.endDate || !this.startDate) return 0;

    return this.endDate.diff(this.startDate, "minutes") / 5;
  }

  /**
   * Entry의 고유한 아이디
   */
  get id() {
    return this._config.id;
  }

  /**
   * Entry의 제목
   */
  get title() {
    return this._config.title;
  }

  /**
   * Entry에 대한 설명
   */
  get description() {
    return this._config.description;
  }

  /**
   * Entry를 완료한 후 후기
   */
  get review() {
    return this._config.review;
  }

  /**
   * Entry를 시작하는 날짜 및 시간
   */
  get startDate() {
    return this._config.startDate;
  }

  /**
   * Entry를 끝내는 날짜 및 시간
   */
  get endDate() {
    return this._config.endDate;
  }

  /**
   * Entry가 하루종일 지속되는 것인지 여부
   */
  get allDay() {
    return this._config.allDay;
  }

  /**
   * Entry 마감 날짜 및 시간
   */
  get deadline() {
    return this._config.deadline;
  }

  /**
   * Entry를 완료했는지 여부
   */
  get completed() {
    return this._config.completed;
  }

  /**
   * Entry에 달린 태그들
   */
  get tags() {
    return this._config.tags;
  }

  /**
   * Entry 우선순위
   */
  get priority() {
    return this._config.priority;
  }

  /**
   * Entry가 일정, 할 일, Slot 중 어떤 것인지 표시.
   * Slot이란 비어있는 시간을 설정하는 것을 의미.
   */
  get type() {
    return this._config.type;
  }

  /**
   * Entry 상태. Default, Inbox, Someday, Deleted가 있다.
   */
  get status() {
    return this._config.status;
  }
}

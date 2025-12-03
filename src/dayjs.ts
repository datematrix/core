import dayjs from "dayjs";
import isLeapYear from "dayjs/plugin/isLeapYear";
import isToday from "dayjs/plugin/isToday";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(isLeapYear);
dayjs.extend(isToday);
dayjs.extend(utc);
dayjs.extend(timezone);

export default dayjs;

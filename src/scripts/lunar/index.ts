/**
 * 农历模块对外入口（类似头文件汇总）
 */
export type { CalElement, DayCell, LunarResult, MonthData } from './types';
export { createCalElement } from './types';

export {
	Lunar,
	cyclical,
	daysInLunarMonth,
	hourCyclical,
	lYearDays,
	leapDays,
	leapMonth,
	listLunarYearMonths,
	lunarMonthDays,
	lunarToSolar,
	monthDays,
	sTerm,
	solarDays,
} from './lunar-calc';
export type { LunarMonthRef } from './lunar-calc';

export {
	cDay,
	lunarMonthToChinese,
	padZero,
} from './format';

export { calendar, cellLabel, gzHeaderText } from './calendar';

export {
	baziDayPillar,
	baziMonthPillar,
	baziMonthZhiIndex,
	baziYearPillar,
	clockToShiChen,
	computeBazi,
} from './bazi';
export type { BaziPillars } from './bazi';

export { buildLunarMonthData, buildLunarYearMonths, buildMonthData } from './month-data';

export {
	buildDayDetail,
	calcAlmanac,
	getIsoWeek,
	shiftSolarDate,
} from './day-detail';
export type { DayAlmanac, DayDetailModel } from './day-detail';

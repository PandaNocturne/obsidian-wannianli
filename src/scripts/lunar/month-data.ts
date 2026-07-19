import { calendar, cellLabel, gzHeaderText } from './calendar';
import {
	daysInLunarMonth,
	listLunarYearMonths,
	lunarToSolar,
	type LunarMonthRef,
} from './lunar-calc';
import { createCalElement, type DayCell, type MonthData } from './types';

/**
 * 构建指定公历年月的月历网格（周一为首，共 42 格）
 * @param year 公历年
 * @param month 公历月 0–11
 */
export function buildMonthData(year: number, month: number): MonthData {
	const today = new Date();
	const tY = today.getFullYear();
	const tM = today.getMonth();
	const tD = today.getDate();

	const first = new Date(year, month, 1);
	let firstDay = first.getDay();
	// 周日(0) → 6，周一(1) → 0 …
	firstDay = firstDay === 0 ? 6 : firstDay - 1;

	const mDay = new Date(year, month + 1, 0).getDate();
	const cells: DayCell[] = [];

	for (let i = 0; i < 42; i++) {
		const col = i % 7;
		const solarDay = i - firstDay + 1;
		const valid = solarDay > 0 && solarDay <= mDay;

		if (valid) {
			const info = calendar(year, month, solarDay);
			cells.push({
				valid: true,
				solarDay,
				week: info.week,
				col,
				info,
				label: cellLabel(info),
				isToday: year === tY && month === tM && solarDay === tD,
			});
		} else {
			cells.push({
				valid: false,
				solarDay: 0,
				week: 0,
				col,
				info: createCalElement(),
				label: '',
				isToday: false,
			});
		}
	}

	const anchor = cells[firstDay]!;
	return {
		year,
		month,
		kind: 'solar',
		cells,
		firstDayIndex: firstDay,
		gzText: gzHeaderText(anchor.info, year),
	};
}

/**
 * 构建指定农历年月的月历网格（周一为首，共 42 格）
 * @param lunarYear 农历年
 * @param lunarMonth 农历月 1–12
 * @param isLeap 是否闰月
 */
export function buildLunarMonthData(
	lunarYear: number,
	lunarMonth: number,
	isLeap = false,
): MonthData {
	const today = new Date();
	const tY = today.getFullYear();
	const tM = today.getMonth();
	const tD = today.getDate();

	const mDay = daysInLunarMonth(lunarYear, lunarMonth, isLeap);
	const firstSolar = lunarToSolar(lunarYear, lunarMonth, 1, isLeap);
	let firstDay = firstSolar.getDay();
	firstDay = firstDay === 0 ? 6 : firstDay - 1;

	const cells: DayCell[] = [];

	for (let i = 0; i < 42; i++) {
		const col = i % 7;
		const lunarDay = i - firstDay + 1;
		const valid = lunarDay > 0 && lunarDay <= mDay;

		if (valid) {
			const solar = lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap);
			const sY = solar.getFullYear();
			const sM = solar.getMonth();
			const sD = solar.getDate();
			const info = calendar(sY, sM, sD);
			cells.push({
				valid: true,
				solarDay: sD,
				week: info.week,
				col,
				info,
				label: cellLabel(info),
				isToday: sY === tY && sM === tM && sD === tD,
			});
		} else {
			cells.push({
				valid: false,
				solarDay: 0,
				week: 0,
				col,
				info: createCalElement(),
				label: '',
				isToday: false,
			});
		}
	}

	const anchor = cells[firstDay]!;
	return {
		year: lunarYear,
		month: lunarMonth - 1,
		kind: 'lunar',
		lunarMonth,
		isLeapMonth: isLeap,
		cells,
		firstDayIndex: firstDay,
		gzText: gzHeaderText(anchor.info, lunarYear),
	};
}

/** 构建农历一年全部月份（含闰月） */
export function buildLunarYearMonths(lunarYear: number): MonthData[] {
	return listLunarYearMonths(lunarYear).map((ref: LunarMonthRef) =>
		buildLunarMonthData(lunarYear, ref.month, ref.isLeap),
	);
}

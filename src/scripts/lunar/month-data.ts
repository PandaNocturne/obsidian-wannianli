import { calendar, cellLabel, gzHeaderText } from './calendar';
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
		cells,
		firstDayIndex: firstDay,
		gzText: gzHeaderText(anchor.info, year),
	};
}

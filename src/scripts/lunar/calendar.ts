import { YEAR_MAX, YEAR_MIN } from '../constants';
import {
	getChuxiLabel,
	getLunarFestivalNames,
	getSolarFestivalNames,
} from '../data/event-store';
import { Animals, solarTerm } from '../data/terms';
import { cDay } from './format';
import {
	Lunar,
	cyclical,
	lYearDays,
	leapDays,
	leapMonth,
	lunarMonthDays,
	sTerm,
} from './lunar-calc';
import { createCalElement, type CalElement } from './types';

/**
 * 计算某一公历日的完整日历信息
 * @param y 公历年
 * @param m 公历月 0–11
 * @param d 公历日 1–31
 */
export function calendar(y: number, m: number, d: number): CalElement {
	const cld = createCalElement();
	const date = new Date(y, m, d);

	cld.sYear = y;
	cld.sMonth = m + 1;
	cld.sDay = d;
	cld.week = date.getDay();

	try {
		const term1 = sTerm(y, m * 2);
		const term2 = sTerm(y, m * 2 + 1);

		cld.solarFestival = getSolarFestivalNames(m + 1, d);

		if (d === term1) cld.solarTerms = solarTerm[m * 2]!;
		if (d === term2) cld.solarTerms = solarTerm[m * 2 + 1]!;
	} catch {
		/* 节气计算失败时忽略 */
	}

	if (cld.sYear < YEAR_MIN || cld.sYear > YEAR_MAX) return cld;

	try {
		const baseDate = new Date(YEAR_MIN, 0, 31);
		const targetDate = new Date(y, m, d);
		let temp = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);

		let i = YEAR_MIN;
		for (; i <= YEAR_MAX + 1 && temp > 0; i++) {
			const yearDays = lYearDays(i);
			if (temp >= yearDays) {
				temp -= yearDays;
			} else {
				break;
			}
		}

		cld.lYear = i;
		const leap = leapMonth(i);
		let monthDaysCount = 0;

		for (i = 1; i <= 13 && temp > 0; i++) {
			if (leap > 0 && i === leap + 1 && !cld.isLeap) {
				i--;
				cld.isLeap = true;
				monthDaysCount = leapDays(cld.lYear);
			} else {
				monthDaysCount = lunarMonthDays(cld.lYear, i);
			}

			if (cld.isLeap && i === leap + 1) cld.isLeap = false;

			temp -= monthDaysCount;
		}

		if (temp < 0) {
			temp += monthDaysCount;
			i--;
		}

		if (temp === 0 && leap > 0 && i === leap + 1) {
			if (cld.isLeap) {
				cld.isLeap = false;
			} else {
				cld.isLeap = true;
				i--;
			}
		}

		cld.lMonth = i;
		cld.lDay = temp + 1;

		const offset = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);
		const dayCyl = offset + 40;
		const yearCyl = cld.lYear - 1864;
		const lunarObj = Lunar(new Date(y, m, d));

		cld.cYear = cyclical(yearCyl);
		cld.cMonth = cyclical(lunarObj.monCyl);
		cld.cDay = cyclical(dayCyl);

		if (!cld.isLeap) {
			cld.lunarFestival = getLunarFestivalNames(cld.lMonth, cld.lDay);
		}

		if (cld.lMonth === 12 && cld.lDay === lunarMonthDays(cld.lYear, 12)) {
			const chuxi = getChuxiLabel();
			if (chuxi) {
				cld.lunarFestival = cld.lunarFestival
					? `${cld.lunarFestival} ${chuxi}`
					: chuxi;
			}
		}
	} catch {
		cld.lYear = y;
		cld.lMonth = m + 1;
		cld.lDay = d;
	}

	return cld;
}

/** 单元格下方优先显示：农历节日 > 节气 > 公历节日 > 农历日 */
export function cellLabel(info: CalElement): string {
	if (info.lunarFestival) return info.lunarFestival;
	if (info.solarTerms) return info.solarTerms;
	if (info.solarFestival) return info.solarFestival;
	if (info.lDay) {
		let text = cDay(info.lDay);
		if (info.isLeap && info.lDay === 1) text += '(闰)';
		return text;
	}
	return '';
}

/** 月标题旁的干支/生肖文案 */
export function gzHeaderText(info: CalElement, fallbackYear: number): string {
	const year = info.sYear || fallbackYear;
	const zodiac = Animals[(year - 4) % 12] ?? '';
	const cYear = info.cYear || '';
	const cMonth = info.cMonth || '';
	const cDayValue = info.cDay || '';
	return `${cYear}年 ${cMonth}月 ${cDayValue}日  【${zodiac}】`;
}

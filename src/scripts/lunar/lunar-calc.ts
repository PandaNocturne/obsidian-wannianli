import { lunarInfo } from '../data/lunar-info';
import { Gan, Zhi, sTermInfo, solarMonth } from '../data/terms';
import type { LunarResult } from './types';

/** 农历年总天数 */
export function lYearDays(y: number): number {
	let sum = 348;
	for (let i = 0x8000; i > 0x8; i >>= 1) {
		if ((lunarInfo[y - 1900]! & i) !== 0) sum += 1;
	}
	return sum + leapDays(y);
}

/** 闰月天数，无闰月返回 0 */
export function leapDays(y: number): number {
	if (leapMonth(y) !== 0) {
		return (lunarInfo[y - 1900]! & 0x10000) !== 0 ? 30 : 29;
	}
	return 0;
}

/** 闰哪个月，0 表示无闰月 */
export function leapMonth(y: number): number {
	return lunarInfo[y - 1900]! & 0xf;
}

/** 农历 y 年 m 月天数 */
export function lunarMonthDays(y: number, m: number): number {
	const mask = 0x10000 >> m;
	return (lunarInfo[y - 1900]! & mask) === 0 ? 29 : 30;
}

/** 同 lunarMonthDays，兼容原脚本 monthDays */
export function monthDays(y: number, m: number): number {
	return (lunarInfo[y - 1900]! & (0x10000 >> m)) ? 30 : 29;
}

/** 公历 y 年 m 月（1–12）天数 */
export function solarDays(y: number, m: number): number {
	const ms = m - 1;
	if (ms === 1) {
		if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) return 29;
		return 28;
	}
	return solarMonth[ms]!;
}

/** 天干地支 */
export function cyclical(n: number): string {
	return Gan[n % 10]! + Zhi[n % 12]!;
}

/** 第 n 个节气在公历该月的日期（UTC） */
export function sTerm(y: number, n: number): number {
	const offDate = new Date(
		31556925974.7 * (y - 1900) + sTermInfo[n]! * 60000 + Date.UTC(1900, 0, 6, 2, 5),
	);
	return offDate.getUTCDate();
}

/** 由公历 Date 推算农历（含干支用 monCyl / dayCyl） */
export function Lunar(objDate: Date): LunarResult {
	let i: number;
	let leap = 0;
	let temp = 0;
	const baseDate = new Date(1900, 0, 31);
	let offset = (objDate.getTime() - baseDate.getTime()) / 86400000;

	const result: LunarResult = {
		year: 0,
		month: 0,
		day: 0,
		isLeap: false,
		yearCyl: 0,
		monCyl: 14,
		dayCyl: offset + 40,
	};

	for (i = 1900; i < 2050 && offset > 0; i++) {
		temp = lYearDays(i);
		offset -= temp;
		result.monCyl += 12;
	}

	if (offset < 0) {
		offset += temp;
		i--;
		result.monCyl -= 12;
	}

	result.year = i;
	result.yearCyl = i - 1864;
	leap = leapMonth(i);
	result.isLeap = false;

	for (i = 1; i < 13 && offset > 0; i++) {
		if (leap > 0 && i === leap + 1 && !result.isLeap) {
			i--;
			result.isLeap = true;
			temp = leapDays(result.year);
		} else {
			temp = monthDays(result.year, i);
		}

		if (result.isLeap && i === leap + 1) result.isLeap = false;

		offset -= temp;
		if (!result.isLeap) result.monCyl++;
	}

	if (offset === 0 && leap > 0 && i === leap + 1) {
		if (result.isLeap) {
			result.isLeap = false;
		} else {
			result.isLeap = true;
			i--;
			result.monCyl--;
		}
	}

	if (offset < 0) {
		offset += temp;
		i--;
		result.monCyl--;
	}

	result.month = i;
	result.day = offset + 1;
	return result;
}

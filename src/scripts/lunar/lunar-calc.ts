import { YEAR_MAX, YEAR_MIN } from '../constants';
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

/**
 * 时柱干支：由日干推时干（五鼠遁）+ 时辰地支
 * @param dayGanIndex 日干索引 0–9（甲=0）
 * @param shiChen 时辰 0=子 … 11=亥
 */
export function hourCyclical(dayGanIndex: number, shiChen: number): string {
	const start = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][dayGanIndex % 10]!;
	const z = ((shiChen % 12) + 12) % 12;
	return Gan[(start + z) % 10]! + Zhi[z]!;
}

/** 第 n 个节气的精确时刻（算法基准为 UTC，与日序一致） */
export function sTermDate(y: number, n: number): Date {
	return new Date(
		31556925974.7 * (y - 1900) + sTermInfo[n]! * 60000 + Date.UTC(1900, 0, 6, 2, 5),
	);
}

/** 第 n 个节气在公历该月的日期（UTC） */
export function sTerm(y: number, n: number): number {
	return sTermDate(y, n).getUTCDate();
}

/** 由公历 Date 推算农历（含干支用 monCyl / dayCyl） */
export function Lunar(objDate: Date): LunarResult {
	let i: number;
	let leap = 0;
	let temp = 0;
	const baseDate = new Date(YEAR_MIN, 0, 31);
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

	for (i = YEAR_MIN; i < YEAR_MAX + 1 && offset > 0; i++) {
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

/** 农历年月日 → 公历 Date（本地时区，日界为本地 0 点） */
export function lunarToSolar(
	lunarYear: number,
	lunarMonth: number,
	lunarDay: number,
	isLeapMonth = false,
): Date {
	let offset = 0;
	for (let y = YEAR_MIN; y < lunarYear; y++) {
		offset += lYearDays(y);
	}

	const leap = leapMonth(lunarYear);
	for (let m = 1; m < lunarMonth; m++) {
		offset += monthDays(lunarYear, m);
		if (leap > 0 && m === leap) offset += leapDays(lunarYear);
	}

	if (isLeapMonth) {
		offset += monthDays(lunarYear, lunarMonth);
	}

	offset += lunarDay - 1;

	const base = new Date(YEAR_MIN, 0, 31);
	const result = new Date(base.getFullYear(), base.getMonth(), base.getDate());
	result.setDate(result.getDate() + offset);
	return result;
}

export interface LunarMonthRef {
	/** 1–12 */
	month: number;
	isLeap: boolean;
}

/** 列出农历年中的月份（含闰月） */
export function listLunarYearMonths(lunarYear: number): LunarMonthRef[] {
	const leap = leapMonth(lunarYear);
	const months: LunarMonthRef[] = [];
	for (let m = 1; m <= 12; m++) {
		months.push({ month: m, isLeap: false });
		if (leap === m) months.push({ month: m, isLeap: true });
	}
	return months;
}

/** 农历某月天数 */
export function daysInLunarMonth(
	lunarYear: number,
	lunarMonth: number,
	isLeapMonth = false,
): number {
	if (isLeapMonth) return leapDays(lunarYear);
	return monthDays(lunarYear, lunarMonth);
}

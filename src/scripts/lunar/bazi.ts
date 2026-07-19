import { Gan, Zhi } from '../data/terms';
import { cyclical, hourCyclical, sTerm } from './lunar-calc';

export interface BaziPillars {
	year: string;
	month: string;
	day: string;
	/** 有时刻时才有时柱 */
	hour?: string;
}

/** 节气「节」：寅月起，对应 solarTerm 下标 */
const JIE_TERM_INDEX = [
	2, // 立春 → 寅
	4, // 惊蛰 → 卯
	6, // 清明 → 辰
	8, // 立夏 → 巳
	10, // 芒种 → 午
	12, // 小暑 → 未
	14, // 立秋 → 申
	16, // 白露 → 酉
	18, // 寒露 → 戌
	20, // 立冬 → 亥
	22, // 大雪 → 子
] as const;

function dateKey(y: number, m0: number, d: number): number {
	return y * 10000 + m0 * 100 + d;
}

/** 某节气在公历年的月日（月 0–11） */
function termKey(year: number, termIndex: number): number {
	const m0 = Math.floor(termIndex / 2);
	const d = sTerm(year, termIndex);
	return dateKey(year, m0, d);
}

/**
 * 八字年柱：以立春为界（非正月初一、非元旦）
 * @param y 公历年
 * @param m0 公历月 0–11
 * @param d 公历日
 */
export function baziYearPillar(y: number, m0: number, d: number): string {
	const lichun = termKey(y, 2);
	const key = dateKey(y, m0, d);
	const year = key < lichun ? y - 1 : y;
	return cyclical(year - 4);
}

/**
 * 八字月支索引：0=寅 … 11=丑（以「节」换月）
 */
export function baziMonthZhiIndex(y: number, m0: number, d: number): number {
	const key = dateKey(y, m0, d);

	// 从大雪往前找最近已交之节
	for (let i = JIE_TERM_INDEX.length - 1; i >= 0; i--) {
		const term = JIE_TERM_INDEX[i]!;
		if (key >= termKey(y, term)) return i; // 0=寅 … 10=子
	}

	// 立春前：丑月（小寒起）
	return 11;
}

/**
 * 五虎遁：由年干起寅月天干
 * 甲己丙作首，乙庚戊为头，丙辛寻庚起，丁壬壬位顺，戊癸甲好求
 */
export function baziMonthPillar(yearGanIndex: number, monthZhiIndex: number): string {
	const start = [2, 4, 6, 8, 0][yearGanIndex % 5]!; // 寅月干
	const gan = (start + monthZhiIndex) % 10;
	const zhi = (2 + monthZhiIndex) % 12; // 寅=2
	return Gan[gan]! + Zhi[zhi]!;
}

/**
 * 日柱：距 1900-01-31 的日数 + 40（与万年历日柱一致）
 */
export function baziDayPillar(y: number, m0: number, d: number): string {
	const base = new Date(1900, 0, 31);
	const target = new Date(y, m0, d);
	const offset = Math.floor((target.getTime() - base.getTime()) / 86400000);
	return cyclical(offset + 40);
}

/** 钟点 → 时辰 0=子 … 11=亥 */
export function clockToShiChen(hour: number, minute = 0): number {
	const total = (((hour * 60 + minute + 60) % 1440) + 1440) % 1440;
	return Math.floor(total / 120) % 12;
}

/**
 * 计算生辰八字四柱。
 * 夜子时（23:00–23:59）按次日排日柱与时柱。
 */
export function computeBazi(
	y: number,
	month: number,
	day: number,
	hour?: number,
	minute = 0,
): BaziPillars {
	let y0 = y;
	let m0 = month - 1;
	let d0 = day;

	// 夜子时：日柱换日
	if (hour === 23) {
		const next = new Date(y0, m0, d0 + 1);
		y0 = next.getFullYear();
		m0 = next.getMonth();
		d0 = next.getDate();
	}

	const year = baziYearPillar(y0, m0, d0);
	const yearGan = Gan.indexOf(year.charAt(0));
	const monthZhi = baziMonthZhiIndex(y0, m0, d0);
	const monthPillar = baziMonthPillar(yearGan >= 0 ? yearGan : 0, monthZhi);
	const dayPillar = baziDayPillar(y0, m0, d0);

	const result: BaziPillars = {
		year,
		month: monthPillar,
		day: dayPillar,
	};

	if (hour !== undefined && hour >= 0 && hour <= 23) {
		const shiChen = clockToShiChen(hour, minute);
		const dayGan = Gan.indexOf(dayPillar.charAt(0));
		if (dayGan >= 0) {
			result.hour = hourCyclical(dayGan, shiChen);
		}
	}

	return result;
}

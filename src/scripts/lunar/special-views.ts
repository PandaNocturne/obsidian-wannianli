import { YEAR_MAX, YEAR_MIN } from '../constants';
import { Animals, Zhi, solarTerm } from '../data/terms';
import { calendar } from './calendar';
import { calcAlmanac } from './day-detail';
import { cDay, lunarMonthToChinese } from './format';
import { cyclical, lunarToSolar, sTermDate } from './lunar-calc';

export interface SolarTermItem {
	index: number;
	name: string;
	/** 公历年 */
	year: number;
	/** 公历月 1–12 */
	month: number;
	/** 公历日 */
	day: number;
	week: number;
	/** 节气开始时刻 */
	startAt: Date;
	/** 节气结束时刻（下一节气开始） */
	endAt: Date;
	/** 开始文案，如 7月22日 14:08 */
	startText: string;
	/** 结束文案 */
	endText: string;
	/** 是否为当前所处节气 */
	isCurrent: boolean;
	/** 农历，如 六月初五 */
	lunarText: string;
	/** 干支，如 丙午年 甲午月 丙子日 */
	ganzhiText: string;
	/** 生肖 */
	zodiac: string;
	/** 建除 */
	jianChu: string;
	/** 黄道/黑道名 */
	huangDao: string;
	isHuangDao: boolean;
	/** 相对今天：负数=已过，0=今天，正数=还有几天（按交节日） */
	daysFromToday: number;
	/** 本段节气持续天数 */
	daysToNext: number;
}

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

/** 用 UTC 分量格式化（与 sTerm 日序算法一致） */
function formatTermMoment(d: Date): string {
	return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function daysBetweenUtcDate(a: Date, b: Date): number {
	const ua = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
	const ub = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
	return Math.round((ub - ua) / 86400000);
}

/** 指定公历年的二十四节气列表（小寒→冬至） */
export function listSolarTerms(year: number, now = new Date()): SolarTermItem[] {
	const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, year));
	const todayKey = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

	const raw: {
		index: number;
		name: string;
		startAt: Date;
	}[] = [];

	for (let n = 0; n < 24; n++) {
		raw.push({
			index: n,
			name: solarTerm[n]!,
			startAt: sTermDate(y, n),
		});
	}

	const nextYear = Math.min(YEAR_MAX, y + 1);
	const nextXiaohan = sTermDate(nextYear, 0);

	return raw.map((term, i) => {
		const startAt = term.startAt;
		const endAt = i < raw.length - 1 ? raw[i + 1]!.startAt : nextXiaohan;
		const yearNum = startAt.getUTCFullYear();
		const month = startAt.getUTCMonth() + 1;
		const day = startAt.getUTCDate();
		const week = new Date(yearNum, month - 1, day).getDay();

		const info = calendar(yearNum, month - 1, day);
		const leap = info.isLeap ? '闰' : '';
		const lMonthCn = info.lMonth ? lunarMonthToChinese(info.lMonth) : '';
		const lDayCn = info.lDay ? cDay(info.lDay) : '';
		const lunarText =
			lMonthCn && lDayCn ? `${leap}${lMonthCn}月${lDayCn}` : '';

		const ganzhiText =
			info.cYear && info.cMonth && info.cDay
				? `${info.cYear}年 ${info.cMonth}月 ${info.cDay}日`
				: '';

		const zodiacYear = info.lYear || yearNum;
		const zodiac = Animals[((zodiacYear - 4) % 12 + 12) % 12] ?? '';

		const almanac =
			info.cDay && info.lMonth
				? calcAlmanac(info)
				: { jianChu: '', huangDao: '', isHuangDao: false, yi: [], ji: [] };

		const termDayKey = Date.UTC(yearNum, month - 1, day);
		const daysFromToday = Math.round((termDayKey - todayKey) / 86400000);
		const daysToNext = Math.max(0, daysBetweenUtcDate(startAt, endAt));
		const isCurrent = now.getTime() >= startAt.getTime() && now.getTime() < endAt.getTime();

		return {
			index: term.index,
			name: term.name,
			year: yearNum,
			month,
			day,
			week,
			startAt,
			endAt,
			startText: formatTermMoment(startAt),
			endText: formatTermMoment(endAt),
			isCurrent,
			lunarText,
			ganzhiText,
			zodiac,
			jianChu: almanac.jianChu,
			huangDao: almanac.huangDao,
			isHuangDao: almanac.isHuangDao,
			daysFromToday,
			daysToNext,
		};
	});
}

/** 公历年对应生肖（子鼠起算，与干支年支一致） */
export function zodiacOfYear(year: number): string {
	return Animals[((year - 4) % 12 + 12) % 12]!;
}

/** 公历年地支索引 0=子 … 11=亥 */
export function zhiIndexOfYear(year: number): number {
	return ((year - 4) % 12 + 12) % 12;
}

/** 地支+生肖，如 子鼠、丑牛 */
export function zhiAnimalLabel(zhiIndex: number): string {
	const idx = ((zhiIndex % 12) + 12) % 12;
	return `${Zhi[idx]!}${Animals[idx]!}`;
}

/** 十二生肖筛选标签：子鼠…亥猪 */
export const ZODIAC_TABS = Animals.map((animal, zhiIndex) => ({
	zhiIndex,
	animal,
	zhi: Zhi[zhiIndex]!,
	label: `${Zhi[zhiIndex]!}${animal}`,
}));

/** 公历年干支 */
export function ganzhiOfYear(year: number): string {
	return cyclical(year - 4);
}

/** 天干五行：甲乙木、丙丁火、戊己土、庚辛金、壬癸水 */
const STEM_WUXING = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'] as const;

export type WuXing = (typeof STEM_WUXING)[number];
export type YinYang = '阴' | '阳';

export interface ZodiacYearRow {
	year: number;
	/** 如 丙午 */
	ganzhi: string;
	/** 地支索引 0=子 */
	zhiIndex: number;
	/** 如 午 */
	zhi: string;
	/** 如 马 */
	animal: string;
	/** 如 午马 */
	zhiAnimal: string;
	/** 如 丙午马年 */
	label: string;
	/** 农历新年公历日期 */
	lunarNewYear: Date;
	lunarNewYearText: string;
	wuxing: WuXing;
	yinYang: YinYang;
}

function stemIndexOfYear(year: number): number {
	return ((year - 4) % 10 + 10) % 10;
}

/** 1900–2099 生肖年表行（按公历年） */
export function listZodiacYearRows(
	fromYear = YEAR_MIN,
	toYear = YEAR_MAX,
): ZodiacYearRow[] {
	const start = Math.max(YEAR_MIN, fromYear);
	const end = Math.min(YEAR_MAX, toYear);
	const rows: ZodiacYearRow[] = [];

	for (let y = start; y <= end; y++) {
		const ganzhi = ganzhiOfYear(y);
		const zhiIndex = zhiIndexOfYear(y);
		const zhi = Zhi[zhiIndex]!;
		const animal = Animals[zhiIndex]!;
		const stem = stemIndexOfYear(y);
		const lunarNewYear = lunarToSolar(y, 1, 1, false);
		rows.push({
			year: y,
			ganzhi,
			zhiIndex,
			zhi,
			animal,
			zhiAnimal: `${zhi}${animal}`,
			label: `${ganzhi}${animal}年`,
			lunarNewYear,
			lunarNewYearText: `${lunarNewYear.getFullYear()}年${lunarNewYear.getMonth() + 1}月${lunarNewYear.getDate()}日`,
			wuxing: STEM_WUXING[stem]!,
			yinYang: stem % 2 === 0 ? '阳' : '阴',
		});
	}
	return rows;
}

export interface ZodiacGroup {
	animal: string;
	zhiIndex: number;
	/** 如 子鼠 */
	label: string;
	years: number[];
}

/** 1900–2099 按十二生肖分组的年表 */
export function listZodiacGroups(
	fromYear = YEAR_MIN,
	toYear = YEAR_MAX,
): ZodiacGroup[] {
	const start = Math.max(YEAR_MIN, fromYear);
	const end = Math.min(YEAR_MAX, toYear);
	const groups: ZodiacGroup[] = ZODIAC_TABS.map((tab) => ({
		animal: tab.animal,
		zhiIndex: tab.zhiIndex,
		label: tab.label,
		years: [] as number[],
	}));

	for (let y = start; y <= end; y++) {
		const idx = zhiIndexOfYear(y);
		groups[idx]!.years.push(y);
	}
	return groups;
}

/**
 * 玄空飞星三元九运：自 1864 甲子起，每运 20 年，九运一循环。
 * 如 2024–2043 为下元九紫离火运。
 */
const DAYUN_EPOCH = 1864;
const DAYUN_YUAN = ['上元', '中元', '下元'] as const;
const DAYUN_NAMES = [
	'一白水运',
	'二黑土运',
	'三碧木运',
	'四绿木运',
	'五黄土运',
	'六白金运',
	'七赤金运',
	'八白土运',
	'九紫离火运',
] as const;

export interface DayunInfo {
	/** 1–9 */
	yun: number;
	/** 如 九紫离火运 */
	name: string;
	/** 上元 / 中元 / 下元 */
	yuan: string;
	startYear: number;
	endYear: number;
	/** 如 下元 · 九紫离火运 · 2024–2043 */
	label: string;
}

/** 公历年所属大运（按整年粗分，交运以立春为界时年末年初可能差一年） */
export function dayunOfYear(year: number): DayunInfo {
	const raw = Math.floor((year - DAYUN_EPOCH) / 20);
	const yunIndex = ((raw % 9) + 9) % 9;
	const startYear = DAYUN_EPOCH + raw * 20;
	const name = DAYUN_NAMES[yunIndex]!;
	const yuan = DAYUN_YUAN[Math.floor(yunIndex / 3)]!;
	return {
		yun: yunIndex + 1,
		name,
		yuan,
		startYear,
		endYear: startYear + 19,
		label: `${yuan} · ${name} · ${startYear}–${startYear + 19}`,
	};
}

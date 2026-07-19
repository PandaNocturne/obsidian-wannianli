import { YEAR_MAX, YEAR_MIN } from '../constants';
import { Animals, solarTerm } from '../data/terms';
import { calendar } from './calendar';
import { calcAlmanac } from './day-detail';
import { cDay, lunarMonthToChinese } from './format';
import { cyclical, sTermDate } from './lunar-calc';

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

/** 公历年干支 */
export function ganzhiOfYear(year: number): string {
	return cyclical(year - 4);
}

export interface ZodiacGroup {
	animal: string;
	zhiIndex: number;
	years: number[];
}

/** 1900–2099 按十二生肖分组的年表 */
export function listZodiacGroups(
	fromYear = YEAR_MIN,
	toYear = YEAR_MAX,
): ZodiacGroup[] {
	const start = Math.max(YEAR_MIN, fromYear);
	const end = Math.min(YEAR_MAX, toYear);
	const groups: ZodiacGroup[] = Animals.map((animal, zhiIndex) => ({
		animal,
		zhiIndex,
		years: [] as number[],
	}));

	for (let y = start; y <= end; y++) {
		const idx = ((y - 4) % 12 + 12) % 12;
		groups[idx]!.years.push(y);
	}
	return groups;
}

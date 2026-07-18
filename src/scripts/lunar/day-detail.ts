import { HUANG_DAO, HuangHeDao, JianChu, jianChuJi, jianChuYi } from '../data/almanac';
import { Animals, Zhi } from '../data/terms';
import { calendar } from './calendar';
import { cDay, lunarMonthToChinese } from './format';
import type { CalElement } from './types';

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

export interface DayAlmanac {
	jianChu: string;
	huangDao: string;
	isHuangDao: boolean;
	yi: string[];
	ji: string[];
}

export interface DayDetailModel {
	info: CalElement;
	/** 如 2026年7月18日 星期六 (第29周) */
	headerText: string;
	isToday: boolean;
	/** 生肖年，如 马 */
	zodiac: string;
	/** 农历文案，如 农历六月初五 */
	lunarText: string;
	/** 干支：丙午年 乙未月 癸巳日 */
	ganzhiText: string;
	almanac: DayAlmanac;
	/** 节气 / 节日 / 自定义事件等标签 */
	tags: string[];
}

/** ISO 周序号 */
export function getIsoWeek(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * 农历正月建寅 … 腊月建丑 → 地支索引
 * 正月=1 → 寅=2
 */
function lunarMonthZhiIndex(lMonth: number): number {
	return (lMonth + 1) % 12;
}

function dayZhiIndex(cDayGz: string): number {
	const zhi = cDayGz.slice(-1);
	const idx = Zhi.indexOf(zhi);
	return idx >= 0 ? idx : 0;
}

/** 由农历月与日干支推算建除、黄黑道与宜忌 */
export function calcAlmanac(info: CalElement): DayAlmanac {
	const offset =
		(dayZhiIndex(info.cDay) - lunarMonthZhiIndex(info.lMonth) + 12) % 12;
	const jianChu = JianChu[offset]!;
	const huangDao = HuangHeDao[offset]!;
	return {
		jianChu,
		huangDao,
		isHuangDao: HUANG_DAO.has(huangDao),
		yi: jianChuYi[jianChu],
		ji: jianChuJi[jianChu],
	};
}

export function buildDayDetail(y: number, m: number, d: number): DayDetailModel {
	const info = calendar(y, m - 1, d);
	const date = new Date(y, m - 1, d);
	const today = new Date();
	const isToday =
		today.getFullYear() === y && today.getMonth() === m - 1 && today.getDate() === d;

	const week = WEEK_CN[info.week] ?? '';
	const weekNo = getIsoWeek(date);
	const zodiacYear = info.lYear || y;
	const zodiac = Animals[(zodiacYear - 4) % 12]!;

	const leap = info.isLeap ? '闰' : '';
	const lMonthCn = info.lMonth ? lunarMonthToChinese(info.lMonth) : '';
	const lDayCn = info.lDay ? cDay(info.lDay) : '';

	const tags: string[] = [];
	if (info.solarTerms) tags.push(info.solarTerms);
	if (info.solarFestival) {
		for (const part of info.solarFestival.split(/\s+/)) {
			if (part) tags.push(part);
		}
	}
	if (info.lunarFestival) {
		for (const part of info.lunarFestival.split(/\s+/)) {
			if (part) tags.push(part);
		}
	}

	const almanac = info.cDay && info.lMonth ? calcAlmanac(info) : {
		jianChu: '',
		huangDao: '',
		isHuangDao: false,
		yi: [] as string[],
		ji: [] as string[],
	};

	return {
		info,
		headerText: `${y}年${m}月${d}日 星期${week} (第${weekNo}周)`,
		isToday,
		zodiac: String(zodiac),
		lunarText: `农历${leap}${lMonthCn}月${lDayCn}`,
		ganzhiText: `${info.cYear}年 ${info.cMonth}月 ${info.cDay}日`,
		almanac,
		tags,
	};
}

/** 公历日期加减一天（返回 y,m,d 月为 1–12） */
export function shiftSolarDate(
	y: number,
	m: number,
	d: number,
	delta: number,
): { y: number; m: number; d: number } {
	const date = new Date(y, m - 1, d + delta);
	return {
		y: date.getFullYear(),
		m: date.getMonth() + 1,
		d: date.getDate(),
	};
}

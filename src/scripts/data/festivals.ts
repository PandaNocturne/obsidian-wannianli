import type { EventKind } from './settings';

/**
 * 公历节日：MMDD + 空格 + 名称
 */
export const sFtv = [
	'0101 元旦',
	'0214 情人节',
	'0308 妇女节',
	'0312 植树节',
	'0315 消费者权益日',
	'0401 愚人节',
	'0501 劳动节',
	'0504 青年节',
	'0512 护士节',
	'0601 儿童节',
	'0701 建党节 香港回归日',
	'0801 建军节',
	'0808 父亲节',
	'0910 教师节',
	'0928 孔子诞辰',
	'1001 国庆节',
	'1006 老人节',
	'1024 联合国日',
	'1031 万圣节',
	'1112 孙中山诞辰纪念',
	'1220 澳门回归日',
	'1225 圣诞节',
];

/**
 * 农历节日：MMDD + 空格 + 名称
 * day=00 表示除夕（农历十二月最后一天）
 * （个人纪念日请通过日历点击日期添加，存于插件设置）
 */
export const lFtv = [
	'0101 春节',
	'0115 元宵节',
	'0505 端午节',
	'0707 七夕节',
	'0715 中元节',
	'0815 中秋节',
	'0909 重阳节',
	'1208 腊八节',
	'1224 小年',
	'0100 除夕',
];

/** 内置节假日条目 */
export interface BuiltInFestival {
	kind: EventKind;
	/** 1–12；除夕为 12 */
	month: number;
	/** 1–31；除夕为 0 */
	day: number;
	name: string;
}

function parseFestivalEntries(items: string[], kind: EventKind): BuiltInFestival[] {
	const result: BuiltInFestival[] = [];
	for (const item of items) {
		const month = parseInt(item.substring(0, 2), 10);
		const day = parseInt(item.substring(2, 4), 10);
		if (Number.isNaN(month) || Number.isNaN(day)) continue;
		const rest = item.substring(5).trim();
		for (const name of rest.split(/\s+/)) {
			if (!name) continue;
			result.push({
				kind,
				month: name === '除夕' ? 12 : month,
				day,
				name,
			});
		}
	}
	return result;
}

function pad2(n: number): string {
	return n < 10 ? '0' + n : String(n);
}

/** 内置节假日稳定 id，用于入库与去重 */
export function builtinEventId(festival: BuiltInFestival): string {
	return `builtin-${festival.kind}-${pad2(festival.month)}${pad2(festival.day)}-${festival.name}`;
}

/** 全部内置节假日（按月日排序） */
export function listBuiltInFestivals(): BuiltInFestival[] {
	const all = [...parseFestivalEntries(sFtv, 'solar'), ...parseFestivalEntries(lFtv, 'lunar')];
	return all.sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === 'solar' ? -1 : 1;
		if (a.month !== b.month) return a.month - b.month;
		if (a.day !== b.day) return a.day - b.day;
		return a.name.localeCompare(b.name, 'zh-CN');
	});
}

/** 命中指定月日的内置节假日（不含除夕特殊日） */
export function findBuiltInFestivals(
	kind: EventKind,
	month: number,
	day: number,
): BuiltInFestival[] {
	return listBuiltInFestivals().filter(
		(f) => f.kind === kind && f.month === month && f.day === day,
	);
}

export function formatBuiltInFestivalDate(festival: BuiltInFestival): string {
	if (festival.name === '除夕' || festival.day === 0) {
		return '农历十二月 除夕';
	}
	return festival.kind === 'solar'
		? `阳历 ${festival.month}月${festival.day}日`
		: `阴历 ${festival.month}月${festival.day}日`;
}

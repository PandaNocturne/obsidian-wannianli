/** 单日公历/农历/节气信息 */
export interface CalElement {
	sYear: number;
	sMonth: number;
	sDay: number;
	week: number;
	lYear: number;
	lMonth: number;
	lDay: number;
	isLeap: boolean;
	cYear: string;
	cMonth: string;
	cDay: string;
	solarTerms: string;
	solarFestival: string;
	lunarFestival: string;
}

export function createCalElement(): CalElement {
	return {
		sYear: 0,
		sMonth: 0,
		sDay: 0,
		week: 0,
		lYear: 0,
		lMonth: 0,
		lDay: 0,
		isLeap: false,
		cYear: '',
		cMonth: '',
		cDay: '',
		solarTerms: '',
		solarFestival: '',
		lunarFestival: '',
	};
}

/** Lunar() 计算结果 */
export interface LunarResult {
	year: number;
	month: number;
	day: number;
	isLeap: boolean;
	yearCyl: number;
	monCyl: number;
	dayCyl: number;
}

/** 月历网格中的一格 */
export interface DayCell {
	/** 是否为本月有效日期 */
	valid: boolean;
	/** 公历日（1–31），无效格为 0 */
	solarDay: number;
	/** 周几：0=日 … 6=六（Date.getDay） */
	week: number;
	/** 格子列：0=一 … 6=日 */
	col: number;
	info: CalElement;
	/** 格子下方显示文字（节日/节气/农历） */
	label: string;
	isToday: boolean;
}

/** 整月数据 */
export interface MonthData {
	year: number;
	/** 0–11 */
	month: number;
	cells: DayCell[];
	/** 本月第一天所在格子索引（周一为首） */
	firstDayIndex: number;
	gzText: string;
}

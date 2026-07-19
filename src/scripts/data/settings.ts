import { YEAR_MAX, YEAR_MIN } from '../constants';

/** 自定义事件类型：阳历（公历）或阴历（农历） */
export type EventKind = 'solar' | 'lunar';

/** 内置节假日标签页：展示系统节假日，不可删除 */
export const BUILTIN_CATEGORY_ID = 'builtin';

/** 默认「生日」标签页 */
export const BIRTHDAY_CATEGORY_ID = 'birthday';

/** 事件标签页（范围） */
export interface EventCategory {
	id: string;
	name: string;
	/** 内置标签不可删除/改名 */
	locked?: boolean;
}

/** 用户自定义事件（按月日每年重复） */
export interface CustomEvent {
	id: string;
	name: string;
	kind: EventKind;
	/** 所属标签页（可为 builtin） */
	categoryId: string;
	/** 1–12 */
	month: number;
	/** 1–31；除夕为 0 */
	day: number;
	/** 是否在日历中显示 */
	visible: boolean;
	/** 备注（可选） */
	note?: string;
	/** 生效起始公历年（可选，空=无限制） */
	startYear?: number;
	/** 生效结束公历年（可选，空=无限制） */
	endYear?: number;
	/** 由内置节假日种子生成 */
	builtin?: boolean;
}

/** 国务院放假安排单日（holiday-cn） */
export interface HolidayDay {
	name: string;
	date: string; // YYYY-MM-DD
	isOffDay: boolean; // true=放假, false=补班
}

export interface HolidayCache {
	updatedAt: number;
	years: Record<string, HolidayDay[]>;
}

export interface WannianliSettings {
	eventCategories: EventCategory[];
	customEvents: CustomEvent[];
	/** 已删除的内置事件 id，避免再次种子写入 */
	removedBuiltinIds: string[];
	/** 月历是否显示周次列 */
	showWeekNumbers: boolean;
	/** 是否启用按月彩色主题 */
	colorfulTheme: boolean;
	/** 月卡片最小宽度（px），用于自适应列数 */
	monthWidth: number;
	/** 月卡片网格间距（px） */
	gridGap: number;
	/** 国务院法定节假日 / 调休本地缓存 */
	holidayCache: HolidayCache;
}

export const DEFAULT_EVENT_CATEGORIES: EventCategory[] = [
	{ id: BUILTIN_CATEGORY_ID, name: '内置', locked: true },
	{ id: BIRTHDAY_CATEGORY_ID, name: '生日' },
];

/** 从原 festivals 个人生日迁入的默认自定义事件 */
export const DEFAULT_CUSTOM_EVENTS: CustomEvent[] = [
	{ id: 'default-guo', name: '郭XX生日', kind: 'lunar', categoryId: BIRTHDAY_CATEGORY_ID, month: 9, day: 24, visible: true },
	{ id: 'default-liu', name: '刘xx生日', kind: 'lunar', categoryId: BIRTHDAY_CATEGORY_ID, month: 11, day: 8, visible: true },
	{ id: 'default-qiu', name: '邱xx生日', kind: 'lunar', categoryId: BIRTHDAY_CATEGORY_ID, month: 2, day: 13, visible: true },
	{ id: 'default-mom', name: '老妈生日', kind: 'lunar', categoryId: BIRTHDAY_CATEGORY_ID, month: 5, day: 12, visible: true },
	{ id: 'default-li', name: '李xx生日', kind: 'lunar', categoryId: BIRTHDAY_CATEGORY_ID, month: 5, day: 18, visible: true },
	{ id: 'default-yang', name: '杨xx生日', kind: 'lunar', categoryId: BIRTHDAY_CATEGORY_ID, month: 6, day: 25, visible: true },
	{ id: 'default-dad', name: '老爸生日', kind: 'lunar', categoryId: BIRTHDAY_CATEGORY_ID, month: 7, day: 12, visible: true },
	{ id: 'default-ouyang', name: '欧阳xx生日', kind: 'lunar', categoryId: BIRTHDAY_CATEGORY_ID, month: 7, day: 18, visible: true },
];

export const GRID_GAP_MIN = 0;
export const GRID_GAP_MAX = 32;
export const GRID_GAP_DEFAULT = 10;

export const MONTH_WIDTH_MIN = 300;
export const MONTH_WIDTH_MAX = 600;
export const MONTH_WIDTH_DEFAULT = 420;

export const DEFAULT_HOLIDAY_CACHE: HolidayCache = {
	updatedAt: 0,
	years: {},
};

export const DEFAULT_SETTINGS: WannianliSettings = {
	eventCategories: DEFAULT_EVENT_CATEGORIES.map((c) => ({ ...c })),
	customEvents: DEFAULT_CUSTOM_EVENTS.map((e) => ({ ...e })),
	removedBuiltinIds: [],
	showWeekNumbers: false,
	colorfulTheme: true,
	monthWidth: MONTH_WIDTH_DEFAULT,
	gridGap: GRID_GAP_DEFAULT,
	holidayCache: { ...DEFAULT_HOLIDAY_CACHE, years: {} },
};

export function clampGridGap(value: number): number {
	if (!Number.isFinite(value)) return GRID_GAP_DEFAULT;
	return Math.min(GRID_GAP_MAX, Math.max(GRID_GAP_MIN, Math.round(value)));
}

export function clampMonthWidth(value: number): number {
	if (!Number.isFinite(value)) return MONTH_WIDTH_DEFAULT;
	return Math.min(MONTH_WIDTH_MAX, Math.max(MONTH_WIDTH_MIN, Math.round(value)));
}

export function normalizeDisplaySettings(
	raw: Partial<WannianliSettings> | null | undefined,
): Pick<
	WannianliSettings,
	'showWeekNumbers' | 'colorfulTheme' | 'monthWidth' | 'gridGap'
> {
	return {
		showWeekNumbers: raw?.showWeekNumbers === true,
		colorfulTheme: raw?.colorfulTheme !== false,
		monthWidth: clampMonthWidth(
			typeof raw?.monthWidth === 'number' ? raw.monthWidth : MONTH_WIDTH_DEFAULT,
		),
		gridGap: clampGridGap(
			typeof raw?.gridGap === 'number' ? raw.gridGap : GRID_GAP_DEFAULT,
		),
	};
}

export function createEventId(): string {
	return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCategoryId(): string {
	return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 解析可选公历年份；空/非法返回 undefined */
export function normalizeOptionalYear(raw: unknown): number | undefined {
	if (raw === null || raw === undefined || raw === '') return undefined;
	const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
	if (!Number.isFinite(n)) return undefined;
	const y = Math.round(n);
	if (y < YEAR_MIN || y > YEAR_MAX) return undefined;
	return y;
}

/** 规范化起止年：空=无限制；若起 > 止则交换 */
export function normalizeYearRange(
	startRaw: unknown,
	endRaw: unknown,
): { startYear?: number; endYear?: number } {
	let startYear = normalizeOptionalYear(startRaw);
	let endYear = normalizeOptionalYear(endRaw);
	if (startYear !== undefined && endYear !== undefined && startYear > endYear) {
		const tmp = startYear;
		startYear = endYear;
		endYear = tmp;
	}
	return {
		...(startYear !== undefined ? { startYear } : {}),
		...(endYear !== undefined ? { endYear } : {}),
	};
}

/** 事件是否在指定公历年生效（空年份=无限制） */
export function eventMatchesYear(
	event: Pick<CustomEvent, 'startYear' | 'endYear'>,
	year: number,
): boolean {
	if (event.startYear !== undefined && year < event.startYear) return false;
	if (event.endYear !== undefined && year > event.endYear) return false;
	return true;
}

/** 兼容旧 visibility / 缺省 categoryId */
function resolveCategoryId(
	raw: Partial<CustomEvent> & { visibility?: string },
	validIds: Set<string>,
): string {
	if (typeof raw.categoryId === 'string' && validIds.has(raw.categoryId)) {
		return raw.categoryId;
	}
	if (raw.builtin || (typeof raw.id === 'string' && raw.id.startsWith('builtin-'))) {
		return BUILTIN_CATEGORY_ID;
	}
	if (validIds.has(BIRTHDAY_CATEGORY_ID)) return BIRTHDAY_CATEGORY_ID;
	const firstCustom = [...validIds].find((id) => id !== BUILTIN_CATEGORY_ID);
	return firstCustom ?? BIRTHDAY_CATEGORY_ID;
}

export function normalizeEventCategories(raw: unknown): EventCategory[] {
	const list: EventCategory[] = [];
	const seen = new Set<string>();

	if (Array.isArray(raw)) {
		for (const item of raw) {
			if (!item || typeof item !== 'object') continue;
			const c = item as Partial<EventCategory>;
			if (typeof c.id !== 'string' || typeof c.name !== 'string') continue;
			if (seen.has(c.id)) continue;
			const name = c.name.trim();
			if (c.id === BUILTIN_CATEGORY_ID) {
				list.push({ id: BUILTIN_CATEGORY_ID, name: '内置', locked: true });
				seen.add(c.id);
				continue;
			}
			if (!name) continue;
			list.push({ id: c.id, name });
			seen.add(c.id);
		}
	}

	if (!seen.has(BUILTIN_CATEGORY_ID)) {
		list.unshift({ id: BUILTIN_CATEGORY_ID, name: '内置', locked: true });
	}
	if (!seen.has(BIRTHDAY_CATEGORY_ID)) {
		list.push({ id: BIRTHDAY_CATEGORY_ID, name: '生日' });
	}

	return list;
}

export function normalizeCustomEvent(
	raw: Partial<CustomEvent> & {
		id: string;
		name: string;
		kind: EventKind;
		month: number;
		day: number;
		visibility?: string;
	},
	validCategoryIds: Set<string>,
): CustomEvent {
	const builtin =
		Boolean(raw.builtin) || raw.id.startsWith('builtin-');
	const years = normalizeYearRange(raw.startYear, raw.endYear);
	return {
		id: raw.id,
		name: raw.name,
		kind: raw.kind === 'solar' ? 'solar' : 'lunar',
		categoryId: resolveCategoryId(raw, validCategoryIds),
		month: raw.month,
		day: raw.day,
		visible: raw.visible !== false,
		note: typeof raw.note === 'string' ? raw.note.trim() : '',
		...years,
		builtin: builtin || undefined,
	};
}

export function normalizeCustomEvents(
	events: unknown,
	categories: EventCategory[],
): CustomEvent[] {
	const validIds = new Set(categories.map((c) => c.id));
	if (!Array.isArray(events)) return [];
	const result: CustomEvent[] = [];
	for (const item of events) {
		if (!item || typeof item !== 'object') continue;
		const e = item as Partial<CustomEvent> & { visibility?: string };
		if (
			typeof e.id !== 'string' ||
			typeof e.name !== 'string' ||
			(e.kind !== 'solar' && e.kind !== 'lunar') ||
			typeof e.month !== 'number' ||
			typeof e.day !== 'number'
		) {
			continue;
		}
		result.push(
			normalizeCustomEvent(
				{
					id: e.id,
					name: e.name,
					kind: e.kind,
					categoryId: e.categoryId,
					visibility: e.visibility,
					month: e.month,
					day: e.day,
					visible: e.visible,
					note: e.note,
					startYear: e.startYear,
					endYear: e.endYear,
					builtin: e.builtin,
				},
				validIds,
			),
		);
	}
	return result;
}

export function normalizeRemovedBuiltinIds(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function normalizeHolidayCache(raw: unknown): HolidayCache {
	if (!raw || typeof raw !== 'object') {
		return { updatedAt: 0, years: {} };
	}
	const obj = raw as Partial<HolidayCache>;
	const updatedAt =
		typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt)
			? obj.updatedAt
			: 0;
	const years: Record<string, HolidayDay[]> = {};
	if (obj.years && typeof obj.years === 'object') {
		for (const [key, list] of Object.entries(obj.years)) {
			if (!Array.isArray(list)) continue;
			const days: HolidayDay[] = [];
			for (const item of list) {
				if (!item || typeof item !== 'object') continue;
				const d = item as Partial<HolidayDay>;
				if (
					typeof d.name !== 'string' ||
					typeof d.date !== 'string' ||
					typeof d.isOffDay !== 'boolean'
				) {
					continue;
				}
				if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) continue;
				days.push({ name: d.name, date: d.date, isOffDay: d.isOffDay });
			}
			years[key] = days;
		}
	}
	return { updatedAt, years };
}

export function userEventCategories(categories: EventCategory[]): EventCategory[] {
	return categories.filter((c) => c.id !== BUILTIN_CATEGORY_ID);
}

/** 自定义事件类型：阳历（公历）或阴历（农历） */
export type EventKind = 'solar' | 'lunar';

/** 内置「默认」标签页：展示系统节假日，不可删除 */
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
	/** 由内置节假日种子生成 */
	builtin?: boolean;
}

export interface WannianliSettings {
	eventCategories: EventCategory[];
	customEvents: CustomEvent[];
	/** 已删除的内置事件 id，避免再次种子写入 */
	removedBuiltinIds: string[];
}

export const DEFAULT_EVENT_CATEGORIES: EventCategory[] = [
	{ id: BUILTIN_CATEGORY_ID, name: '默认', locked: true },
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

export const DEFAULT_SETTINGS: WannianliSettings = {
	eventCategories: DEFAULT_EVENT_CATEGORIES.map((c) => ({ ...c })),
	customEvents: DEFAULT_CUSTOM_EVENTS.map((e) => ({ ...e })),
	removedBuiltinIds: [],
};

export function createEventId(): string {
	return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCategoryId(): string {
	return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

	list.push({ id: BUILTIN_CATEGORY_ID, name: '默认', locked: true });
	seen.add(BUILTIN_CATEGORY_ID);

	if (Array.isArray(raw)) {
		for (const item of raw) {
			if (!item || typeof item !== 'object') continue;
			const c = item as Partial<EventCategory>;
			if (typeof c.id !== 'string' || typeof c.name !== 'string') continue;
			if (c.id === BUILTIN_CATEGORY_ID || seen.has(c.id)) continue;
			const name = c.name.trim();
			if (!name) continue;
			list.push({ id: c.id, name });
			seen.add(c.id);
		}
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
	return {
		id: raw.id,
		name: raw.name,
		kind: raw.kind === 'solar' ? 'solar' : 'lunar',
		categoryId: resolveCategoryId(raw, validCategoryIds),
		month: raw.month,
		day: raw.day,
		visible: raw.visible !== false,
		note: typeof raw.note === 'string' ? raw.note.trim() : '',
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

export function userEventCategories(categories: EventCategory[]): EventCategory[] {
	return categories.filter((c) => c.id !== BUILTIN_CATEGORY_ID);
}

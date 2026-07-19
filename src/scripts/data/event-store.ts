import { builtinEventId, listBuiltInFestivals } from './festivals';
import {
	BIRTHDAY_CATEGORY_ID,
	BUILTIN_CATEGORY_ID,
	eventMatchesYear,
	normalizeCustomEvent,
	normalizeCustomEvents,
	normalizeEventCategories,
	normalizeRemovedBuiltinIds,
	type CustomEvent,
	type EventCategory,
	type EventKind,
} from './settings';

let eventCategories: EventCategory[] = [];
let customEvents: CustomEvent[] = [];
let removedBuiltinIds: string[] = [];

function validCategoryIds(): Set<string> {
	return new Set(eventCategories.map((c) => c.id));
}

/** 将缺失的内置节假日写入事件列表 */
export function ensureBuiltinEvents(events: CustomEvent[]): CustomEvent[] {
	const existing = new Set(events.map((e) => e.id));
	const next = [...events];
	for (const f of listBuiltInFestivals()) {
		const id = builtinEventId(f);
		if (existing.has(id)) continue;
		next.push({
			id,
			name: f.name,
			kind: f.kind,
			categoryId: BUILTIN_CATEGORY_ID,
			month: f.month,
			day: f.day,
			visible: true,
			builtin: true,
		});
	}
	return next;
}

export function setEventCategories(categories: EventCategory[]): void {
	eventCategories = normalizeEventCategories(categories);
}

export function getEventCategories(): EventCategory[] {
	return eventCategories.map((c) => ({ ...c }));
}

export function setRemovedBuiltinIds(ids: string[]): void {
	removedBuiltinIds = normalizeRemovedBuiltinIds(ids);
}

export function getRemovedBuiltinIds(): string[] {
	return [...removedBuiltinIds];
}

export function setCustomEvents(events: CustomEvent[]): void {
	// 忽略历史 removedBuiltinIds，始终补全内置节日
	removedBuiltinIds = [];
	customEvents = ensureBuiltinEvents(normalizeCustomEvents(events, eventCategories));
}

export function getCustomEvents(): CustomEvent[] {
	return customEvents.map((e) => ({ ...e }));
}

export function upsertCustomEvent(event: CustomEvent): CustomEvent[] {
	const next = normalizeCustomEvent(event, validCategoryIds());
	const idx = customEvents.findIndex((e) => e.id === next.id);
	if (idx >= 0) {
		const prev = customEvents[idx]!;
		customEvents[idx] = {
			...next,
			builtin: prev.builtin || next.builtin,
		};
	} else {
		customEvents.push(next);
	}
	return getCustomEvents();
}

export function removeCustomEvent(id: string): CustomEvent[] {
	const existing = customEvents.find((e) => e.id === id);
	if (!existing || existing.builtin) {
		return getCustomEvents();
	}
	customEvents = customEvents.filter((e) => e.id !== id);
	return getCustomEvents();
}

export function upsertEventCategory(category: EventCategory): EventCategory[] {
	if (category.id === BUILTIN_CATEGORY_ID) {
		return getEventCategories();
	}
	const name = category.name.trim();
	if (!name) return getEventCategories();

	const idx = eventCategories.findIndex((c) => c.id === category.id);
	if (idx >= 0) {
		const existing = eventCategories[idx]!;
		if (existing.locked) return getEventCategories();
		eventCategories[idx] = { id: category.id, name };
	} else {
		eventCategories.push({ id: category.id, name });
	}
	return getEventCategories();
}

/** 按给定 id 顺序重排标签页 */
export function reorderEventCategories(orderedIds: string[]): EventCategory[] {
	const byId = new Map(eventCategories.map((c) => [c.id, c]));
	const next: EventCategory[] = [];
	const seen = new Set<string>();

	for (const id of orderedIds) {
		const cat = byId.get(id);
		if (!cat || seen.has(id)) continue;
		next.push({ ...cat });
		seen.add(id);
	}
	for (const cat of eventCategories) {
		if (seen.has(cat.id)) continue;
		next.push({ ...cat });
	}

	eventCategories = normalizeEventCategories(next);
	return getEventCategories();
}

/** 删除标签页：事件迁移到生日（或首个可用标签） */
export function removeEventCategory(id: string): {
	categories: EventCategory[];
	events: CustomEvent[];
} {
	if (id === BUILTIN_CATEGORY_ID) {
		return { categories: getEventCategories(), events: getCustomEvents() };
	}

	const userCats = eventCategories.filter((c) => c.id !== BUILTIN_CATEGORY_ID);
	if (userCats.length <= 1) {
		return { categories: getEventCategories(), events: getCustomEvents() };
	}

	eventCategories = eventCategories.filter((c) => c.id !== id);
	const fallback =
		eventCategories.find((c) => c.id === BIRTHDAY_CATEGORY_ID)?.id ??
		eventCategories.find((c) => c.id !== BUILTIN_CATEGORY_ID)?.id ??
		BIRTHDAY_CATEGORY_ID;

	customEvents = customEvents.map((e) =>
		e.categoryId === id ? { ...e, categoryId: fallback } : e,
	);

	return { categories: getEventCategories(), events: getCustomEvents() };
}

export function findCustomEvents(
	kind: EventKind,
	month: number,
	day: number,
	year?: number,
): CustomEvent[] {
	return customEvents.filter((e) => {
		if (e.kind !== kind || e.month !== month || e.day !== day) return false;
		if (year !== undefined && !eventMatchesYear(e, year)) return false;
		return true;
	});
}

export function findCustomEventsByCategory(categoryId: string): CustomEvent[] {
	return customEvents.filter((e) => e.categoryId === categoryId);
}

/** 公历节日名：仅显示 visible 且年份范围内的事件 */
export function getSolarFestivalNames(
	month: number,
	day: number,
	year: number,
): string {
	return customEvents
		.filter(
			(e) =>
				e.visible &&
				e.kind === 'solar' &&
				e.month === month &&
				e.day === day &&
				eventMatchesYear(e, year),
		)
		.map((e) => e.name)
		.join(' ');
}

/** 农历节日名：仅显示 visible 且年份范围内的事件（不含除夕 day=0） */
export function getLunarFestivalNames(
	month: number,
	day: number,
	year: number,
): string {
	return customEvents
		.filter(
			(e) =>
				e.visible &&
				e.kind === 'lunar' &&
				e.month === month &&
				e.day === day &&
				eventMatchesYear(e, year),
		)
		.map((e) => e.name)
		.join(' ');
}

/** 除夕文案；不可见或超出年份范围时返回 null */
export function getChuxiLabel(year: number): string | null {
	const event = customEvents.find(
		(e) => e.kind === 'lunar' && e.month === 12 && e.day === 0,
	);
	if (!event) return '除夕';
	if (!event.visible || !eventMatchesYear(event, year)) return null;
	return event.name;
}

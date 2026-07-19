import { lFtv, sFtv } from './festivals';
import {
	BIRTHDAY_CATEGORY_ID,
	BUILTIN_CATEGORY_ID,
	normalizeCustomEvent,
	normalizeCustomEvents,
	normalizeEventCategories,
	type CustomEvent,
	type EventCategory,
	type EventKind,
} from './settings';

let eventCategories: EventCategory[] = [];
let customEvents: CustomEvent[] = [];

function pad2(n: number): string {
	return n < 10 ? '0' + n : String(n);
}

function parseBuiltIn(items: string[], month: number, day: number): string[] {
	const mm = pad2(month);
	const dd = pad2(day);
	const names: string[] = [];
	for (const item of items) {
		if (item.substring(0, 2) === mm && item.substring(2, 4) === dd) {
			const name = item.substring(5).trim();
			if (name) names.push(name);
		}
	}
	return names;
}

function validCategoryIds(): Set<string> {
	return new Set(eventCategories.map((c) => c.id));
}

export function setEventCategories(categories: EventCategory[]): void {
	eventCategories = normalizeEventCategories(categories);
}

export function getEventCategories(): EventCategory[] {
	return eventCategories.map((c) => ({ ...c }));
}

export function setCustomEvents(events: CustomEvent[]): void {
	customEvents = normalizeCustomEvents(events, eventCategories);
}

export function getCustomEvents(): CustomEvent[] {
	return customEvents.map((e) => ({ ...e }));
}

export function upsertCustomEvent(event: CustomEvent): CustomEvent[] {
	const next = normalizeCustomEvent(event, validCategoryIds());
	const idx = customEvents.findIndex((e) => e.id === next.id);
	if (idx >= 0) {
		customEvents[idx] = next;
	} else {
		customEvents.push(next);
	}
	return getCustomEvents();
}

export function removeCustomEvent(id: string): CustomEvent[] {
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
): CustomEvent[] {
	return customEvents.filter(
		(e) => e.kind === kind && e.month === month && e.day === day,
	);
}

export function findCustomEventsByCategory(categoryId: string): CustomEvent[] {
	return customEvents.filter((e) => e.categoryId === categoryId);
}

/** 公历节日名：内置 + 自定义阳历（空格拼接） */
export function getSolarFestivalNames(month: number, day: number): string {
	const builtIn = parseBuiltIn(sFtv, month, day);
	const custom = findCustomEvents('solar', month, day).map((e) => e.name);
	return [...builtIn, ...custom].join(' ');
}

/** 农历节日名：内置 + 自定义阴历（空格拼接） */
export function getLunarFestivalNames(month: number, day: number): string {
	const builtIn = parseBuiltIn(lFtv, month, day);
	const custom = findCustomEvents('lunar', month, day).map((e) => e.name);
	return [...builtIn, ...custom].join(' ');
}

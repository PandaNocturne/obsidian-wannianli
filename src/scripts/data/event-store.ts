import { lFtv, sFtv } from './festivals';
import type { CustomEvent, EventKind } from './settings';

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

export function setCustomEvents(events: CustomEvent[]): void {
	customEvents = events.map((e) => ({ ...e }));
}

export function getCustomEvents(): CustomEvent[] {
	return customEvents.map((e) => ({ ...e }));
}

export function upsertCustomEvent(event: CustomEvent): CustomEvent[] {
	const idx = customEvents.findIndex((e) => e.id === event.id);
	if (idx >= 0) {
		customEvents[idx] = { ...event };
	} else {
		customEvents.push({ ...event });
	}
	return getCustomEvents();
}

export function removeCustomEvent(id: string): CustomEvent[] {
	customEvents = customEvents.filter((e) => e.id !== id);
	return getCustomEvents();
}

/** 命中指定月日的自定义事件 */
export function findCustomEvents(
	kind: EventKind,
	month: number,
	day: number,
): CustomEvent[] {
	return customEvents.filter(
		(e) => e.kind === kind && e.month === month && e.day === day,
	);
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

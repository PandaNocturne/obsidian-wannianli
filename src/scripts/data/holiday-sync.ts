import { Notice, requestUrl } from 'obsidian';
import {
	normalizeHolidayCache,
	type HolidayCache,
	type HolidayDay,
	type WannianliSettings,
} from './settings';

const CDN_URL = (year: number) =>
	`https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`;
const RAW_URL = (year: number) =>
	`https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`;

const SYNC_TTL_MS = 24 * 60 * 60 * 1000;

export interface HolidaySyncHost {
	settings: WannianliSettings;
	saveSettings(): Promise<void>;
}

let holidayCache: HolidayCache = { updatedAt: 0, years: {} };
let syncNoticeShown = false;

export function setHolidayCache(cache: HolidayCache): void {
	holidayCache = normalizeHolidayCache(cache);
}

export function getHolidayCache(): HolidayCache {
	return {
		updatedAt: holidayCache.updatedAt,
		years: { ...holidayCache.years },
	};
}

function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

/** 查本地缓存：放假 / 补班；无数据返回 null */
export function getDayHolidayInfo(
	year: number,
	month: number,
	day: number,
): HolidayDay | null {
	const key = String(year);
	const list = holidayCache.years[key];
	if (!list?.length) return null;
	const date = `${year}-${pad2(month)}-${pad2(day)}`;
	return list.find((d) => d.date === date) ?? null;
}

function parseYearPayload(data: unknown, year: number): HolidayDay[] | null {
	if (!data || typeof data !== 'object') return null;
	const obj = data as { year?: number; days?: unknown };
	if (obj.year !== year || !Array.isArray(obj.days)) return null;
	const days: HolidayDay[] = [];
	for (const item of obj.days) {
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
	return days;
}

/** 拉取单年国务院放假数据；未发布返回 null；网络错误抛出 */
export async function fetchHolidayYear(year: number): Promise<HolidayDay[] | null> {
	const urls = [CDN_URL(year), RAW_URL(year)];
	let lastError: unknown = null;
	let notFound = false;

	for (const url of urls) {
		try {
			const res = await requestUrl({ url, throw: false });
			if (res.status === 404) {
				notFound = true;
				continue;
			}
			if (res.status < 200 || res.status >= 300) {
				lastError = new Error(`HTTP ${res.status}`);
				continue;
			}
			const days = parseYearPayload(res.json, year);
			if (days) return days;
			lastError = new Error('invalid holiday payload');
		} catch (err) {
			lastError = err;
		}
	}

	if (notFound && lastError === null) return null;
	if (lastError instanceof Error) throw lastError;
	if (lastError !== null && lastError !== undefined) {
		throw new Error(
			typeof lastError === 'string' ? lastError : 'holiday fetch failed',
		);
	}
	return null;
}

function yearsToSync(now = new Date()): number[] {
	const y = now.getFullYear();
	return [y - 1, y, y + 1];
}

/**
 * 同步近年节假日到 settings.holidayCache。
 * 24h 内已更新则跳过联网；失败不打断日历。
 * @returns 是否写入了可用的新年份数据（视图可刷新）
 */
export async function syncHolidayCache(plugin: HolidaySyncHost): Promise<boolean> {
	const current = normalizeHolidayCache(plugin.settings.holidayCache);
	setHolidayCache(current);

	const now = Date.now();
	if (current.updatedAt > 0 && now - current.updatedAt < SYNC_TTL_MS) {
		return false;
	}

	const years = yearsToSync();
	const nextYears: Record<string, HolidayDay[]> = { ...current.years };
	let fetchedAny = false;
	let hardFail = false;

	for (const year of years) {
		try {
			const days = await fetchHolidayYear(year);
			if (days === null) continue;
			nextYears[String(year)] = days;
			fetchedAny = true;
		} catch (err) {
			hardFail = true;
			console.warn(`[万年历] holiday sync failed for ${year}`, err);
		}
	}

	if (!fetchedAny && hardFail) {
		if (!syncNoticeShown) {
			syncNoticeShown = true;
			new Notice('节假日数据同步失败，将使用本地缓存', 4000);
		}
		return false;
	}

	plugin.settings.holidayCache = {
		updatedAt: now,
		years: nextYears,
	};
	setHolidayCache(plugin.settings.holidayCache);
	await plugin.saveSettings();
	return fetchedAny;
}

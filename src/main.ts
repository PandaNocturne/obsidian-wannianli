import { Plugin, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_WANNIANLI } from './scripts/constants';
import {
	getCustomEvents,
	getRemovedBuiltinIds,
	setCustomEvents,
	setEventCategories,
	setRemovedBuiltinIds,
} from './scripts/data/event-store';
import { setHolidayCache, syncHolidayCache } from './scripts/data/holiday-sync';
import {
	DEFAULT_SETTINGS,
	normalizeCustomEvents,
	normalizeDisplaySettings,
	normalizeEventCategories,
	normalizeHolidayCache,
	normalizeRemovedBuiltinIds,
	type WannianliSettings,
} from './scripts/data/settings';
import { WannianliView } from './scripts/views/calendar-view';

export default class WannianliPlugin extends Plugin {
	settings: WannianliSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_WANNIANLI,
			(leaf) => new WannianliView(leaf, this),
		);

		this.addRibbonIcon('calendar-days', '打开万年历', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open',
			name: '打开',
			callback: () => {
				void this.activateView();
			},
		});

		void this.syncHolidaysInBackground();
	}

	/** 异步同步国务院放假数据，不阻塞视图打开 */
	private async syncHolidaysInBackground(): Promise<void> {
		try {
			const changed = await syncHolidayCache(this);
			if (changed) this.refreshOpenViews();
		} catch (err) {
			console.warn('[万年历] holiday sync error', err);
		}
	}

	refreshOpenViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_WANNIANLI)) {
			const view = leaf.view;
			if (view instanceof WannianliView) view.refreshCalendar();
		}
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<WannianliSettings> | null;
		const eventCategories = normalizeEventCategories(
			data?.eventCategories ?? DEFAULT_SETTINGS.eventCategories,
		);
		const removedBuiltinIds = normalizeRemovedBuiltinIds(
			data?.removedBuiltinIds ?? DEFAULT_SETTINGS.removedBuiltinIds,
		);
		const customEvents = data?.customEvents
			? normalizeCustomEvents(data.customEvents, eventCategories)
			: DEFAULT_SETTINGS.customEvents.map((e) => ({ ...e }));
		const display = normalizeDisplaySettings(data);
		const holidayCache = normalizeHolidayCache(data?.holidayCache);

		setEventCategories(eventCategories);
		setRemovedBuiltinIds(removedBuiltinIds);
		setCustomEvents(customEvents);
		setHolidayCache(holidayCache);

		this.settings = {
			...DEFAULT_SETTINGS,
			...data,
			...display,
			eventCategories,
			customEvents: getCustomEvents(),
			removedBuiltinIds: getRemovedBuiltinIds(),
			holidayCache,
		};

		// 首次种子写入内置节假日后落盘
		if (this.settings.customEvents.length !== customEvents.length) {
			await this.saveSettings();
		}
	}

	async saveSettings(): Promise<void> {
		setEventCategories(this.settings.eventCategories);
		setRemovedBuiltinIds(this.settings.removedBuiltinIds);
		setCustomEvents(this.settings.customEvents);
		this.settings.customEvents = getCustomEvents();
		this.settings.removedBuiltinIds = getRemovedBuiltinIds();
		await this.saveData(this.settings);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_WANNIANLI);
		let leaf: WorkspaceLeaf | null = leaves[0] ?? null;

		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({
				type: VIEW_TYPE_WANNIANLI,
				active: true,
			});
		}

		await workspace.revealLeaf(leaf);
	}
}

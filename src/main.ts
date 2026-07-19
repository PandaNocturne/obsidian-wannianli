import { Plugin, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_WANNIANLI } from './scripts/constants';
import { setCustomEvents, setEventCategories } from './scripts/data/event-store';
import {
	DEFAULT_SETTINGS,
	normalizeCustomEvents,
	normalizeEventCategories,
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
			id: 'open-wannianli',
			name: '打开万年历',
			callback: () => {
				void this.activateView();
			},
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_WANNIANLI);
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<WannianliSettings> | null;
		const eventCategories = normalizeEventCategories(
			data?.eventCategories ?? DEFAULT_SETTINGS.eventCategories,
		);
		const customEvents = data?.customEvents
			? normalizeCustomEvents(data.customEvents, eventCategories)
			: DEFAULT_SETTINGS.customEvents.map((e) => ({ ...e }));

		this.settings = {
			...DEFAULT_SETTINGS,
			...data,
			eventCategories,
			customEvents,
		};
		setEventCategories(this.settings.eventCategories);
		setCustomEvents(this.settings.customEvents);
	}

	async saveSettings(): Promise<void> {
		setEventCategories(this.settings.eventCategories);
		setCustomEvents(this.settings.customEvents);
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

		workspace.revealLeaf(leaf);
	}
}

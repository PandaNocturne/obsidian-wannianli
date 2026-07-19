import { ItemView, WorkspaceLeaf } from 'obsidian';
import type WannianliPlugin from '../../main';
import { VIEW_TYPE_WANNIANLI } from '../constants';
import type { CalElement } from '../lunar';
import { DayDetailModal } from '../ui/day-detail-modal';
import { EventsManageModal } from '../ui/events-manage-modal';
import { renderToolbar, type ToolbarState } from '../ui/toolbar';
import { destroyTooltip } from '../ui/tooltip';
import { ViewSettingsModal } from '../ui/view-settings-modal';
import { renderCalendarView } from './view-mode';

export class WannianliView extends ItemView {
	private state: ToolbarState;
	private toolbarEl!: HTMLElement;
	private boardEl!: HTMLElement;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: WannianliPlugin,
	) {
		super(leaf);
		this.state = {
			year: new Date().getFullYear(),
			calendarMode: 'solar',
		};
	}

	getViewType(): string {
		return VIEW_TYPE_WANNIANLI;
	}

	getDisplayText(): string {
		return '万年历';
	}

	getIcon(): string {
		return 'calendar-days';
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass('wnl-root');

		this.toolbarEl = root.createDiv({ cls: 'wnl-toolbar-host' });
		this.boardEl = root.createDiv({ cls: 'wnl-board-host' });

		this.refresh();
	}

	async onClose(): Promise<void> {
		destroyTooltip();
	}

	/** 供插件同步节假日后刷新已打开视图 */
	refreshCalendar(): void {
		this.refresh();
	}

	private refresh(): void {
		renderToolbar(this.toolbarEl, this.state, {
			onChange: (next) => {
				this.state = next;
				this.refresh();
			},
			onToday: () => {
				this.state = {
					...this.state,
					year: new Date().getFullYear(),
				};
				this.refresh();
			},
			onManageEvents: () => this.openEventsManage(),
			onOpenSettings: () => this.openSettings(),
		});

		const s = this.plugin.settings;
		renderCalendarView(this.boardEl, {
			year: this.state.year,
			calendarMode: this.state.calendarMode,
			display: {
				showWeekNumbers: s.showWeekNumbers,
				colorfulTheme: s.colorfulTheme,
				showMonthBackground: s.showMonthBackground,
				monthWidth: s.monthWidth,
				gridGap: s.gridGap,
			},
			onDayClick: (info) => this.openDayDetail(info),
		});
	}

	private openDayDetail(info: CalElement): void {
		new DayDetailModal(
			this.plugin,
			info.sYear,
			info.sMonth,
			info.sDay,
			(result) => {
				if (result.changed) this.refresh();
			},
		).open();
	}

	private openEventsManage(): void {
		new EventsManageModal(this.plugin, (result) => {
			if (result.changed) this.refresh();
		}).open();
	}

	private openSettings(): void {
		new ViewSettingsModal(this.plugin, () => this.refresh()).open();
	}
}

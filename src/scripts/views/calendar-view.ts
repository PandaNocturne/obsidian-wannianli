import { ItemView, WorkspaceLeaf } from 'obsidian';
import type WannianliPlugin from '../../main';
import { VIEW_TYPE_WANNIANLI } from '../constants';
import type { CalElement } from '../lunar';
import { DayDetailModal } from '../ui/day-detail-modal';
import { EventsManageModal } from '../ui/events-manage-modal';
import { renderToolbar, type ToolbarState } from '../ui/toolbar';
import { destroyTooltip } from '../ui/tooltip';
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
		this.state = { year: new Date().getFullYear() };
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

	private refresh(): void {
		renderToolbar(this.toolbarEl, this.state, {
			onChange: (next) => {
				this.state = next;
				this.refresh();
			},
			onToday: () => {
				this.state = { year: new Date().getFullYear() };
				this.refresh();
			},
			onManageEvents: () => this.openEventsManage(),
		});

		renderCalendarView(this.boardEl, {
			year: this.state.year,
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
}

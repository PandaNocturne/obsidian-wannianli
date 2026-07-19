import { Modal, Notice, Setting, setIcon } from 'obsidian';
import type WannianliPlugin from '../../main';
import {
	getCustomEvents,
	getEventCategories,
	removeCustomEvent,
	removeEventCategory,
	upsertCustomEvent,
	upsertEventCategory,
} from '../data/event-store';
import {
	formatBuiltInFestivalDate,
	listBuiltInFestivals,
	type BuiltInFestival,
} from '../data/festivals';
import {
	BIRTHDAY_CATEGORY_ID,
	BUILTIN_CATEGORY_ID,
	createCategoryId,
	createEventId,
	userEventCategories,
	type CustomEvent,
	type EventCategory,
	type EventKind,
} from '../data/settings';
import { renderCategoryTabs } from './category-tabs';
import { NamePromptModal } from './name-prompt-modal';

export interface EventsManageModalResult {
	changed: boolean;
}

/** 顶部工具栏：按自定义标签页管理事件 */
export class EventsManageModal extends Modal {
	private changed = false;
	private activeTab = BIRTHDAY_CATEGORY_ID;
	private showAddForm = false;
	private draftName = '';
	private draftKind: EventKind = 'solar';
	private draftMonth = 1;
	private draftDay = 1;

	constructor(
		private plugin: WannianliPlugin,
		private onDone: (result: EventsManageModalResult) => void,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.setTitle('自定义事件');
		this.modalEl.addClass('wnl-event-modal-host');
		this.ensureActiveTab();
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
		this.onDone({ changed: this.changed });
	}

	private ensureActiveTab(): void {
		const ids = new Set(getEventCategories().map((c) => c.id));
		if (!ids.has(this.activeTab)) {
			this.activeTab = BIRTHDAY_CATEGORY_ID;
			this.showAddForm = false;
		}
	}

	private render(): void {
		this.ensureActiveTab();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('wnl-event-modal');

		const categories = getEventCategories();
		const customs = sortEvents(getCustomEvents());
		const builtIns = listBuiltInFestivals();
		const counts: Record<string, number> = {};
		for (const cat of categories) {
			counts[cat.id] =
				cat.id === BUILTIN_CATEGORY_ID
					? builtIns.length
					: customs.filter((e) => e.categoryId === cat.id).length;
		}

		const toolbar = contentEl.createDiv({ cls: 'wnl-event-modal__toolbar' });
		toolbar.createDiv({
			cls: 'wnl-event-modal__summary',
			text: '「默认」为内置节假日。右键标签可改名/删除；栏尾 + 新建标签；页内 + 添加事件',
		});
		renderCategoryTabs(toolbar, {
			categories,
			activeId: this.activeTab,
			counts,
			onSelect: (id) => {
				this.activeTab = id;
				this.showAddForm = false;
				this.render();
			},
			onAddCategory: () => this.openCreateCategory(),
			onRename: (cat) => this.openRenameCategory(cat),
			onDelete: (cat) => {
				void this.deleteCategory(cat.id);
			},
			canDelete: () => userEventCategories(categories).length > 1,
		});

		const panel = contentEl.createDiv({ cls: 'wnl-event-modal__panel' });
		if (this.activeTab === BUILTIN_CATEGORY_ID) {
			this.renderBuiltinTab(panel, builtIns);
		} else {
			this.renderCategoryTab(
				panel,
				customs.filter((e) => e.categoryId === this.activeTab),
				categories,
			);
			this.renderAddFooter(contentEl);
			if (this.showAddForm) {
				this.renderAddDrawer(contentEl);
			}
		}
	}

	private renderBuiltinTab(parent: HTMLElement, builtIns: BuiltInFestival[]): void {
		parent.createEl('h4', { text: '内置节假日', cls: 'wnl-event-modal__heading' });
		if (builtIns.length === 0) {
			parent.createDiv({
				cls: 'wnl-event-modal__empty',
				text: '暂无内置节假日',
			});
			return;
		}
		for (const festival of builtIns) {
			const row = parent.createDiv({
				cls: 'wnl-event-modal__row wnl-event-modal__row--builtin',
			});
			new Setting(row)
				.setName(festival.name)
				.setDesc(`${formatBuiltInFestivalDate(festival)} · 内置`)
				.setDisabled(true);
		}
	}

	private renderCategoryTab(
		parent: HTMLElement,
		events: CustomEvent[],
		categories: EventCategory[],
	): void {
		if (events.length === 0 && !this.showAddForm) {
			parent.createDiv({
				cls: 'wnl-event-modal__empty',
				text: '该标签下暂无事件，点击底部 + 添加',
			});
			return;
		}
		for (const event of events) {
			this.renderEventRow(parent, event, categories);
		}
	}

	private renderAddFooter(parent: HTMLElement): void {
		const wrap = parent.createDiv({ cls: 'wnl-event-modal__footer' });
		const btn = wrap.createEl('button', {
			cls: 'wnl-event-modal__add-btn',
			attr: { type: 'button', 'aria-label': '添加事件', title: '添加事件' },
		});
		setIcon(btn, 'plus');
		btn.createSpan({ text: '添加事件' });
		btn.addEventListener('click', () => {
			this.showAddForm = true;
			this.render();
		});
	}

	private renderAddDrawer(parent: HTMLElement): void {
		const overlay = parent.createDiv({ cls: 'wnl-event-modal__drawer-overlay' });
		overlay.addEventListener('click', () => {
			this.closeAddDrawer();
		});

		const sheet = parent.createDiv({ cls: 'wnl-event-modal__drawer' });
		sheet.addEventListener('click', (evt) => evt.stopPropagation());

		sheet.createDiv({ cls: 'wnl-event-modal__drawer-handle' });

		const head = sheet.createDiv({ cls: 'wnl-event-modal__drawer-head' });
		head.createDiv({ cls: 'wnl-event-modal__drawer-title', text: '添加事件' });
		const closeBtn = head.createEl('button', {
			cls: 'wnl-event-modal__drawer-close',
			attr: { type: 'button', 'aria-label': '关闭', title: '关闭' },
		});
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => this.closeAddDrawer());

		const form = sheet.createDiv({ cls: 'wnl-event-modal__drawer-body' });

		new Setting(form)
			.setName('名称')
			.addText((text) => {
				text.setPlaceholder('例如：我的生日').setValue(this.draftName);
				text.onChange((v) => {
					this.draftName = v;
				});
			});

		new Setting(form)
			.setName('类型')
			.addDropdown((dd) => {
				dd.addOption('solar', '阳历（公历）');
				dd.addOption('lunar', '阴历（农历）');
				dd.setValue(this.draftKind);
				dd.onChange((v) => {
					this.draftKind = v as EventKind;
					const maxDay = this.draftKind === 'lunar' ? 30 : 31;
					if (this.draftDay > maxDay) this.draftDay = maxDay;
					this.render();
				});
			});

		new Setting(form)
			.setName('月')
			.addDropdown((dd) => {
				for (let m = 1; m <= 12; m++) {
					dd.addOption(String(m), `${m}月`);
				}
				dd.setValue(String(this.draftMonth));
				dd.onChange((v) => {
					this.draftMonth = parseInt(v, 10);
				});
			});

		new Setting(form)
			.setName('日')
			.addDropdown((dd) => {
				const maxDay = this.draftKind === 'lunar' ? 30 : 31;
				for (let d = 1; d <= maxDay; d++) {
					dd.addOption(String(d), `${d}日`);
				}
				dd.setValue(String(Math.min(this.draftDay, maxDay)));
				dd.onChange((v) => {
					this.draftDay = parseInt(v, 10);
				});
			});

		const actions = sheet.createDiv({ cls: 'wnl-event-modal__drawer-actions' });
		new Setting(actions)
			.addButton((btn) => {
				btn.setButtonText('取消').onClick(() => this.closeAddDrawer());
			})
			.addButton((btn) => {
				btn.setButtonText('添加')
					.setCta()
					.onClick(() => {
						void this.addEvent();
					});
			});

		requestAnimationFrame(() => {
			overlay.addClass('is-open');
			sheet.addClass('is-open');
		});
	}

	private closeAddDrawer(): void {
		this.showAddForm = false;
		this.render();
	}

	private renderEventRow(
		parent: HTMLElement,
		event: CustomEvent,
		categories: EventCategory[],
	): void {
		const row = parent.createDiv({ cls: 'wnl-event-modal__row' });
		let editName = event.name;
		let editCategoryId = event.categoryId;
		const userCats = userEventCategories(categories);

		new Setting(row)
			.setName(event.name)
			.setDesc(formatEventDate(event))
			.addText((text) => {
				text.setValue(event.name);
				text.onChange((v) => {
					editName = v;
				});
			})
			.addDropdown((dd) => {
				for (const cat of userCats) {
					dd.addOption(cat.id, cat.name);
				}
				dd.setValue(editCategoryId);
				dd.onChange((v) => {
					editCategoryId = v;
				});
			})
			.addButton((btn) => {
				btn.setButtonText('保存').onClick(() => {
					void this.saveEvent({
						...event,
						name: editName.trim(),
						categoryId: editCategoryId,
					});
				});
			})
			.addButton((btn) => {
				btn.setButtonText('删除')
					.setWarning()
					.onClick(() => {
						void this.deleteEvent(event.id);
					});
			});
	}

	private openCreateCategory(): void {
		new NamePromptModal(this.app, '新建标签', '', '例如：生日、纪念日', (name) =>
			this.addCategory(name),
		).open();
	}

	private openRenameCategory(cat: EventCategory): void {
		new NamePromptModal(this.app, '重命名标签', cat.name, '标签名称', (name) =>
			this.renameCategory(cat.id, name),
		).open();
	}

	private async addCategory(name: string): Promise<void> {
		const next = name.trim();
		if (!next) {
			new Notice('请填写标签名称');
			return;
		}
		if (getEventCategories().some((c) => c.name === next)) {
			new Notice('标签名称已存在');
			return;
		}

		const id = createCategoryId();
		const categories = upsertEventCategory({ id, name: next });
		this.plugin.settings.eventCategories = categories;
		await this.plugin.saveSettings();

		this.activeTab = id;
		this.showAddForm = false;
		this.changed = true;
		new Notice('已添加标签');
		this.render();
	}

	private async renameCategory(id: string, name: string): Promise<void> {
		const next = name.trim();
		if (!next) {
			new Notice('名称不能为空');
			return;
		}
		if (getEventCategories().some((c) => c.id !== id && c.name === next)) {
			new Notice('标签名称已存在');
			return;
		}
		const categories = upsertEventCategory({ id, name: next });
		this.plugin.settings.eventCategories = categories;
		await this.plugin.saveSettings();
		this.changed = true;
		new Notice('已保存');
		this.render();
	}

	private async deleteCategory(id: string): Promise<void> {
		const { categories, events } = removeEventCategory(id);
		if (categories.some((c) => c.id === id)) {
			new Notice('至少保留一个自定义标签');
			return;
		}
		this.plugin.settings.eventCategories = categories;
		this.plugin.settings.customEvents = events;
		await this.plugin.saveSettings();
		if (this.activeTab === id) {
			this.activeTab = BIRTHDAY_CATEGORY_ID;
			this.showAddForm = false;
		}
		this.changed = true;
		new Notice('已删除标签，事件已迁移');
		this.render();
	}

	private async addEvent(): Promise<void> {
		const name = this.draftName.trim();
		if (!name) {
			new Notice('请填写事件名称');
			return;
		}
		if (!isValidMonthDay(this.draftKind, this.draftMonth, this.draftDay)) {
			new Notice('日期无效');
			return;
		}
		if (this.activeTab === BUILTIN_CATEGORY_ID) {
			new Notice('请先选择自定义标签页');
			return;
		}

		await this.persistEvents(
			upsertCustomEvent({
				id: createEventId(),
				name,
				kind: this.draftKind,
				categoryId: this.activeTab,
				month: this.draftMonth,
				day: this.draftDay,
			}),
		);

		this.draftName = '';
		this.showAddForm = false;
		this.changed = true;
		new Notice('已添加事件');
		this.render();
	}

	private async saveEvent(event: CustomEvent): Promise<void> {
		if (!event.name) {
			new Notice('名称不能为空');
			return;
		}
		await this.persistEvents(upsertCustomEvent(event));
		this.changed = true;
		this.activeTab = event.categoryId;
		new Notice('已保存');
		this.render();
	}

	private async deleteEvent(id: string): Promise<void> {
		await this.persistEvents(removeCustomEvent(id));
		this.changed = true;
		new Notice('已删除');
		this.render();
	}

	private async persistEvents(events: CustomEvent[]): Promise<void> {
		this.plugin.settings.customEvents = events;
		await this.plugin.saveSettings();
	}
}

function formatEventDate(event: CustomEvent): string {
	return event.kind === 'solar'
		? `阳历 ${event.month}月${event.day}日`
		: `阴历 ${event.month}月${event.day}日`;
}

function sortEvents(events: CustomEvent[]): CustomEvent[] {
	return [...events].sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === 'solar' ? -1 : 1;
		if (a.month !== b.month) return a.month - b.month;
		return a.day - b.day;
	});
}

function isValidMonthDay(kind: EventKind, month: number, day: number): boolean {
	if (month < 1 || month > 12 || day < 1) return false;
	if (kind === 'lunar') return day <= 30;
	const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
	return day <= (maxDays[month - 1] ?? 0);
}

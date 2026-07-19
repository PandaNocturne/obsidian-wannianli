import { Modal, Notice, Setting, setIcon } from 'obsidian';
import type WannianliPlugin from '../../main';
import {
	getCustomEvents,
	getEventCategories,
	getRemovedBuiltinIds,
	removeCustomEvent,
	removeEventCategory,
	upsertCustomEvent,
	upsertEventCategory,
} from '../data/event-store';
import {
	BIRTHDAY_CATEGORY_ID,
	createCategoryId,
	createEventId,
	userEventCategories,
	type CustomEvent,
	type EventCategory,
	type EventKind,
} from '../data/settings';
import { renderCategoryTabs } from './category-tabs';
import {
	isValidMonthDay,
	renderEventMetaTags,
	renderMonthDayPicker,
} from './event-date';
import { NamePromptModal } from './name-prompt-modal';

export interface EventsManageModalResult {
	changed: boolean;
}

/** 顶部工具栏：按标签页管理事件（含内置） */
export class EventsManageModal extends Modal {
	private changed = false;
	private activeTab = BIRTHDAY_CATEGORY_ID;
	private showAddForm = false;
	private editingEvent: CustomEvent | null = null;
	private draftName = '';
	private draftKind: EventKind = 'solar';
	private draftMonth = 1;
	private draftDay = 1;
	private draftVisible = true;
	private draftNote = '';
	private editName = '';
	private editCategoryId = BIRTHDAY_CATEGORY_ID;
	private editKind: EventKind = 'solar';
	private editMonth = 1;
	private editDay = 1;
	private editVisible = true;
	private editNote = '';

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
			this.editingEvent = null;
		}
	}

	private render(): void {
		this.ensureActiveTab();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('wnl-event-modal');

		const categories = getEventCategories();
		const customs = sortEvents(getCustomEvents());
		const counts: Record<string, number> = {};
		for (const cat of categories) {
			counts[cat.id] = customs.filter((e) => e.categoryId === cat.id).length;
		}

		const toolbar = contentEl.createDiv({ cls: 'wnl-event-modal__toolbar' });
		toolbar.createDiv({
			cls: 'wnl-event-modal__summary',
			text: '「默认」为内置节假日（可编辑/显隐）。右键标签可改名/删除；栏尾 + 新建标签；底部添加工具栏添加事件',
		});
		renderCategoryTabs(toolbar, {
			categories,
			activeId: this.activeTab,
			counts,
			onSelect: (id) => {
				this.activeTab = id;
				this.showAddForm = false;
				this.editingEvent = null;
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
		this.renderCategoryTab(
			panel,
			customs.filter((e) => e.categoryId === this.activeTab),
		);

		this.renderAddFooter(contentEl);
		if (this.editingEvent) {
			this.renderEditDrawer(contentEl, categories);
		} else if (this.showAddForm) {
			this.renderAddDrawer(contentEl);
		}
	}

	private renderCategoryTab(parent: HTMLElement, events: CustomEvent[]): void {
		if (events.length === 0 && !this.showAddForm && !this.editingEvent) {
			parent.createDiv({
				cls: 'wnl-event-modal__empty',
				text: '该标签下暂无事件，点击底部添加',
			});
			return;
		}
		for (const event of events) {
			this.renderEventRow(parent, event);
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
			this.editingEvent = null;
			this.draftVisible = true;
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
			.setClass('wnl-setting-block')
			.addText((text) => {
				text.setPlaceholder('例如：我的生日').setValue(this.draftName);
				text.onChange((v) => {
					this.draftName = v;
				});
			});

		renderMonthDayPicker(form, {
			getKind: () => this.draftKind,
			getMonth: () => this.draftMonth,
			getDay: () => this.draftDay,
			onKindChange: (kind) => {
				this.draftKind = kind;
			},
			onChange: (month, day) => {
				this.draftMonth = month;
				this.draftDay = day;
			},
		});

		new Setting(form)
			.setName('备注')
			.setClass('wnl-setting-block')
			.addTextArea((text) => {
				text.setPlaceholder('可选备注').setValue(this.draftNote);
				text.inputEl.rows = 3;
				text.onChange((v) => {
					this.draftNote = v;
				});
			});

		new Setting(form)
			.setName('在日历中显示')
			.addToggle((toggle) => {
				toggle.setValue(this.draftVisible);
				toggle.onChange((v) => {
					this.draftVisible = v;
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

	private openEditEvent(event: CustomEvent): void {
		this.showAddForm = false;
		this.editingEvent = event;
		this.editName = event.name;
		this.editCategoryId = event.categoryId;
		this.editKind = event.kind;
		this.editMonth = event.month;
		this.editDay = event.day;
		this.editVisible = event.visible;
		this.editNote = event.note ?? '';
		this.render();
	}

	private closeEditDrawer(): void {
		this.editingEvent = null;
		this.render();
	}

	private renderEditDrawer(parent: HTMLElement, categories: EventCategory[]): void {
		const event = this.editingEvent;
		if (!event) return;

		const overlay = parent.createDiv({ cls: 'wnl-event-modal__drawer-overlay' });
		overlay.addEventListener('click', () => this.closeEditDrawer());

		const sheet = parent.createDiv({ cls: 'wnl-event-modal__drawer' });
		sheet.addEventListener('click', (evt) => evt.stopPropagation());
		sheet.createDiv({ cls: 'wnl-event-modal__drawer-handle' });

		const head = sheet.createDiv({ cls: 'wnl-event-modal__drawer-head' });
		head.createDiv({ cls: 'wnl-event-modal__drawer-title', text: '编辑事件' });
		const closeBtn = head.createEl('button', {
			cls: 'wnl-event-modal__drawer-close',
			attr: { type: 'button', 'aria-label': '关闭', title: '关闭' },
		});
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => this.closeEditDrawer());

		const form = sheet.createDiv({ cls: 'wnl-event-modal__drawer-body' });

		new Setting(form)
			.setName('名称')
			.setClass('wnl-setting-block')
			.addText((text) => {
				text.setValue(this.editName);
				text.onChange((v) => {
					this.editName = v;
				});
			});

		new Setting(form)
			.setName('标签')
			.addDropdown((dd) => {
				for (const cat of categories) {
					dd.addOption(cat.id, cat.name);
				}
				dd.setValue(this.editCategoryId);
				dd.onChange((v) => {
					this.editCategoryId = v;
				});
			});

		renderMonthDayPicker(form, {
			getKind: () => this.editKind,
			getMonth: () => this.editMonth,
			getDay: () => this.editDay,
			onKindChange: (kind) => {
				this.editKind = kind;
			},
			onChange: (month, day) => {
				this.editMonth = month;
				this.editDay = day;
			},
		});

		new Setting(form)
			.setName('备注')
			.setClass('wnl-setting-block')
			.addTextArea((text) => {
				text.setPlaceholder('可选备注').setValue(this.editNote);
				text.inputEl.rows = 3;
				text.onChange((v) => {
					this.editNote = v;
				});
			});

		new Setting(form)
			.setName('在日历中显示')
			.addToggle((toggle) => {
				toggle.setValue(this.editVisible);
				toggle.onChange((v) => {
					this.editVisible = v;
				});
			});

		const actions = sheet.createDiv({ cls: 'wnl-event-modal__drawer-actions' });
		new Setting(actions)
			.addButton((btn) => {
				btn.setButtonText('取消').onClick(() => this.closeEditDrawer());
			})
			.addButton((btn) => {
				btn.setButtonText('保存')
					.setCta()
					.onClick(() => {
						void this.saveEditedEvent();
					});
			});

		requestAnimationFrame(() => {
			overlay.addClass('is-open');
			sheet.addClass('is-open');
		});
	}

	private renderEventRow(parent: HTMLElement, event: CustomEvent): void {
		const rowCls = [
			'wnl-event-modal__row',
			event.builtin ? 'wnl-event-modal__row--builtin' : '',
			event.visible ? '' : 'wnl-event-modal__row--hidden',
		]
			.filter(Boolean)
			.join(' ');
		const row = parent.createDiv({ cls: rowCls });
		const main = row.createDiv({ cls: 'wnl-event-modal__row-main' });

		const body = main.createDiv({ cls: 'wnl-event-modal__row-body' });
		const title = body.createDiv({ cls: 'wnl-event-modal__row-title' });
		title.createSpan({ cls: 'wnl-event-modal__row-name', text: event.name });
		renderEventMetaTags(title, event);

		const note = (event.note ?? '').trim();
		if (note) {
			body.createDiv({ cls: 'wnl-event-modal__row-note', text: note });
		}

		const actions = main.createDiv({ cls: 'wnl-event-modal__row-actions' });

		const visTitle = event.visible ? '隐藏' : '显示';
		const visBtn = createRowIconBtn(
			actions,
			event.visible ? 'eye-off' : 'eye',
			visTitle,
		);
		visBtn.addEventListener('click', () => {
			void this.toggleVisible(event);
		});

		const editBtn = createRowIconBtn(actions, 'pencil', '编辑');
		editBtn.addEventListener('click', () => this.openEditEvent(event));

		if (event.builtin) {
			createRowIconBtn(actions, 'trash-2', '内置节日不可删除', 'is-disabled', true);
		} else {
			const delBtn = createRowIconBtn(actions, 'trash-2', '删除', 'is-danger');
			delBtn.addEventListener('click', () => {
				void this.deleteEvent(event.id);
			});
		}
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

		await this.persistEvents(
			upsertCustomEvent({
				id: createEventId(),
				name,
				kind: this.draftKind,
				categoryId: this.activeTab,
				month: this.draftMonth,
				day: this.draftDay,
				visible: this.draftVisible,
				note: this.draftNote.trim(),
			}),
		);

		this.draftName = '';
		this.draftNote = '';
		this.draftVisible = true;
		this.showAddForm = false;
		this.changed = true;
		new Notice('已添加事件');
		this.render();
	}

	private async saveEditedEvent(): Promise<void> {
		const event = this.editingEvent;
		if (!event) return;

		const name = this.editName.trim();
		if (!name) {
			new Notice('名称不能为空');
			return;
		}
		if (!isValidMonthDay(this.editKind, this.editMonth, this.editDay)) {
			new Notice('日期无效');
			return;
		}

		await this.persistEvents(
			upsertCustomEvent({
				...event,
				name,
				categoryId: this.editCategoryId,
				kind: this.editKind,
				month: this.editMonth,
				day: this.editDay,
				visible: this.editVisible,
				note: this.editNote.trim(),
			}),
		);

		this.editingEvent = null;
		this.changed = true;
		this.activeTab = this.editCategoryId;
		new Notice('已保存');
		this.render();
	}

	private async toggleVisible(event: CustomEvent): Promise<void> {
		await this.persistEvents(
			upsertCustomEvent({
				...event,
				visible: !event.visible,
			}),
		);
		this.changed = true;
		this.render();
	}

	private async deleteEvent(id: string): Promise<void> {
		const target = getCustomEvents().find((e) => e.id === id);
		if (target?.builtin) {
			new Notice('内置节日不可删除');
			return;
		}
		await this.persistEvents(removeCustomEvent(id));
		this.plugin.settings.removedBuiltinIds = getRemovedBuiltinIds();
		if (this.editingEvent?.id === id) this.editingEvent = null;
		this.changed = true;
		new Notice('已删除');
		this.render();
	}

	private async persistEvents(events: CustomEvent[]): Promise<void> {
		this.plugin.settings.customEvents = events;
		this.plugin.settings.removedBuiltinIds = getRemovedBuiltinIds();
		await this.plugin.saveSettings();
	}
}

function sortEvents(events: CustomEvent[]): CustomEvent[] {
	return [...events].sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === 'solar' ? -1 : 1;
		if (a.month !== b.month) return a.month - b.month;
		return a.day - b.day;
	});
}

function createRowIconBtn(
	parent: HTMLElement,
	icon: string,
	title: string,
	extraCls = '',
	disabled = false,
): HTMLButtonElement {
	const btn = parent.createEl('button', {
		cls: `wnl-event-modal__icon-btn${extraCls ? ` ${extraCls}` : ''}`,
		attr: { type: 'button', title, 'aria-label': title },
	});
	if (disabled) btn.disabled = true;
	setIcon(btn, icon);
	return btn;
}

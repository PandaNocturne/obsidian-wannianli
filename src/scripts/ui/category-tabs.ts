import { Menu, setIcon } from 'obsidian';
import { BUILTIN_CATEGORY_ID, type EventCategory } from '../data/settings';

export interface CategoryTabsOptions {
	categories: EventCategory[];
	activeId: string;
	/** 各标签数量；builtin 用内置节日数 */
	counts: Record<string, number>;
	onSelect: (categoryId: string) => void;
	onAddCategory: () => void;
	onRename: (category: EventCategory) => void;
	onDelete: (category: EventCategory) => void;
	/** 拖拽重排后的完整 id 顺序 */
	onReorder: (orderedIds: string[]) => void;
	/** 是否允许删除（至少保留一个自定义标签） */
	canDelete: (category: EventCategory) => boolean;
}

/** 渲染标签栏：分类标签 + 右侧新建 +；支持右键编辑/删除与拖拽排序 */
export function renderCategoryTabs(parent: HTMLElement, options: CategoryTabsOptions): void {
	const row = parent.createDiv({ cls: 'wnl-event-modal__tabs-row' });
	const tabs = row.createDiv({ cls: 'wnl-event-modal__tabs', attr: { role: 'tablist' } });

	let dragId: string | null = null;

	for (const cat of options.categories) {
		const count = options.counts[cat.id] ?? 0;
		const btn = tabs.createEl('button', {
			cls: 'wnl-event-modal__tab' + (options.activeId === cat.id ? ' is-active' : ''),
			text: `${cat.name} (${count})`,
			attr: {
				type: 'button',
				role: 'tab',
				draggable: 'true',
				'aria-selected': String(options.activeId === cat.id),
				title:
					cat.id === BUILTIN_CATEGORY_ID
						? '内置节假日 · 可拖动排序'
						: '左键切换 · 拖动排序 · 右键编辑/删除',
			},
		});
		btn.dataset.categoryId = cat.id;

		btn.addEventListener('click', () => {
			if (options.activeId === cat.id) return;
			options.onSelect(cat.id);
		});

		btn.addEventListener('contextmenu', (evt) => {
			evt.preventDefault();
			showCategoryMenu(evt, cat, options);
		});

		btn.addEventListener('dragstart', (evt) => {
			dragId = cat.id;
			btn.addClass('is-dragging');
			evt.dataTransfer?.setData('text/plain', cat.id);
			if (evt.dataTransfer) evt.dataTransfer.effectAllowed = 'move';
		});

		btn.addEventListener('dragend', () => {
			dragId = null;
			btn.removeClass('is-dragging');
			tabs.querySelectorAll('.wnl-event-modal__tab.is-drop-target').forEach((el) => {
				el.removeClass('is-drop-target');
			});
		});

		btn.addEventListener('dragover', (evt) => {
			evt.preventDefault();
			if (!dragId || dragId === cat.id) return;
			if (evt.dataTransfer) evt.dataTransfer.dropEffect = 'move';
			tabs.querySelectorAll('.wnl-event-modal__tab.is-drop-target').forEach((el) => {
				if (el !== btn) el.removeClass('is-drop-target');
			});
			btn.addClass('is-drop-target');
		});

		btn.addEventListener('dragleave', () => {
			btn.removeClass('is-drop-target');
		});

		btn.addEventListener('drop', (evt) => {
			evt.preventDefault();
			btn.removeClass('is-drop-target');
			const fromId = dragId ?? evt.dataTransfer?.getData('text/plain');
			if (!fromId || fromId === cat.id) return;

			const ids = options.categories.map((c) => c.id);
			const from = ids.indexOf(fromId);
			const to = ids.indexOf(cat.id);
			if (from < 0 || to < 0) return;

			ids.splice(from, 1);
			ids.splice(to, 0, fromId);
			options.onReorder(ids);
		});
	}

	const addBtn = row.createEl('button', {
		cls: 'wnl-event-modal__tab-add',
		attr: { type: 'button', 'aria-label': '新建标签', title: '新建标签' },
	});
	setIcon(addBtn, 'plus');
	addBtn.addEventListener('click', () => options.onAddCategory());
}

function showCategoryMenu(
	evt: MouseEvent,
	cat: EventCategory,
	options: CategoryTabsOptions,
): void {
	const menu = new Menu();

	if (cat.id === BUILTIN_CATEGORY_ID || cat.locked) {
		menu.addItem((item) => {
			item.setTitle('内置标签不可修改').setDisabled(true);
		});
	} else {
		menu.addItem((item) => {
			item.setTitle('编辑').onClick(() => options.onRename(cat));
		});
		menu.addItem((item) => {
			item
				.setTitle('删除')
				.setWarning(true)
				.setDisabled(!options.canDelete(cat))
				.onClick(() => options.onDelete(cat));
		});
	}

	menu.showAtMouseEvent(evt);
}

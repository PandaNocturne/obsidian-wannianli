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
	/** 是否允许删除（至少保留一个自定义标签） */
	canDelete: (category: EventCategory) => boolean;
}

/** 渲染标签栏：分类标签 + 右侧新建 +；自定义标签支持右键改名/删除 */
export function renderCategoryTabs(parent: HTMLElement, options: CategoryTabsOptions): void {
	const row = parent.createDiv({ cls: 'wnl-event-modal__tabs-row' });
	const tabs = row.createDiv({ cls: 'wnl-event-modal__tabs', attr: { role: 'tablist' } });

	for (const cat of options.categories) {
		const count = options.counts[cat.id] ?? 0;
		const btn = tabs.createEl('button', {
			cls: 'wnl-event-modal__tab' + (options.activeId === cat.id ? ' is-active' : ''),
			text: `${cat.name} (${count})`,
			attr: {
				type: 'button',
				role: 'tab',
				'aria-selected': String(options.activeId === cat.id),
				title:
					cat.id === BUILTIN_CATEGORY_ID
						? '内置节假日'
						: '左键切换 · 右键修改/删除',
			},
		});

		btn.addEventListener('click', () => {
			if (options.activeId === cat.id) return;
			options.onSelect(cat.id);
		});

		btn.addEventListener('contextmenu', (evt) => {
			evt.preventDefault();
			showCategoryMenu(evt, cat, options);
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
			item.setTitle('重命名').onClick(() => options.onRename(cat));
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

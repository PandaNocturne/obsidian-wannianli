import { setIcon } from 'obsidian';
import { YEAR_MAX, YEAR_MIN } from '../constants';

export interface ToolbarState {
	year: number;
}

export interface ToolbarCallbacks {
	onChange: (state: ToolbarState) => void;
	onToday: () => void;
	onManageEvents: () => void;
}

/** 顶部工具栏：年份导航与自定义事件入口 */
export function renderToolbar(
	container: HTMLElement,
	state: ToolbarState,
	callbacks: ToolbarCallbacks,
): void {
	container.empty();
	const bar = container.createDiv({ cls: 'wnl-toolbar' });

	const left = bar.createDiv({ cls: 'wnl-toolbar__left' });
	const prevYear = left.createEl('button', {
		cls: 'wnl-btn wnl-btn--icon',
		attr: { type: 'button', 'aria-label': '上一年', title: '上一年' },
	});
	setIcon(prevYear, 'chevron-left');
	prevYear.addEventListener('click', () => {
		callbacks.onChange({ year: clampYear(state.year - 1) });
	});

	const nextYear = left.createEl('button', {
		cls: 'wnl-btn wnl-btn--icon',
		attr: { type: 'button', 'aria-label': '下一年', title: '下一年' },
	});
	setIcon(nextYear, 'chevron-right');
	nextYear.addEventListener('click', () => {
		callbacks.onChange({ year: clampYear(state.year + 1) });
	});

	const todayBtn = left.createEl('button', {
		cls: 'wnl-btn wnl-btn--accent',
		text: '今年',
		attr: { type: 'button' },
	});
	todayBtn.addEventListener('click', () => callbacks.onToday());

	const center = bar.createDiv({ cls: 'wnl-toolbar__center' });
	const yearWrap = center.createDiv({ cls: 'wnl-toolbar__year' });
	const yearSelect = yearWrap.createEl('select', {
		cls: 'wnl-select wnl-select--year',
		attr: { 'aria-label': '选择年份' },
	});
	for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
		const opt = yearSelect.createEl('option', { text: String(y), value: String(y) });
		if (y === state.year) opt.selected = true;
	}
	yearSelect.addEventListener('change', () => {
		callbacks.onChange({ year: parseInt(yearSelect.value, 10) });
	});
	yearWrap.createSpan({ cls: 'wnl-toolbar__year-unit', text: '年' });

	const right = bar.createDiv({ cls: 'wnl-toolbar__right' });
	const eventsBtn = right.createEl('button', {
		cls: 'wnl-btn wnl-btn--ghost',
		attr: { type: 'button', title: '自定义事件' },
	});
	setIcon(eventsBtn, 'calendar-heart');
	eventsBtn.createSpan({ text: '自定义事件' });
	eventsBtn.addEventListener('click', () => callbacks.onManageEvents());
}

function clampYear(y: number): number {
	return Math.min(YEAR_MAX, Math.max(YEAR_MIN, y));
}

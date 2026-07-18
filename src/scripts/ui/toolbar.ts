import { YEAR_MAX, YEAR_MIN } from '../constants';

export interface ToolbarState {
	year: number;
}

export interface ToolbarCallbacks {
	onChange: (state: ToolbarState) => void;
	onToday: () => void;
}

/** 顶部工具栏：年份导航 */
export function renderToolbar(
	container: HTMLElement,
	state: ToolbarState,
	callbacks: ToolbarCallbacks,
): void {
	container.empty();
	const bar = container.createDiv({ cls: 'wnl-toolbar' });

	const nav = bar.createDiv({ cls: 'wnl-toolbar__nav' });

	const prevYear = nav.createEl('button', { cls: 'wnl-btn', text: '上一年' });
	prevYear.addEventListener('click', () => {
		callbacks.onChange({ year: clampYear(state.year - 1) });
	});

	const nextYear = nav.createEl('button', { cls: 'wnl-btn', text: '下一年' });
	nextYear.addEventListener('click', () => {
		callbacks.onChange({ year: clampYear(state.year + 1) });
	});

	const todayBtn = nav.createEl('button', { cls: 'wnl-btn wnl-btn--accent', text: '今年' });
	todayBtn.addEventListener('click', () => callbacks.onToday());

	const selectors = bar.createDiv({ cls: 'wnl-toolbar__selectors' });
	const yearSelect = selectors.createEl('select', { cls: 'wnl-select' });
	for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
		const opt = yearSelect.createEl('option', { text: String(y), value: String(y) });
		if (y === state.year) opt.selected = true;
	}
	yearSelect.addEventListener('change', () => {
		callbacks.onChange({ year: parseInt(yearSelect.value, 10) });
	});
	selectors.createSpan({ text: '年' });
}

function clampYear(y: number): number {
	return Math.min(YEAR_MAX, Math.max(YEAR_MIN, y));
}

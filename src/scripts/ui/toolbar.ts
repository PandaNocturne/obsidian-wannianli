import { setIcon } from 'obsidian';
import { YEAR_MAX, YEAR_MIN } from '../constants';

export type CalendarMode = 'solar' | 'lunar';

export interface ToolbarState {
	year: number;
	calendarMode: CalendarMode;
}

export interface ToolbarCallbacks {
	onChange: (state: ToolbarState) => void;
	onToday: () => void;
	onManageEvents: () => void;
	onOpenSettings: () => void;
}

/** 顶部工具栏：历法切换、年份导航、事件管理 */
export function renderToolbar(
	container: HTMLElement,
	state: ToolbarState,
	callbacks: ToolbarCallbacks,
): void {
	container.empty();
	const bar = container.createDiv({ cls: 'wnl-toolbar' });

	const left = bar.createDiv({ cls: 'wnl-toolbar__left' });
	const modeSwitch = left.createDiv({
		cls: 'wnl-toolbar__mode',
		attr: { role: 'group', 'aria-label': '日历显示模式' },
	});
	const solarBtn = modeSwitch.createEl('button', {
		cls: 'wnl-toolbar__mode-btn' + (state.calendarMode === 'solar' ? ' is-active' : ''),
		text: '阳历',
		attr: { type: 'button', 'aria-pressed': String(state.calendarMode === 'solar') },
	});
	const lunarBtn = modeSwitch.createEl('button', {
		cls: 'wnl-toolbar__mode-btn' + (state.calendarMode === 'lunar' ? ' is-active' : ''),
		text: '阴历',
		attr: { type: 'button', 'aria-pressed': String(state.calendarMode === 'lunar') },
	});
	solarBtn.addEventListener('click', () => {
		if (state.calendarMode === 'solar') return;
		callbacks.onChange({ ...state, calendarMode: 'solar' });
	});
	lunarBtn.addEventListener('click', () => {
		if (state.calendarMode === 'lunar') return;
		callbacks.onChange({ ...state, calendarMode: 'lunar' });
	});

	const center = bar.createDiv({ cls: 'wnl-toolbar__center' });
	const yearWrap = center.createDiv({ cls: 'wnl-toolbar__year' });

	const prevYear = yearWrap.createEl('button', {
		cls: 'wnl-btn wnl-btn--icon wnl-btn--year-nav',
		attr: { type: 'button', 'aria-label': '上一年', title: '上一年' },
	});
	setIcon(prevYear, 'chevron-left');
	prevYear.addEventListener('click', () => {
		callbacks.onChange({ ...state, year: clampYear(state.year - 1) });
	});

	const yearSelect = yearWrap.createEl('select', {
		cls: 'wnl-select wnl-select--year',
		attr: { 'aria-label': '选择年份' },
	});
	for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
		const opt = yearSelect.createEl('option', { text: String(y), value: String(y) });
		if (y === state.year) opt.selected = true;
	}
	yearSelect.addEventListener('change', () => {
		callbacks.onChange({ ...state, year: parseInt(yearSelect.value, 10) });
	});
	yearWrap.createSpan({ cls: 'wnl-toolbar__year-unit', text: '年' });

	const nextYear = yearWrap.createEl('button', {
		cls: 'wnl-btn wnl-btn--icon wnl-btn--year-nav',
		attr: { type: 'button', 'aria-label': '下一年', title: '下一年' },
	});
	setIcon(nextYear, 'chevron-right');
	nextYear.addEventListener('click', () => {
		callbacks.onChange({ ...state, year: clampYear(state.year + 1) });
	});

	const right = bar.createDiv({ cls: 'wnl-toolbar__right' });

	const settingsBtn = right.createEl('button', {
		cls: 'wnl-btn wnl-btn--icon',
		attr: { type: 'button', 'aria-label': '设置', title: '设置' },
	});
	setIcon(settingsBtn, 'settings');
	settingsBtn.addEventListener('click', () => callbacks.onOpenSettings());

	const eventsBtn = right.createEl('button', {
		cls: 'wnl-btn wnl-btn--ghost',
		attr: { type: 'button', title: '事件管理' },
	});
	setIcon(eventsBtn, 'calendar-heart');
	eventsBtn.createSpan({ text: '事件管理' });
	eventsBtn.addEventListener('click', () => callbacks.onManageEvents());

	const todayBtn = right.createEl('button', {
		cls: 'wnl-btn wnl-btn--accent',
		attr: { type: 'button', title: '回到今年', 'aria-label': '今日' },
	});
	setIcon(todayBtn, 'calendar-check');
	todayBtn.createSpan({ text: '今日' });
	todayBtn.addEventListener('click', () => callbacks.onToday());
}

function clampYear(y: number): number {
	return Math.min(YEAR_MAX, Math.max(YEAR_MIN, y));
}

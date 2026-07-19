import { setIcon } from 'obsidian';
import { YEAR_MAX, YEAR_MIN } from '../constants';
import {
	normalizeYearRange,
	type CustomEvent,
	type EventKind,
} from '../data/settings';

export function maxDayForKind(kind: EventKind): number {
	return kind === 'lunar' ? 30 : 31;
}

function maxDayForMonth(kind: EventKind, month: number): number {
	if (kind === 'lunar') return 30;
	const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
	return maxDays[month - 1] ?? 31;
}

export function clampMonthDay(
	kind: EventKind,
	month: number,
	day: number,
): { month: number; day: number } {
	const m = Math.min(12, Math.max(1, month || 1));
	if (day === 0) {
		return { month: m, day: kind === 'lunar' && m === 12 ? 0 : 1 };
	}
	const max = maxDayForMonth(kind, m);
	const d = Math.min(max, Math.max(1, day || 1));
	return { month: m, day: d };
}

export function isValidMonthDay(kind: EventKind, month: number, day: number): boolean {
	if (month < 1 || month > 12) return false;
	if (day === 0) return kind === 'lunar' && month === 12;
	if (day < 1) return false;
	return day <= maxDayForMonth(kind, month);
}

export function formatEventDateParts(
	event: Pick<CustomEvent, 'kind' | 'month' | 'day'>,
): { kindLabel: string; dateLabel: string; kind: EventKind } {
	const kind = event.kind;
	const kindLabel = kind === 'solar' ? '阳历' : '阴历';
	const dateLabel =
		event.day === 0 ? '十二月 除夕' : `${event.month}月${event.day}日`;
	return { kindLabel, dateLabel, kind };
}

export function formatEventDate(event: Pick<CustomEvent, 'kind' | 'month' | 'day'>): string {
	const { kindLabel, dateLabel } = formatEventDateParts(event);
	return `${kindLabel} ${dateLabel}`;
}

/** 事件列表行：历法 / 日期 / 年份范围 / 内置 / 已隐藏 标签 */
export function renderEventMetaTags(
	parent: HTMLElement,
	event: Pick<
		CustomEvent,
		'kind' | 'month' | 'day' | 'builtin' | 'visible' | 'startYear' | 'endYear'
	>,
): void {
	const tags = parent.createDiv({ cls: 'wnl-event-modal__row-tags' });
	const { kindLabel, dateLabel, kind } = formatEventDateParts(event);

	tags.createSpan({
		cls: `wnl-event-tag wnl-event-tag--${kind}`,
		text: kindLabel,
	});
	tags.createSpan({
		cls: 'wnl-event-tag wnl-event-tag--date',
		text: dateLabel,
	});
	const yearLabel = formatYearRangeLabel(event);
	if (yearLabel) {
		tags.createSpan({
			cls: 'wnl-event-tag wnl-event-tag--years',
			text: yearLabel,
		});
	}
	if (event.builtin) {
		tags.createSpan({
			cls: 'wnl-event-tag wnl-event-tag--builtin',
			text: '内置',
		});
	}
	if (!event.visible) {
		tags.createSpan({
			cls: 'wnl-event-tag wnl-event-tag--hidden',
			text: '已隐藏',
		});
	}
}

export function formatYearRangeLabel(
	event: Pick<CustomEvent, 'startYear' | 'endYear'>,
): string | null {
	const { startYear, endYear } = event;
	if (startYear === undefined && endYear === undefined) return null;
	if (startYear !== undefined && endYear !== undefined) {
		return startYear === endYear ? `${startYear}年` : `${startYear}–${endYear}`;
	}
	if (startYear !== undefined) return `${startYear}年起`;
	return `至${endYear}年`;
}

export interface YearRangeFieldOptions {
	getStartYear: () => string;
	getEndYear: () => string;
	onStartChange: (value: string) => void;
	onEndChange: (value: string) => void;
}

/** 可选起止公历年，同一「年份」栏；留空表示无限制 */
export function renderYearRangeFields(
	parent: HTMLElement,
	opts: YearRangeFieldOptions,
): void {
	const wrap = parent.createDiv({ cls: 'wnl-date-field' });
	const row = wrap.createDiv({ cls: 'wnl-date-field__row' });
	row.createDiv({ cls: 'wnl-date-field__label', text: '年份' });

	const parts = row.createDiv({ cls: 'wnl-date-field__parts wnl-date-field__parts--years' });

	const startInput = createYearInput(parts, {
		ariaLabel: '开始年份',
		placeholder: '不限',
		value: opts.getStartYear(),
		onChange: opts.onStartChange,
	});

	parts.createSpan({ cls: 'wnl-date-field__sep', text: '–' });

	const endInput = createYearInput(parts, {
		ariaLabel: '结束年份',
		placeholder: '不限',
		value: opts.getEndYear(),
		onChange: opts.onEndChange,
	});

	// 同步外部状态（重绘时）
	startInput.value = opts.getStartYear();
	endInput.value = opts.getEndYear();
}

function createYearInput(
	parent: HTMLElement,
	options: {
		ariaLabel: string;
		placeholder: string;
		value: string;
		onChange: (value: string) => void;
	},
): HTMLInputElement {
	const part = parent.createDiv({ cls: 'wnl-date-field__part' });
	const control = part.createDiv({ cls: 'wnl-date-field__control' });
	const input = control.createEl('input', {
		cls: 'wnl-date-field__input wnl-date-field__input--year',
		type: 'text',
		value: options.value,
		attr: {
			inputmode: 'numeric',
			placeholder: options.placeholder,
			'aria-label': options.ariaLabel,
			autocomplete: 'off',
			title: `公历 ${YEAR_MIN}–${YEAR_MAX}，留空不限制`,
		},
	});

	const commit = (): void => {
		options.onChange(input.value.trim());
	};

	input.addEventListener('change', commit);
	input.addEventListener('blur', commit);
	input.addEventListener('input', () => {
		options.onChange(input.value);
	});
	input.addEventListener('keydown', (evt) => {
		if (evt.key === 'Enter') {
			evt.preventDefault();
			commit();
			input.blur();
		}
	});

	return input;
}

/** 从表单字符串解析起止年 */
export function yearsFromInputs(
	startRaw: string,
	endRaw: string,
): { startYear?: number; endYear?: number } {
	return normalizeYearRange(startRaw.trim(), endRaw.trim());
}

export function yearInputsFromEvent(
	event: Pick<CustomEvent, 'startYear' | 'endYear'>,
): { startYear: string; endYear: string } {
	return {
		startYear: event.startYear !== undefined ? String(event.startYear) : '',
		endYear: event.endYear !== undefined ? String(event.endYear) : '',
	};
}

export interface MonthDayPickerOptions {
	getKind: () => EventKind;
	getMonth: () => number;
	getDay: () => number;
	onKindChange: (kind: EventKind) => void;
	onChange: (month: number, day: number) => void;
}

/** 历法、日期各占一行：label 居左，控件居右 */
export function renderMonthDayPicker(
	parent: HTMLElement,
	opts: MonthDayPickerOptions,
): void {
	const wrap = parent.createDiv({ cls: 'wnl-date-field' });

	const kindRow = wrap.createDiv({ cls: 'wnl-date-field__row' });
	kindRow.createDiv({ cls: 'wnl-date-field__label', text: '历法' });
	const kindBar = kindRow.createDiv({ cls: 'wnl-date-field__kind' });
	const solarBtn = kindBar.createEl('button', {
		cls: 'wnl-date-field__kind-btn',
		text: '阳历',
		attr: { type: 'button' },
	});
	const lunarBtn = kindBar.createEl('button', {
		cls: 'wnl-date-field__kind-btn',
		text: '阴历',
		attr: { type: 'button' },
	});

	const syncKind = (): void => {
		const kind = opts.getKind();
		solarBtn.toggleClass('is-active', kind === 'solar');
		lunarBtn.toggleClass('is-active', kind === 'lunar');
	};

	const setKind = (kind: EventKind): void => {
		opts.onKindChange(kind);
		const next = clampMonthDay(kind, opts.getMonth(), opts.getDay());
		opts.onChange(next.month, next.day);
		syncKind();
		syncParts();
	};

	solarBtn.addEventListener('click', () => setKind('solar'));
	lunarBtn.addEventListener('click', () => setKind('lunar'));

	const dateRow = wrap.createDiv({ cls: 'wnl-date-field__row' });
	dateRow.createDiv({ cls: 'wnl-date-field__label', text: '日期' });
	const parts = dateRow.createDiv({ cls: 'wnl-date-field__parts' });
	let monthInput!: HTMLInputElement;
	let dayInput!: HTMLInputElement;
	let dayUnit!: HTMLElement;

	const syncParts = (): void => {
		monthInput.value = String(opts.getMonth());
		const day = opts.getDay();
		if (day === 0) {
			dayInput.value = '除夕';
			dayUnit.setText('');
			dayUnit.toggleClass('is-empty', true);
		} else {
			dayInput.value = String(day);
			dayUnit.setText('日');
			dayUnit.toggleClass('is-empty', false);
		}
	};

	const applyMonthDay = (month: number, day: number): void => {
		const next = clampMonthDay(opts.getKind(), month, day);
		if (next.day === 0) {
			opts.onChange(12, 0);
		} else {
			opts.onChange(next.month, next.day);
		}
		syncParts();
	};

	const monthPart = createSpinPart(parts, {
		unit: '月',
		ariaLabel: '月',
		value: String(opts.getMonth()),
		onStep: (delta) => {
			let month = opts.getMonth() + delta;
			if (month > 12) month = 1;
			if (month < 1) month = 12;
			applyMonthDay(month, opts.getDay());
		},
		onCommit: (raw) => {
			const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
			applyMonthDay(
				Number.isFinite(parsed) ? parsed : opts.getMonth(),
				opts.getDay(),
			);
		},
	});
	monthInput = monthPart.input;

	const dayPart = createSpinPart(parts, {
		unit: opts.getDay() === 0 ? '' : '日',
		ariaLabel: '日',
		value: opts.getDay() === 0 ? '除夕' : String(opts.getDay()),
		onStep: (delta) => {
			const kind = opts.getKind();
			const month = opts.getMonth();
			const max = maxDayForMonth(kind, month);
			const min = kind === 'lunar' && month === 12 ? 0 : 1;
			let day = opts.getDay() + delta;
			if (day > max) day = min;
			if (day < min) day = max;
			applyMonthDay(month, day);
		},
		onCommit: (raw) => {
			const day = parseDayInput(raw);
			applyMonthDay(opts.getMonth(), day ?? opts.getDay());
		},
	});
	dayInput = dayPart.input;
	dayUnit = dayPart.unitEl;

	syncKind();
}

interface SpinPartOptions {
	unit: string;
	ariaLabel: string;
	value: string;
	onStep: (delta: number) => void;
	onCommit: (raw: string) => void;
}

function createSpinPart(
	parent: HTMLElement,
	options: SpinPartOptions,
): { input: HTMLInputElement; unitEl: HTMLElement } {
	const part = parent.createDiv({ cls: 'wnl-date-field__part' });

	const control = part.createDiv({ cls: 'wnl-date-field__control' });
	const input = control.createEl('input', {
		cls: 'wnl-date-field__input',
		type: 'text',
		value: options.value,
		attr: {
			inputmode: 'numeric',
			'aria-label': options.ariaLabel,
			autocomplete: 'off',
		},
	});

	const steppers = control.createDiv({ cls: 'wnl-date-field__spinners' });
	const upBtn = steppers.createEl('button', {
		cls: 'wnl-date-field__spin',
		attr: { type: 'button', title: `增加${options.ariaLabel}`, 'aria-label': `增加${options.ariaLabel}` },
	});
	setIcon(upBtn, 'chevron-up');
	const downBtn = steppers.createEl('button', {
		cls: 'wnl-date-field__spin',
		attr: { type: 'button', title: `减少${options.ariaLabel}`, 'aria-label': `减少${options.ariaLabel}` },
	});
	setIcon(downBtn, 'chevron-down');

	const unitEl = part.createSpan({
		cls: `wnl-date-field__unit${options.unit ? '' : ' is-empty'}`,
		text: options.unit,
	});

	const commit = (): void => {
		options.onCommit(input.value.trim());
	};

	input.addEventListener('change', commit);
	input.addEventListener('blur', commit);
	input.addEventListener('keydown', (evt) => {
		if (evt.key === 'Enter') {
			evt.preventDefault();
			commit();
			input.blur();
		} else if (evt.key === 'ArrowUp') {
			evt.preventDefault();
			options.onStep(1);
		} else if (evt.key === 'ArrowDown') {
			evt.preventDefault();
			options.onStep(-1);
		}
	});

	upBtn.addEventListener('click', (evt) => {
		evt.preventDefault();
		options.onStep(1);
	});
	downBtn.addEventListener('click', (evt) => {
		evt.preventDefault();
		options.onStep(-1);
	});

	return { input, unitEl };
}

function parseDayInput(raw: string): number | null {
	const text = raw.trim();
	if (!text) return null;
	if (text === '0' || text === '除夕' || text.includes('除夕')) return 0;
	const digits = text.replace(/[^\d]/g, '');
	if (!digits) return null;
	const n = parseInt(digits, 10);
	return Number.isFinite(n) ? n : null;
}

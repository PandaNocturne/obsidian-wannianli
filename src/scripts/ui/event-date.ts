import { setIcon } from 'obsidian';
import { YEAR_MAX, YEAR_MIN } from '../constants';
import { Animals, ShiChen, Zhi } from '../data/terms';
import {
	eventAgeYears,
	eventShiChen,
	normalizeYearRange,
	resolveEventCalcYear,
	type CustomEvent,
	type EventKind,
} from '../data/settings';
import { computeBazi, lunarMonthDays, lunarToSolar } from '../lunar';
import type { BaziPillars } from '../lunar';

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

/** 事件列表行：历法 / 日期 / 年份·岁数 / 时间 / 内置 / 已隐藏 */
export function renderEventMetaTags(
	parent: HTMLElement,
	event: Pick<
		CustomEvent,
		| 'kind'
		| 'month'
		| 'day'
		| 'builtin'
		| 'visible'
		| 'startYear'
		| 'endYear'
		| 'hour'
		| 'minute'
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
	const timeLabel = formatEventTimeLabel(event);
	if (timeLabel) {
		tags.createSpan({
			cls: 'wnl-event-tag wnl-event-tag--time',
			text: timeLabel,
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

export function formatEventTimeLabel(
	event: Pick<CustomEvent, 'hour' | 'minute'>,
): string | null {
	if (event.hour === undefined) return null;
	const h = String(event.hour).padStart(2, '0');
	const m = String(event.minute ?? 0).padStart(2, '0');
	const shiChen = eventShiChen(event);
	const shiLabel = shiChen !== undefined ? ShiChen[shiChen] : null;
	return shiLabel ? `${h}:${m} · ${shiLabel}` : `${h}:${m}`;
}

/** 年份标签：含自动岁数（算到今年，不超过结束年） */
export function formatYearRangeLabel(
	event: Pick<CustomEvent, 'startYear' | 'endYear'>,
): string | null {
	const { startYear, endYear } = event;
	const age = eventAgeYears(event);
	const agePart = age !== null ? `${age}岁` : null;

	let range: string | null = null;
	if (startYear !== undefined && endYear !== undefined) {
		range = startYear === endYear ? `${startYear}年` : `${startYear}–${endYear}`;
	} else if (startYear !== undefined) {
		range = `${startYear}年`;
	} else if (endYear !== undefined) {
		range = `至${endYear}年`;
	}

	if (range && agePart) return `${range} · ${agePart}`;
	if (agePart) return agePart;
	return range;
}

/**
 * 解析事件对应公历日（用于八字 / 生肖）。
 * - 阳历：起年（或今年）+ 月日
 * - 阴历：有起年时按「农历年」换算（腊月等跨公历年更符合「某年生」）；
 *   无起年时在近三年中取落在目标公历年的那次
 */
export function resolveEventSolarDate(
	event: Pick<
		CustomEvent,
		'kind' | 'month' | 'day' | 'startYear' | 'endYear'
	>,
	nowYear = new Date().getFullYear(),
): Date | null {
	const year = resolveEventCalcYear(event, nowYear);

	try {
		if (event.kind === 'solar') {
			if (event.day < 1 || event.month < 1 || event.month > 12) return null;
			return new Date(year, event.month - 1, event.day);
		}

		const lMonth = event.day === 0 ? 12 : event.month;
		if (lMonth < 1 || lMonth > 12) return null;

		const lunarDate = (ly: number): Date | null => {
			if (ly < YEAR_MIN || ly > YEAR_MAX) return null;
			const maxDay = lunarMonthDays(ly, lMonth);
			const lDay = event.day === 0 ? maxDay : Math.min(event.day, maxDay);
			if (lDay < 1) return null;
			return lunarToSolar(ly, lMonth, lDay, false);
		};

		// 有起年：起年视为农历年（避免腊月被映射到上一年腊月 → 立春前误成上年生肖）
		if (event.startYear !== undefined) {
			return lunarDate(year);
		}

		for (const ly of [year, year - 1, year + 1]) {
			const d = lunarDate(ly);
			if (d && d.getFullYear() === year) return d;
		}

		return lunarDate(year);
	} catch {
		return null;
	}
}

/** 由事件推算生辰八字（立春换年、节气换月） */
export function computeEventBazi(event: CustomEvent): BaziPillars | null {
	const solar = resolveEventSolarDate(event);
	if (!solar) return null;
	return computeBazi(
		solar.getFullYear(),
		solar.getMonth() + 1,
		solar.getDate(),
		event.hour,
		event.minute ?? 0,
	);
}

/** 时柱干支文案 */
export function formatHourPillar(event: CustomEvent): string | null {
	const bazi = computeEventBazi(event);
	if (!bazi?.hour) {
		const shiChen = eventShiChen(event);
		return shiChen !== undefined ? (ShiChen[shiChen] ?? null) : null;
	}
	return `${bazi.hour}时`;
}

/** 天干地支文案（有时刻则含时柱） */
export function formatEventGanzhiLine(event: CustomEvent): string | null {
	const bazi = computeEventBazi(event);
	if (!bazi) return null;

	let text = `${bazi.year}年 ${bazi.month}月 ${bazi.day}日`;
	if (bazi.hour) text += ` ${bazi.hour}时`;
	return text;
}

/** 生肖（按八字年支；无八字时回退开始年） */
export function formatEventZodiac(event: CustomEvent): string | null {
	const bazi = computeEventBazi(event);
	if (bazi?.year) {
		const idx = Zhi.indexOf(bazi.year.charAt(1));
		if (idx >= 0) return Animals[idx] ?? null;
	}
	if (event.startYear !== undefined) {
		return Animals[((event.startYear - 4) % 12 + 12) % 12] ?? null;
	}
	return null;
}

/** 事件条目：生肖与八字同一行（按事件自身开关） */
export function renderEventAstroLines(
	parent: HTMLElement,
	event: CustomEvent,
): void {
	const showZodiac = event.showZodiac === true;
	const showBazi = event.showBazi === true;
	if (!showZodiac && !showBazi) return;

	const zodiac = showZodiac ? formatEventZodiac(event) : null;
	const bazi = showBazi ? computeEventBazi(event) : null;
	if (!zodiac && !bazi) return;

	const el = parent.createDiv({ cls: 'wnl-event-modal__row-astro' });
	if (zodiac) {
		el.createSpan({ cls: 'wnl-bazi wnl-bazi--zodiac', text: `${zodiac}年` });
	}
	if (bazi) {
		el.createSpan({ cls: 'wnl-bazi wnl-bazi--year', text: `${bazi.year}年` });
		el.createSpan({ cls: 'wnl-bazi wnl-bazi--month', text: `${bazi.month}月` });
		el.createSpan({ cls: 'wnl-bazi wnl-bazi--day', text: `${bazi.day}日` });
		if (bazi.hour) {
			el.createSpan({ cls: 'wnl-bazi wnl-bazi--hour', text: `${bazi.hour}时` });
		}
	}
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

export interface TimeFieldOptions {
	getHour: () => string;
	getMinute: () => string;
	onHourChange: (value: string) => void;
	onMinuteChange: (value: string) => void;
}

/** 时间一栏：24 小时制时:分，留空=未知 */
export function renderTimeField(parent: HTMLElement, opts: TimeFieldOptions): void {
	const wrap = parent.createDiv({ cls: 'wnl-date-field' });
	const row = wrap.createDiv({ cls: 'wnl-date-field__row' });
	row.createDiv({ cls: 'wnl-date-field__label', text: '时间' });

	const parts = row.createDiv({ cls: 'wnl-date-field__parts wnl-date-field__parts--years' });

	const hourInput = createYearInput(parts, {
		ariaLabel: '时',
		placeholder: '时',
		value: opts.getHour(),
		onChange: opts.onHourChange,
	});
	hourInput.classList.add('wnl-date-field__input--time');
	hourInput.title = '0–23，留空未知';

	parts.createSpan({ cls: 'wnl-date-field__sep', text: ':' });

	const minuteInput = createYearInput(parts, {
		ariaLabel: '分',
		placeholder: '分',
		value: opts.getMinute(),
		onChange: opts.onMinuteChange,
	});
	minuteInput.classList.add('wnl-date-field__input--time');
	minuteInput.title = '0–59';

	hourInput.value = opts.getHour();
	minuteInput.value = opts.getMinute();
}

export function timeFromInputs(
	hourRaw: string,
	minuteRaw: string,
): { hour?: number; minute?: number } {
	const h = hourRaw.trim();
	const m = minuteRaw.trim();
	if (!h && !m) return {};
	const hour = Number.parseInt(h, 10);
	if (!Number.isFinite(hour) || hour < 0 || hour > 23) return {};
	let minute = 0;
	if (m) {
		const parsed = Number.parseInt(m, 10);
		if (!Number.isFinite(parsed) || parsed < 0 || parsed > 59) return { hour, minute: 0 };
		minute = parsed;
	}
	return { hour, minute };
}

export function timeInputsFromEvent(
	event: Pick<CustomEvent, 'hour' | 'minute'>,
): { hour: string; minute: string } {
	if (event.hour === undefined) return { hour: '', minute: '' };
	return {
		hour: String(event.hour),
		minute: String(event.minute ?? 0),
	};
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

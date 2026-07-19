import type { CalendarMode } from '../ui/toolbar';
import { WEEKDAY_HEADERS } from '../constants';
import type { CalElement, DayCell, MonthData } from '../lunar';
import { cDay, lunarMonthToChinese } from '../lunar';
import { attachTooltipHandlers } from '../ui/tooltip';

export interface MonthGridOptions {
	compact?: boolean;
	showGz?: boolean;
	calendarMode?: CalendarMode;
	onDayClick?: (info: CalElement) => void;
}

/** 渲染单月日历表格到容器 */
export function renderMonthGrid(
	container: HTMLElement,
	data: MonthData,
	options: MonthGridOptions = {},
): void {
	const { compact = false, showGz = true, calendarMode = 'solar', onDayClick } = options;
	const isLunarMonth = data.kind === 'lunar' || calendarMode === 'lunar';

	const monthNum = data.month + 1;
	const wrap = container.createDiv({
		cls: compact
			? `wnl-month wnl-month--compact wnl-month--m${monthNum}`
			: `wnl-month wnl-month--m${monthNum}`,
	});

	const header = wrap.createDiv({ cls: 'wnl-month__header' });
	header.createEl('div', {
		cls: 'wnl-month__title',
		text: monthTitle(data),
	});
	if (showGz && !compact) {
		header.createEl('div', { cls: 'wnl-month__gz', text: data.gzText });
	}

	const table = wrap.createEl('table', { cls: 'wnl-grid' });
	const thead = table.createEl('thead');
	const headRow = thead.createEl('tr');
	for (let i = 0; i < WEEKDAY_HEADERS.length; i++) {
		const th = headRow.createEl('th', { text: WEEKDAY_HEADERS[i]! });
		if (i === 5) th.addClass('wnl-weekend-sat');
		if (i === 6) th.addClass('wnl-weekend-sun');
	}

	const tbody = table.createEl('tbody');
	for (let row = 0; row < 6; row++) {
		const tr = tbody.createEl('tr');
		for (let col = 0; col < 7; col++) {
			const cell = data.cells[row * 7 + col]!;
			fillDayTd(
				tr.createEl('td', { cls: 'wnl-day' }),
				cell,
				isLunarMonth ? 'lunar' : 'solar',
				onDayClick,
			);
		}
	}

	attachTooltipHandlers(wrap);
}

function monthTitle(data: MonthData): string {
	if (data.kind === 'lunar' && data.lunarMonth) {
		const leap = data.isLeapMonth ? '闰' : '';
		return `${data.year} 年 ${leap}${lunarMonthToChinese(data.lunarMonth)}月`;
	}
	return `${data.year} 年 ${data.month + 1} 月`;
}

function fillDayTd(
	td: HTMLElement,
	cell: DayCell,
	calendarMode: CalendarMode,
	onDayClick?: (info: CalElement) => void,
): void {
	if (!cell.valid) {
		td.addClass('wnl-day--empty');
		return;
	}

	td.dataset.sYear = String(cell.info.sYear);
	td.dataset.sMonth = String(cell.info.sMonth);
	td.dataset.sDay = String(cell.info.sDay);
	td.dataset.week = String(cell.info.week);
	td.dataset.lYear = String(cell.info.lYear);
	td.dataset.lMonth = String(cell.info.lMonth);
	td.dataset.lDay = String(cell.info.lDay);
	td.dataset.isLeap = cell.info.isLeap ? '1' : '0';
	td.dataset.cYear = cell.info.cYear;
	td.dataset.cMonth = cell.info.cMonth;
	td.dataset.cDay = cell.info.cDay;
	td.dataset.solarTerms = cell.info.solarTerms;
	td.dataset.solarFestival = cell.info.solarFestival;
	td.dataset.lunarFestival = cell.info.lunarFestival;

	if (cell.isToday) td.addClass('wnl-day--today');
	if (cell.col === 5) td.addClass('wnl-weekend-sat');
	if (cell.col === 6) td.addClass('wnl-weekend-sun');
	if (cell.info.lunarFestival || cell.info.solarTerms || cell.info.solarFestival) {
		td.addClass('wnl-day--festival');
	}
	if (onDayClick) {
		td.addClass('wnl-day--clickable');
		td.addEventListener('click', () => onDayClick(cell.info));
	}

	const { primary, secondary } = dayCellTexts(cell, calendarMode);

	td.createEl('div', {
		cls: 'wnl-day__solar',
		text: primary,
	});
	td.createEl('div', {
		cls: 'wnl-day__lunar',
		text: secondary,
	});
}

function dayCellTexts(
	cell: DayCell,
	mode: CalendarMode,
): { primary: string; secondary: string } {
	const info = cell.info;
	const festival =
		info.lunarFestival || info.solarTerms || info.solarFestival || '';

	if (mode === 'lunar') {
		// 按农历月排布时，主数字为农历日；初一显示「初一」即可（月名在标题）
		const primary = cDay(info.lDay) || String(info.lDay);
		const secondary = festival || `${info.sMonth}/${info.sDay}`;
		return { primary, secondary };
	}

	return {
		primary: String(cell.solarDay),
		secondary: cell.label,
	};
}

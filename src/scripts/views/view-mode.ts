import { buildLunarYearMonths, buildMonthData } from '../lunar';
import type { CalElement } from '../lunar';
import type { CalendarMode } from '../ui/toolbar';
import { renderMonthGrid } from './month-grid';

export interface RenderCalendarOptions {
	year: number;
	calendarMode?: CalendarMode;
	onDayClick?: (info: CalElement) => void;
}

/** 渲染年视图：阳历按公历月，阴历按农历月（含闰月） */
export function renderCalendarView(container: HTMLElement, options: RenderCalendarOptions): void {
	container.empty();
	const mode = options.calendarMode ?? 'solar';
	const board = container.createDiv({ cls: 'wnl-board wnl-board--year' });

	if (mode === 'lunar') {
		for (const month of buildLunarYearMonths(options.year)) {
			renderMonthGrid(board, month, {
				compact: true,
				showGz: false,
				calendarMode: 'lunar',
				onDayClick: options.onDayClick,
			});
		}
		return;
	}

	for (let m = 0; m < 12; m++) {
		renderMonthGrid(board, buildMonthData(options.year, m), {
			compact: true,
			showGz: false,
			calendarMode: 'solar',
			onDayClick: options.onDayClick,
		});
	}
}

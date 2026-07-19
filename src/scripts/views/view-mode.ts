import { buildLunarYearMonths, buildMonthData } from '../lunar';
import type { CalElement } from '../lunar';
import type { DisplaySettings } from '../ui/view-settings-modal';
import type { CalendarMode } from '../ui/toolbar';
import { MONTH_WIDTH_DEFAULT } from '../data/settings';
import { renderMonthGrid } from './month-grid';

export interface RenderCalendarOptions {
	year: number;
	calendarMode?: CalendarMode;
	display?: DisplaySettings;
	onDayClick?: (info: CalElement) => void;
}

/** 渲染年视图：阳历按公历月，阴历按农历月（含闰月） */
export function renderCalendarView(container: HTMLElement, options: RenderCalendarOptions): void {
	container.empty();
	const mode = options.calendarMode ?? 'solar';
	const display = options.display ?? {
		showWeekNumbers: false,
		colorfulTheme: true,
		monthWidth: MONTH_WIDTH_DEFAULT,
		gridGap: 10,
		showEventGanzhi: false,
		showEventShichen: false,
	};

	const board = container.createDiv({ cls: 'wnl-board wnl-board--year' });
	board.style.setProperty('--wnl-board-gap', `${display.gridGap}px`);
	board.style.setProperty('--wnl-month-width', `${display.monthWidth}px`);

	const gridOpts = {
		compact: true as const,
		showGz: false as const,
		showWeekNumbers: display.showWeekNumbers,
		colorfulTheme: display.colorfulTheme,
		onDayClick: options.onDayClick,
	};

	if (mode === 'lunar') {
		for (const month of buildLunarYearMonths(options.year)) {
			renderMonthGrid(board, month, {
				...gridOpts,
				calendarMode: 'lunar',
			});
		}
		return;
	}

	for (let m = 0; m < 12; m++) {
		renderMonthGrid(board, buildMonthData(options.year, m), {
			...gridOpts,
			calendarMode: 'solar',
		});
	}
}

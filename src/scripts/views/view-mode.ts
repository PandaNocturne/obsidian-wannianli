import { buildLunarYearMonths, buildMonthData, calendar } from '../lunar';
import type { CalElement } from '../lunar';
import type { DisplaySettings } from '../ui/view-settings-modal';
import type { CalendarMode } from '../ui/toolbar';
import { MONTH_WIDTH_DEFAULT } from '../data/settings';
import { renderMonthGrid } from './month-grid';
import { renderSolarTermsView } from './solar-terms-view';
import { renderZodiacView } from './zodiac-view';

export interface RenderCalendarOptions {
	year: number;
	calendarMode?: CalendarMode;
	display?: DisplaySettings;
	onDayClick?: (info: CalElement) => void;
	/** 生肖年表点击年份：切到阳历该年 */
	onZodiacYearClick?: (year: number) => void;
}

/** 渲染年视图：阳历 / 阴历 / 节气 / 生肖 */
export function renderCalendarView(container: HTMLElement, options: RenderCalendarOptions): void {
	container.empty();
	const mode = options.calendarMode ?? 'solar';
	const display = options.display ?? {
		showWeekNumbers: false,
		colorfulTheme: true,
		showMonthBackground: true,
		showMonthShadow: true,
		showNowInfo: true,
		monthWidth: MONTH_WIDTH_DEFAULT,
		gridGap: 10,
	};

	if (mode === 'solarTerms') {
		renderSolarTermsView(container, {
			year: options.year,
			colorfulTheme: display.colorfulTheme,
			showMonthShadow: display.showMonthShadow,
			onDayClick: options.onDayClick
				? (y, m, d) => options.onDayClick!(calendar(y, m - 1, d))
				: undefined,
		});
		return;
	}

	if (mode === 'zodiac') {
		renderZodiacView(container, {
			focusYear: options.year,
			colorfulTheme: display.colorfulTheme,
			showMonthShadow: display.showMonthShadow,
			onYearClick: options.onZodiacYearClick,
		});
		return;
	}

	const board = container.createDiv({ cls: 'wnl-board wnl-board--year' });
	board.style.setProperty('--wnl-board-gap', `${display.gridGap}px`);
	board.style.setProperty('--wnl-month-width', `${display.monthWidth}px`);

	const gridOpts = {
		compact: true as const,
		showGz: false as const,
		showWeekNumbers: display.showWeekNumbers,
		colorfulTheme: display.colorfulTheme,
		showMonthBackground: display.showMonthBackground,
		showMonthShadow: display.showMonthShadow,
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

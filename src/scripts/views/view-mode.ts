import { buildMonthData } from '../lunar';
import type { CalElement } from '../lunar';
import { renderMonthGrid } from './month-grid';

export interface RenderCalendarOptions {
	year: number;
	onDayClick?: (info: CalElement) => void;
}

/** 渲染年视图：自适应网格，单月最大 400px */
export function renderCalendarView(container: HTMLElement, options: RenderCalendarOptions): void {
	container.empty();
	const board = container.createDiv({ cls: 'wnl-board wnl-board--year' });
	for (let m = 0; m < 12; m++) {
		renderMonthGrid(board, buildMonthData(options.year, m), {
			compact: true,
			showGz: false,
			onDayClick: options.onDayClick,
		});
	}
}

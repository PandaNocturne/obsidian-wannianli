import {
	ZODIAC_TABS,
	dayunOfYear,
	listZodiacYearRows,
	zhiIndexOfYear,
	type DayunInfo,
	type ZodiacYearRow,
} from '../lunar/special-views';

export interface ZodiacViewOptions {
	/** 高亮年份（通常为导航栏当前年） */
	focusYear: number;
	onYearClick?: (year: number) => void;
}

type ZodiacLayout = 'table' | 'card';

const FILTER_KEY = 'zodiacFilter';
const LAYOUT_KEY = 'zodiacLayout';

/** 渲染 1900–2099 生肖年表（表格 / 卡片） */
export function renderZodiacView(
	container: HTMLElement,
	options: ZodiacViewOptions,
): void {
	const { focusYear, onYearClick } = options;
	const nowYear = new Date().getFullYear();
	const layout: ZodiacLayout =
		container.dataset[LAYOUT_KEY] === 'table' ? 'table' : 'card';

	const filterRaw = container.dataset[FILTER_KEY];
	const filterZhi =
		filterRaw === undefined || filterRaw === ''
			? null
			: Number.parseInt(filterRaw, 10);
	const hasFilter =
		filterZhi !== null && Number.isFinite(filterZhi) && filterZhi >= 0 && filterZhi < 12;

	const rows = listZodiacYearRows().filter(
		(row) => !hasFilter || row.zhiIndex === filterZhi,
	);

	container.empty();
	container.dataset[LAYOUT_KEY] = layout;
	if (hasFilter) container.dataset[FILTER_KEY] = String(filterZhi);

	const board = container.createDiv({ cls: 'wnl-board wnl-board--zodiac' });

	const toolbar = board.createDiv({ cls: 'wnl-zodiac-toolbar' });

	const layoutSwitch = toolbar.createDiv({
		cls: 'wnl-zodiac-layout',
		attr: { role: 'group', 'aria-label': '展示方式' },
	});
	for (const item of [
		{ id: 'card' as const, label: '卡片' },
		{ id: 'table' as const, label: '表格' },
	]) {
		const btn = layoutSwitch.createEl('button', {
			cls: 'wnl-zodiac-layout__btn' + (layout === item.id ? ' is-active' : ''),
			text: item.label,
			attr: { type: 'button', 'aria-pressed': String(layout === item.id) },
		});
		btn.addEventListener('click', () => {
			if (layout === item.id) return;
			container.dataset[LAYOUT_KEY] = item.id;
			renderZodiacView(container, options);
		});
	}

	const filters = toolbar.createDiv({
		cls: 'wnl-zodiac-filters',
		attr: { role: 'group', 'aria-label': '生肖筛选' },
	});
	const allBtn = filters.createEl('button', {
		cls: 'wnl-zodiac-filter' + (!hasFilter ? ' is-active' : ''),
		text: '全部',
		attr: { type: 'button', title: '显示全部生肖年' },
	});
	allBtn.addEventListener('click', () => {
		delete container.dataset[FILTER_KEY];
		renderZodiacView(container, options);
	});

	const currentZhi = zhiIndexOfYear(nowYear);
	for (const tab of ZODIAC_TABS) {
		const btn = filters.createEl('button', {
			cls:
				'wnl-zodiac-filter' +
				(hasFilter && filterZhi === tab.zhiIndex ? ' is-active' : '') +
				(tab.zhiIndex === currentZhi ? ' is-current-animal' : ''),
			text: tab.label,
			attr: {
				type: 'button',
				title: `筛选${tab.label}年`,
			},
		});
		btn.addEventListener('click', () => {
			container.dataset[FILTER_KEY] = String(tab.zhiIndex);
			renderZodiacView(container, options);
		});
	}

	if (layout === 'card') {
		renderCardLayout(board, rows, {
			nowYear,
			focusYear,
			onYearClick,
		});
	} else {
		renderTableLayout(board, rows, {
			nowYear,
			focusYear,
			onYearClick,
		});
	}
}

function renderTableLayout(
	board: HTMLElement,
	rows: ZodiacYearRow[],
	opts: {
		nowYear: number;
		focusYear: number;
		onYearClick?: (year: number) => void;
	},
): void {
	const tableWrap = board.createDiv({ cls: 'wnl-zodiac-table-wrap' });
	const table = tableWrap.createEl('table', { cls: 'wnl-zodiac-table' });
	const thead = table.createEl('thead');
	const headRow = thead.createEl('tr');
	for (const label of ['年份', '干支年', '农历新年', '地支生肖', '五行', '阴阳']) {
		headRow.createEl('th', { text: label });
	}

	const tbody = table.createEl('tbody');
	for (const row of rows) {
		appendZodiacRow(tbody, row, {
			isToday: row.year === opts.nowYear,
			isFocus: row.year === opts.focusYear,
			onYearClick: opts.onYearClick,
		});
	}

	scrollToHighlight(tableWrap);
}

function renderCardLayout(
	board: HTMLElement,
	rows: ZodiacYearRow[],
	opts: {
		nowYear: number;
		focusYear: number;
		onYearClick?: (year: number) => void;
	},
): void {
	const wrap = board.createDiv({ cls: 'wnl-zodiac-card-wrap' });
	const grid = wrap.createDiv({ cls: 'wnl-zodiac-card-grid' });

	let lastDayunStart: number | null = null;
	for (const row of rows) {
		const dayun = dayunOfYear(row.year);
		if (dayun.startYear !== lastDayunStart) {
			appendDayunSeparatorCard(grid, dayun);
			lastDayunStart = dayun.startYear;
		}

		const isToday = row.year === opts.nowYear;
		const isFocus = row.year === opts.focusYear;
		const card = grid.createDiv({
			cls:
				'wnl-zodiac-year-card' +
				(isToday ? ' is-today' : '') +
				(isFocus ? ' is-focus' : '') +
				(opts.onYearClick ? ' is-clickable' : ''),
			attr: { 'data-animal': row.animal },
		});

		const head = card.createDiv({ cls: 'wnl-zodiac-year-card__head' });
		head.createDiv({
			cls: 'wnl-zodiac-year-card__year',
			text: String(row.year),
		});
		head.createDiv({
			cls: 'wnl-zodiac-year-card__label',
			text: row.label,
		});

		card.createDiv({
			cls: 'wnl-zodiac-year-card__cny',
			text: `农历新年 ${row.lunarNewYearText}`,
		});

		const meta = card.createDiv({ cls: 'wnl-zodiac-year-card__meta' });
		meta.createSpan({
			cls: 'wnl-zodiac-pill wnl-zodiac-pill--animal',
			text: row.zhiAnimal,
		});
		meta.createSpan({
			cls: `wnl-zodiac-pill wnl-zodiac-pill--wx-${row.wuxing}`,
			text: row.wuxing,
		});
		meta.createSpan({
			cls: `wnl-zodiac-pill wnl-zodiac-pill--yy-${row.yinYang}`,
			text: row.yinYang,
		});

		if (opts.onYearClick) {
			card.addEventListener('click', () => opts.onYearClick!(row.year));
		}
	}

	scrollToHighlight(wrap);
}

function scrollToHighlight(root: HTMLElement): void {
	requestAnimationFrame(() => {
		const target =
			root.querySelector('.is-today') ?? root.querySelector('.is-focus');
		target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
	});
}

function appendDayunSeparatorCard(grid: HTMLElement, dayun: DayunInfo): void {
	grid.createDiv({
		cls: 'wnl-zodiac-dayun wnl-zodiac-dayun--card',
		text: dayun.label,
	});
}

function appendZodiacRow(
	tbody: HTMLElement,
	row: ZodiacYearRow,
	opts: {
		isToday: boolean;
		isFocus: boolean;
		onYearClick?: (year: number) => void;
	},
): void {
	const tr = tbody.createEl('tr', {
		cls:
			'wnl-zodiac-table__row' +
			(opts.isToday ? ' is-today' : '') +
			(opts.isFocus ? ' is-focus' : '') +
			(opts.onYearClick ? ' is-clickable' : ''),
	});

	tr.createEl('td', {
		cls: 'wnl-zodiac-table__year',
		text: String(row.year),
	});
	tr.createEl('td', {
		cls: 'wnl-zodiac-table__label',
		text: row.label,
	});
	tr.createEl('td', {
		cls: 'wnl-zodiac-table__cny',
		text: row.lunarNewYearText,
	});

	const animalTd = tr.createEl('td', { cls: 'wnl-zodiac-table__animal' });
	animalTd.createSpan({
		cls: 'wnl-zodiac-pill wnl-zodiac-pill--animal',
		text: row.zhiAnimal,
	});

	const wxTd = tr.createEl('td', { cls: 'wnl-zodiac-table__wuxing' });
	wxTd.createSpan({
		cls: `wnl-zodiac-pill wnl-zodiac-pill--wx-${row.wuxing}`,
		text: row.wuxing,
	});

	const yyTd = tr.createEl('td', { cls: 'wnl-zodiac-table__yinyang' });
	yyTd.createSpan({
		cls: `wnl-zodiac-pill wnl-zodiac-pill--yy-${row.yinYang}`,
		text: row.yinYang,
	});

	if (opts.onYearClick) {
		tr.addEventListener('click', () => opts.onYearClick!(row.year));
	}
}

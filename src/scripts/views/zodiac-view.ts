import { Animals } from '../data/terms';
import { listZodiacYearRows, type ZodiacYearRow } from '../lunar/special-views';

export interface ZodiacViewOptions {
	/** 高亮年份（通常为导航栏当前年） */
	focusYear: number;
	onYearClick?: (year: number) => void;
}

const FILTER_KEY = 'zodiacFilter';

/** 渲染 1900–2099 生肖年表（表格） */
export function renderZodiacView(
	container: HTMLElement,
	options: ZodiacViewOptions,
): void {
	const { focusYear, onYearClick } = options;
	const nowYear = new Date().getFullYear();
	const filter = container.dataset[FILTER_KEY] ?? '';
	const rows = listZodiacYearRows().filter(
		(row) => !filter || row.animal === filter,
	);

	container.empty();
	const board = container.createDiv({ cls: 'wnl-board wnl-board--zodiac' });

	const filters = board.createDiv({
		cls: 'wnl-zodiac-filters',
		attr: { role: 'group', 'aria-label': '生肖筛选' },
	});
	const allBtn = filters.createEl('button', {
		cls: 'wnl-zodiac-filter' + (!filter ? ' is-active' : ''),
		text: '所有生肖',
		attr: { type: 'button' },
	});
	allBtn.addEventListener('click', () => {
		delete container.dataset[FILTER_KEY];
		renderZodiacView(container, options);
	});

	for (const animal of Animals) {
		const btn = filters.createEl('button', {
			cls:
				'wnl-zodiac-filter' +
				(filter === animal ? ' is-active' : ''),
			text: animal,
			attr: { type: 'button', title: `筛选属${animal}` },
		});
		btn.addEventListener('click', () => {
			container.dataset[FILTER_KEY] = animal;
			renderZodiacView(container, options);
		});
	}

	board.createDiv({
		cls: 'wnl-zodiac-hint',
		text: '点击行可切换到该年阳历视图',
	});

	const tableWrap = board.createDiv({ cls: 'wnl-zodiac-table-wrap' });
	const table = tableWrap.createEl('table', { cls: 'wnl-zodiac-table' });
	const thead = table.createEl('thead');
	const headRow = thead.createEl('tr');
	for (const label of ['年份', '干支年', '农历新年', '生肖', '五行', '阴阳']) {
		headRow.createEl('th', { text: label });
	}

	const tbody = table.createEl('tbody');
	for (const row of rows) {
		appendZodiacRow(tbody, row, {
			isToday: row.year === nowYear,
			isFocus: row.year === focusYear,
			onYearClick,
		});
	}

	requestAnimationFrame(() => {
		const target =
			tableWrap.querySelector('.wnl-zodiac-table__row.is-today') ??
			tableWrap.querySelector('.wnl-zodiac-table__row.is-focus');
		target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
		text: row.animal,
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

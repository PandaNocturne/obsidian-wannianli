import { cDay, lunarMonthToChinese } from '../lunar';

const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

let tooltipEl: HTMLElement | null = null;
let bound = false;

function ensureTooltip(): HTMLElement {
	if (tooltipEl && tooltipEl.isConnected) return tooltipEl;
	tooltipEl = document.body.createDiv({ cls: 'wnl-tooltip' });
	tooltipEl.hide();
	return tooltipEl;
}

function readDataset(td: HTMLElement) {
	const ds = td.dataset;
	return {
		sYear: ds.sYear ?? '',
		sMonth: ds.sMonth ?? '',
		sDay: ds.sDay ?? '',
		week: parseInt(ds.week ?? '0', 10),
		lMonth: parseInt(ds.lMonth ?? '0', 10),
		lDay: parseInt(ds.lDay ?? '0', 10),
		isLeap: ds.isLeap === '1',
		cYear: ds.cYear ?? '',
		cMonth: ds.cMonth ?? '',
		cDay: ds.cDay ?? '',
		solarTerms: ds.solarTerms ?? '',
		solarFestival: ds.solarFestival ?? '',
		lunarFestival: ds.lunarFestival ?? '',
	};
}

function showTooltip(td: HTMLElement, clientX: number, clientY: number): void {
	const tip = ensureTooltip();
	const d = readDataset(td);
	const leap = d.isLeap ? '闰' : '';
	const lMonthCn = d.lMonth ? lunarMonthToChinese(d.lMonth) : '';
	const lDayCn = d.lDay ? cDay(d.lDay) : '';
	const weekText = WEEK_NAMES[d.week] ?? '';

	let festival = '';
	if (d.solarTerms || d.solarFestival || d.lunarFestival) {
		festival =
			`<div class="wnl-tooltip__festival">${[d.solarTerms, d.solarFestival, d.lunarFestival]
				.filter(Boolean)
				.join(' ')}</div>`;
	}

	tip.innerHTML =
		`<div class="wnl-tooltip__body">` +
		`<div>${d.sYear} 年 ${d.sMonth} 月 ${d.sDay} 日</div>` +
		`<div>星期${weekText}</div>` +
		`<div class="wnl-tooltip__lunar">农历${leap}${lMonthCn}月${lDayCn}</div>` +
		`<div class="wnl-tooltip__ganzhi">${d.cYear}年 ${d.cMonth}月 ${d.cDay}日</div>` +
		festival +
		`</div>`;

	tip.style.left = `${clientX + 12}px`;
	tip.style.top = `${clientY + 16}px`;
	tip.show();
}

function hideTooltip(): void {
	tooltipEl?.hide();
}

function onOver(evt: MouseEvent): void {
	const target = evt.target as HTMLElement | null;
	const td = target?.closest?.('.wnl-day:not(.wnl-day--empty)') as HTMLElement | null;
	if (!td) return;
	showTooltip(td, evt.clientX, evt.clientY);
}

function onMove(evt: MouseEvent): void {
	if (!tooltipEl) return;
	const target = evt.target as HTMLElement | null;
	const td = target?.closest?.('.wnl-day:not(.wnl-day--empty)');
	if (!td) return;
	tooltipEl.style.left = `${evt.clientX + 12}px`;
	tooltipEl.style.top = `${evt.clientY + 16}px`;
}

function onOut(evt: MouseEvent): void {
	const related = evt.relatedTarget as HTMLElement | null;
	if (related?.closest?.('.wnl-day:not(.wnl-day--empty)')) return;
	hideTooltip();
}

/** 在月历容器上挂载悬停详情（事件委托） */
export function attachTooltipHandlers(root: HTMLElement): void {
	root.addEventListener('mouseover', onOver);
	root.addEventListener('mousemove', onMove);
	root.addEventListener('mouseout', onOut);

	if (!bound) {
		bound = true;
		document.addEventListener('scroll', hideTooltip, true);
	}
}

export function destroyTooltip(): void {
	hideTooltip();
	tooltipEl?.remove();
	tooltipEl = null;
}

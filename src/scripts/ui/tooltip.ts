import { cDay, lunarMonthToChinese } from '../lunar';

const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const OFFSET = 12;
const EDGE_PAD = 8;

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

/** 按视口边界自动切换到左/上侧，避免贴边裁切 */
function positionTooltip(tip: HTMLElement, clientX: number, clientY: number): void {
	const rect = tip.getBoundingClientRect();
	const vw = window.innerWidth;
	const vh = window.innerHeight;

	let left = clientX + OFFSET;
	let top = clientY + OFFSET;

	if (left + rect.width + EDGE_PAD > vw) {
		left = clientX - rect.width - OFFSET;
	}
	if (top + rect.height + EDGE_PAD > vh) {
		top = clientY - rect.height - OFFSET;
	}

	left = Math.max(EDGE_PAD, Math.min(left, vw - rect.width - EDGE_PAD));
	top = Math.max(EDGE_PAD, Math.min(top, vh - rect.height - EDGE_PAD));

	tip.setCssProps({
		left: `${left}px`,
		top: `${top}px`,
	});
}

function showTooltip(td: HTMLElement, clientX: number, clientY: number): void {
	const tip = ensureTooltip();
	const d = readDataset(td);
	const leap = d.isLeap ? '闰' : '';
	const lMonthCn = d.lMonth ? lunarMonthToChinese(d.lMonth) : '';
	const lDayCn = d.lDay ? cDay(d.lDay) : '';
	const weekText = WEEK_NAMES[d.week] ?? '';

	tip.empty();
	const body = tip.createDiv({ cls: 'wnl-tooltip__body' });
	body.createDiv({ text: `${d.sYear} 年 ${d.sMonth} 月 ${d.sDay} 日` });
	body.createDiv({ text: `星期${weekText}` });
	body.createDiv({
		cls: 'wnl-tooltip__lunar',
		text: `农历${leap}${lMonthCn}月${lDayCn}`,
	});
	body.createDiv({
		cls: 'wnl-tooltip__ganzhi',
		text: `${d.cYear}年 ${d.cMonth}月 ${d.cDay}日`,
	});

	const festivalParts = [d.solarTerms, d.solarFestival, d.lunarFestival].filter(Boolean);
	if (festivalParts.length) {
		body.createDiv({
			cls: 'wnl-tooltip__festival',
			text: festivalParts.join(' '),
		});
	}

	// 先放到视口内再测量，避免 display:none 时尺寸为 0
	tip.setCssProps({ left: '0px', top: '0px' });
	tip.show();
	positionTooltip(tip, clientX, clientY);
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
	if (!tooltipEl || tooltipEl.style.display === 'none') return;
	const target = evt.target as HTMLElement | null;
	const td = target?.closest?.('.wnl-day:not(.wnl-day--empty)');
	if (!td) return;
	positionTooltip(tooltipEl, evt.clientX, evt.clientY);
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

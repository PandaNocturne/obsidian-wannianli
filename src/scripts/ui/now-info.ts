import { Animals, ShiChen, Zhi } from '../data/terms';
import { clockToShiChen, computeBazi } from '../lunar';

/** 格式化并渲染顶部「此刻」信息条（居中） */
export function renderNowInfo(container: HTMLElement, now = new Date()): void {
	const y = now.getFullYear();
	const m = now.getMonth() + 1;
	const d = now.getDate();
	const hh = String(now.getHours()).padStart(2, '0');
	const mm = String(now.getMinutes()).padStart(2, '0');
	const ss = String(now.getSeconds()).padStart(2, '0');

	const bazi = computeBazi(y, m, d, now.getHours(), now.getMinutes());
	const yearZhi = bazi.year.charAt(1);
	const animalIdx = Zhi.indexOf(yearZhi);
	const animal = animalIdx >= 0 ? (Animals[animalIdx] ?? '') : '';
	const shiChen = clockToShiChen(now.getHours(), now.getMinutes());
	const shiLabel = ShiChen[shiChen] ?? '';
	const hourText = bazi.hour ? `${bazi.hour}时` : shiLabel;

	let root = container.querySelector('.wnl-now-info') as HTMLElement | null;
	if (!root) {
		container.empty();
		root = container.createDiv({ cls: 'wnl-now-info' });
		root.createDiv({ cls: 'wnl-now-info__solar' });
		root.createDiv({ cls: 'wnl-now-info__bazi' });
	}

	const solarEl = root.querySelector('.wnl-now-info__solar') as HTMLElement | null;
	const baziEl = root.querySelector('.wnl-now-info__bazi') as HTMLElement | null;
	if (!solarEl || !baziEl) return;

	solarEl.empty();
	solarEl.createSpan({ cls: 'wnl-now-info__label', text: '公元' });
	solarEl.createSpan({
		cls: 'wnl-now-info__date',
		text: `${y}年 ${m}月 ${d}日`,
	});
	solarEl.createSpan({
		cls: 'wnl-now-info__time',
		text: `${hh}:${mm}:${ss}`,
	});

	baziEl.empty();
	baziEl.createSpan({
		cls: 'wnl-bazi wnl-bazi--year',
		text: `${bazi.year}${animal}年`,
	});
	baziEl.createSpan({ cls: 'wnl-bazi wnl-bazi--month', text: `${bazi.month}月` });
	baziEl.createSpan({ cls: 'wnl-bazi wnl-bazi--day', text: `${bazi.day}日` });
	baziEl.createSpan({ cls: 'wnl-bazi wnl-bazi--hour', text: hourText });
}

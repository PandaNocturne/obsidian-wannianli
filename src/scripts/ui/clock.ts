import { formatClock, formatCurrentDate } from '../lunar';

/** 顶部当前日期与时钟 */
export class ClockDisplay {
	private dateEl: HTMLElement | null = null;
	private clockEl: HTMLElement | null = null;
	private timer = 0;

	mount(container: HTMLElement): void {
		container.empty();
		const box = container.createDiv({ cls: 'wnl-clock' });
		this.dateEl = box.createEl('div', { cls: 'wnl-clock__date' });
		this.clockEl = box.createEl('div', { cls: 'wnl-clock__time' });
		this.tick();
		this.timer = window.setInterval(() => this.tick(), 1000);
	}

	private tick(): void {
		const now = new Date();
		if (this.dateEl) this.dateEl.setText(formatCurrentDate(now));
		if (this.clockEl) this.clockEl.setText(formatClock(now));
	}

	destroy(): void {
		if (this.timer) window.clearInterval(this.timer);
		this.timer = 0;
		this.dateEl = null;
		this.clockEl = null;
	}
}

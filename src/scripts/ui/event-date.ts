import type { DropdownComponent } from 'obsidian';
import type { CustomEvent, EventKind } from '../data/settings';

export function maxDayForKind(kind: EventKind): number {
	return kind === 'lunar' ? 30 : 31;
}

export function isValidMonthDay(kind: EventKind, month: number, day: number): boolean {
	if (month < 1 || month > 12) return false;
	if (day === 0) return kind === 'lunar' && month === 12;
	if (day < 1) return false;
	if (kind === 'lunar') return day <= 30;
	const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
	return day <= (maxDays[month - 1] ?? 0);
}

export function formatEventDate(event: Pick<CustomEvent, 'kind' | 'month' | 'day'>): string {
	if (event.day === 0) return '农历十二月 除夕';
	return event.kind === 'solar'
		? `阳历 ${event.month}月${event.day}日`
		: `阴历 ${event.month}月${event.day}日`;
}

export function fillMonthOptions(dd: DropdownComponent, month: number): void {
	for (let m = 1; m <= 12; m++) {
		dd.addOption(String(m), `${m}月`);
	}
	dd.setValue(String(month));
}

export function fillDayOptions(dd: DropdownComponent, kind: EventKind, day: number): void {
	if (day === 0) {
		dd.addOption('0', '除夕（月末）');
	}
	const maxDay = maxDayForKind(kind);
	for (let d = 1; d <= maxDay; d++) {
		dd.addOption(String(d), `${d}日`);
	}
	dd.setValue(String(day === 0 ? 0 : Math.min(day, maxDay)));
}

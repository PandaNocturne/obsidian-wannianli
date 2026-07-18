import { Modal, Notice, Setting } from 'obsidian';
import type WannianliPlugin from '../../main';
import {
	findCustomEvents,
	removeCustomEvent,
	upsertCustomEvent,
} from '../data/event-store';
import { createEventId, type CustomEvent, type EventKind } from '../data/settings';
import { cDay, lunarMonthToChinese } from '../lunar';
import type { CalElement } from '../lunar/types';

export interface DayEventModalResult {
	changed: boolean;
}

/**
 * 点击某日：查看/添加/修改当日自定义阳历与阴历事件
 */
export class DayEventModal extends Modal {
	private changed = false;
	private draftName = '';
	private draftKind: EventKind = 'solar';

	constructor(
		private plugin: WannianliPlugin,
		private dayInfo: CalElement,
		private onDone: (result: DayEventModalResult) => void,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.setTitle('自定义事件');
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
		this.onDone({ changed: this.changed });
	}

	private render(): void {
		const { contentEl, dayInfo } = this;
		contentEl.empty();
		contentEl.addClass('wnl-event-modal');

		const leap = dayInfo.isLeap ? '闰' : '';
		const lMonthCn = dayInfo.lMonth ? lunarMonthToChinese(dayInfo.lMonth) : '';
		const lDayCn = dayInfo.lDay ? cDay(dayInfo.lDay) : '';

		contentEl.createDiv({
			cls: 'wnl-event-modal__summary',
			text: `公历 ${dayInfo.sYear}年${dayInfo.sMonth}月${dayInfo.sDay}日 · 农历${leap}${lMonthCn}月${lDayCn}`,
		});

		const solarEvents = findCustomEvents('solar', dayInfo.sMonth, dayInfo.sDay);
		const lunarEvents =
			dayInfo.lMonth && dayInfo.lDay && !dayInfo.isLeap
				? findCustomEvents('lunar', dayInfo.lMonth, dayInfo.lDay)
				: [];

		this.renderEventList(contentEl, '阳历事件（每年同月日）', solarEvents);
		this.renderEventList(contentEl, '阴历事件（每年农历同月日）', lunarEvents);

		contentEl.createEl('h4', { text: '添加事件', cls: 'wnl-event-modal__heading' });

		new Setting(contentEl)
			.setName('名称')
			.addText((text) => {
				text.setPlaceholder('例如：生日、纪念日').setValue(this.draftName);
				text.onChange((v) => {
					this.draftName = v;
				});
			});

		new Setting(contentEl)
			.setName('类型')
			.addDropdown((dd) => {
				dd.addOption('solar', `阳历 ${dayInfo.sMonth}月${dayInfo.sDay}日`);
				if (dayInfo.lMonth && dayInfo.lDay && !dayInfo.isLeap) {
					dd.addOption(
						'lunar',
						`阴历 ${leap}${lMonthCn}月${lDayCn}（${dayInfo.lMonth}月${dayInfo.lDay}日）`,
					);
				}
				dd.setValue(this.draftKind);
				dd.onChange((v) => {
					this.draftKind = v as EventKind;
				});
			});

		new Setting(contentEl).addButton((btn) => {
			btn.setButtonText('添加')
				.setCta()
				.onClick(() => {
					void this.addEvent();
				});
		});
	}

	private renderEventList(
		parent: HTMLElement,
		title: string,
		events: CustomEvent[],
	): void {
		parent.createEl('h4', { text: title, cls: 'wnl-event-modal__heading' });

		if (events.length === 0) {
			parent.createDiv({
				cls: 'wnl-event-modal__empty',
				text: '暂无自定义事件',
			});
			return;
		}

		for (const event of events) {
			const row = parent.createDiv({ cls: 'wnl-event-modal__row' });
			let editName = event.name;

			new Setting(row)
				.setName(event.name)
				.setDesc(
					event.kind === 'solar'
						? `阳历 ${event.month}月${event.day}日`
						: `阴历 ${event.month}月${event.day}日`,
				)
				.addText((text) => {
					text.setValue(event.name);
					text.onChange((v) => {
						editName = v;
					});
				})
				.addButton((btn) => {
					btn.setButtonText('保存').onClick(() => {
						void this.saveEvent({ ...event, name: editName.trim() });
					});
				})
				.addButton((btn) => {
					btn.setButtonText('删除')
						.setWarning()
						.onClick(() => {
							void this.deleteEvent(event.id);
						});
				});
		}
	}

	private async addEvent(): Promise<void> {
		const name = this.draftName.trim();
		if (!name) {
			new Notice('请填写事件名称');
			return;
		}

		const { dayInfo } = this;
		const month = this.draftKind === 'solar' ? dayInfo.sMonth : dayInfo.lMonth;
		const day = this.draftKind === 'solar' ? dayInfo.sDay : dayInfo.lDay;

		if (!month || !day) {
			new Notice('无法确定日期');
			return;
		}

		if (this.draftKind === 'lunar' && dayInfo.isLeap) {
			new Notice('闰月日期暂不支持添加阴历事件');
			return;
		}

		await this.persist(
			upsertCustomEvent({
				id: createEventId(),
				name,
				kind: this.draftKind,
				month,
				day,
			}),
		);

		this.draftName = '';
		this.changed = true;
		new Notice('已添加事件');
		this.render();
	}

	private async saveEvent(event: CustomEvent): Promise<void> {
		if (!event.name) {
			new Notice('名称不能为空');
			return;
		}
		await this.persist(upsertCustomEvent(event));
		this.changed = true;
		new Notice('已保存');
		this.render();
	}

	private async deleteEvent(id: string): Promise<void> {
		await this.persist(removeCustomEvent(id));
		this.changed = true;
		new Notice('已删除');
		this.render();
	}

	private async persist(events: CustomEvent[]): Promise<void> {
		this.plugin.settings.customEvents = events;
		await this.plugin.saveSettings();
	}
}

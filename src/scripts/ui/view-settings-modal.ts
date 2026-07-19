import { Modal, Setting } from 'obsidian';
import type WannianliPlugin from '../../main';
import {
	clampGridGap,
	clampMonthWidth,
	GRID_GAP_MAX,
	GRID_GAP_MIN,
	MONTH_WIDTH_MAX,
	MONTH_WIDTH_MIN,
	type WannianliSettings,
} from '../data/settings';

export type DisplaySettings = Pick<
	WannianliSettings,
	| 'showWeekNumbers'
	| 'colorfulTheme'
	| 'showMonthBackground'
	| 'showMonthShadow'
	| 'showNowInfo'
	| 'showZodiacBackground'
	| 'monthWidth'
	| 'gridGap'
>;

/** 视图显示设置弹窗 */
export class ViewSettingsModal extends Modal {
	private draft: DisplaySettings;

	constructor(
		private plugin: WannianliPlugin,
		private onChanged: () => void,
	) {
		super(plugin.app);
		const s = plugin.settings;
		this.draft = {
			showWeekNumbers: s.showWeekNumbers,
			colorfulTheme: s.colorfulTheme,
			showMonthBackground: s.showMonthBackground,
			showMonthShadow: s.showMonthShadow,
			showNowInfo: s.showNowInfo,
			showZodiacBackground: s.showZodiacBackground,
			monthWidth: s.monthWidth,
			gridGap: s.gridGap,
		};
	}

	onOpen(): void {
		this.setTitle('显示设置');
		this.modalEl.addClass('wnl-settings-modal');
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('wnl-settings');

		new Setting(contentEl)
			.setName('此刻信息')
			.setDesc('顶部显示当前公历日期时间与八字干支')
			.addToggle((toggle) => {
				toggle.setValue(this.draft.showNowInfo).onChange((value) => {
					this.draft.showNowInfo = value;
					void this.persist();
				});
			});

		new Setting(contentEl)
			.setName('显示周次')
			.setDesc('在月历左侧显示 ISO 周序号')
			.addToggle((toggle) => {
				toggle.setValue(this.draft.showWeekNumbers).onChange((value) => {
					this.draft.showWeekNumbers = value;
					void this.persist();
				});
			});

		new Setting(contentEl)
			.setName('彩色主题')
			.setDesc('按月份使用不同主题色；关闭后使用统一配色')
			.addToggle((toggle) => {
				toggle.setValue(this.draft.colorfulTheme).onChange((value) => {
					this.draft.colorfulTheme = value;
					void this.persist();
				});
			});

		new Setting(contentEl)
			.setName('月份背景')
			.setDesc('在月卡片中以大号虚色显示月份，如「1月」')
			.addToggle((toggle) => {
				toggle.setValue(this.draft.showMonthBackground).onChange((value) => {
					this.draft.showMonthBackground = value;
					void this.persist();
				});
			});

		new Setting(contentEl)
			.setName('生肖背景')
			.setDesc('在生肖卡片中以大号虚色显示生肖，如「马」')
			.addToggle((toggle) => {
				toggle.setValue(this.draft.showZodiacBackground).onChange((value) => {
					this.draft.showZodiacBackground = value;
					void this.persist();
				});
			});

		new Setting(contentEl)
			.setName('显示阴影')
			.setDesc('月卡片是否显示轻微阴影')
			.addToggle((toggle) => {
				toggle.setValue(this.draft.showMonthShadow).onChange((value) => {
					this.draft.showMonthShadow = value;
					void this.persist();
				});
			});

		new Setting(contentEl)
			.setName('自适应宽度')
			.setDesc(
				`月卡片最小宽度（${MONTH_WIDTH_MIN}–${MONTH_WIDTH_MAX}px），越小列数越多`,
			)
			.addSlider((slider) => {
				slider
					.setLimits(MONTH_WIDTH_MIN, MONTH_WIDTH_MAX, 10)
					.setValue(this.draft.monthWidth)
					.setDynamicTooltip()
					.onChange((value) => {
						this.draft.monthWidth = clampMonthWidth(value);
						void this.persist();
					});
			});

		new Setting(contentEl)
			.setName('网格间隔')
			.setDesc(`月卡片之间的间距（${GRID_GAP_MIN}–${GRID_GAP_MAX}px）`)
			.addSlider((slider) => {
				slider
					.setLimits(GRID_GAP_MIN, GRID_GAP_MAX, 1)
					.setValue(this.draft.gridGap)
					.setDynamicTooltip()
					.onChange((value) => {
						this.draft.gridGap = clampGridGap(value);
						void this.persist();
					});
			});
	}

	private async persist(): Promise<void> {
		Object.assign(this.plugin.settings, this.draft);
		await this.plugin.saveSettings();
		this.onChanged();
	}
}

import { Modal, setIcon } from 'obsidian';
import type WannianliPlugin from '../../main';
import { YEAR_MAX, YEAR_MIN } from '../constants';
import { buildDayDetail, shiftSolarDate, type DayDetailModel } from '../lunar/day-detail';
import { DayEventModal } from './event-modal';

/**
 * 居中黄历详情：公历/农历/干支、节气节日、宜忌，可左右切换日期
 */
export class DayDetailModal extends Modal {
	private y: number;
	private m: number;
	private d: number;
	private eventsChanged = false;

	constructor(
		private plugin: WannianliPlugin,
		year: number,
		month: number,
		day: number,
		private onDone: (result: { changed: boolean }) => void,
	) {
		super(plugin.app);
		this.y = year;
		this.m = month;
		this.d = day;
	}

	onOpen(): void {
		this.containerEl.addClass('wnl-day-detail-container');
		this.modalEl.addClass('wnl-day-detail-modal');
		this.titleEl.empty();
		this.titleEl.hide();
		this.scope.register([], 'ArrowLeft', () => {
			this.shift(-1);
			return false;
		});
		this.scope.register([], 'ArrowRight', () => {
			this.shift(1);
			return false;
		});
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
		this.onDone({ changed: this.eventsChanged });
	}

	private render(): void {
		const model = buildDayDetail(this.y, this.m, this.d);
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('wnl-day-detail');
		contentEl.addClass(`wnl-day-detail--m${this.m}`);

		const hero = contentEl.createDiv({ cls: 'wnl-day-detail__hero' });

		const top = hero.createDiv({ cls: 'wnl-day-detail__top' });
		top.createDiv({
			cls: 'wnl-day-detail__header',
			text: model.headerText,
		});
		if (model.isToday) {
			top.createSpan({ cls: 'wnl-day-detail__today', text: '今天' });
		}

		const nav = hero.createDiv({ cls: 'wnl-day-detail__nav' });
		const prev = nav.createEl('button', {
			cls: 'wnl-day-detail__arrow',
			attr: { 'aria-label': '前一天', type: 'button' },
		});
		setIcon(prev, 'chevron-left');
		prev.disabled = !this.canShift(-1);
		prev.addEventListener('click', () => this.shift(-1));

		const dayBlock = nav.createDiv({ cls: 'wnl-day-detail__dayblock' });
		dayBlock.createDiv({
			cls: 'wnl-day-detail__daynum',
			text: String(this.d),
		});
		dayBlock.createDiv({
			cls: 'wnl-day-detail__weekday',
			text: `星期${WEEK_CN[model.info.week] ?? ''}`,
		});

		const next = nav.createEl('button', {
			cls: 'wnl-day-detail__arrow',
			attr: { 'aria-label': '后一天', type: 'button' },
		});
		setIcon(next, 'chevron-right');
		next.disabled = !this.canShift(1);
		next.addEventListener('click', () => this.shift(1));

		hero.createDiv({
			cls: 'wnl-day-detail__lunar',
			text: `${model.zodiac}年 · ${model.lunarText}`,
		});

		hero.createDiv({
			cls: 'wnl-day-detail__ganzhi',
			text: model.ganzhiText,
		});

		const body = contentEl.createDiv({ cls: 'wnl-day-detail__body' });
		this.renderMeta(body, model);
		this.renderYiJi(body, model);

		const actions = body.createDiv({ cls: 'wnl-day-detail__actions' });
		const manageBtn = actions.createEl('button', {
			cls: 'wnl-day-detail__linkbtn',
			attr: { type: 'button' },
		});
		setIcon(manageBtn, 'calendar-plus');
		manageBtn.createSpan({ text: '当日事件' });
		manageBtn.addEventListener('click', () => {
			new DayEventModal(this.plugin, model.info, (result) => {
				if (result.changed) {
					this.eventsChanged = true;
					this.render();
				}
			}).open();
		});
	}

	private renderMeta(parent: HTMLElement, model: DayDetailModel): void {
		const meta = parent.createDiv({ cls: 'wnl-day-detail__meta' });

		const dao = model.almanac;
		if (dao.jianChu) {
			const pill = meta.createDiv({ cls: 'wnl-day-detail__pill' });
			pill.createSpan({ cls: 'wnl-day-detail__pill-main', text: dao.jianChu });
			pill.createSpan({
				cls: dao.isHuangDao
					? 'wnl-day-detail__pill-sub wnl-day-detail__pill-sub--huang'
					: 'wnl-day-detail__pill-sub wnl-day-detail__pill-sub--hei',
				text: dao.isHuangDao ? `黄道·${dao.huangDao}` : `黑道·${dao.huangDao}`,
			});
		}

		if (model.tags.length > 0) {
			const tags = meta.createDiv({ cls: 'wnl-day-detail__tags' });
			for (const tag of model.tags) {
				tags.createSpan({ cls: 'wnl-day-detail__tag', text: tag });
			}
		}
	}

	private renderYiJi(parent: HTMLElement, model: DayDetailModel): void {
		const card = parent.createDiv({ cls: 'wnl-day-detail__yiji' });

		const yiRow = card.createDiv({ cls: 'wnl-day-detail__yiji-row' });
		yiRow.createDiv({ cls: 'wnl-day-detail__badge wnl-day-detail__badge--yi', text: '宜' });
		yiRow.createDiv({
			cls: 'wnl-day-detail__yiji-text',
			text: model.almanac.yi.length ? model.almanac.yi.join(' ') : '—',
		});

		const jiRow = card.createDiv({ cls: 'wnl-day-detail__yiji-row' });
		jiRow.createDiv({ cls: 'wnl-day-detail__badge wnl-day-detail__badge--ji', text: '忌' });
		jiRow.createDiv({
			cls: 'wnl-day-detail__yiji-text',
			text: model.almanac.ji.length ? model.almanac.ji.join(' ') : '—',
		});
	}

	private canShift(delta: number): boolean {
		const next = shiftSolarDate(this.y, this.m, this.d, delta);
		return next.y >= YEAR_MIN && next.y <= YEAR_MAX;
	}

	private shift(delta: number): void {
		if (!this.canShift(delta)) return;
		const next = shiftSolarDate(this.y, this.m, this.d, delta);
		this.y = next.y;
		this.m = next.m;
		this.d = next.d;
		this.render();
	}
}

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

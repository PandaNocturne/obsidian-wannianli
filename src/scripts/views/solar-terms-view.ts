import { listSolarTerms, type SolarTermItem } from '../lunar/special-views';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export interface SolarTermsViewOptions {
	year: number;
	colorfulTheme?: boolean;
	showMonthShadow?: boolean;
	onDayClick?: (year: number, month: number, day: number) => void;
}

function formatDaysFromToday(delta: number): string {
	if (delta === 0) return '交节日';
	if (delta > 0) return `${delta}天后`;
	return `${-delta}天前`;
}

/** 渲染当年二十四节气视图 */
export function renderSolarTermsView(
	container: HTMLElement,
	options: SolarTermsViewOptions,
): void {
	const {
		year,
		colorfulTheme = true,
		showMonthShadow = true,
		onDayClick,
	} = options;
	const terms = listSolarTerms(year);

	const board = container.createDiv({
		cls: 'wnl-board wnl-board--terms',
	});

	const winterTerms = [
		...terms.filter((t) => t.index <= 1),
		...terms.filter((t) => t.index >= 20),
	];
	const seasons: { name: string; items: SolarTermItem[]; theme: number }[] = [
		{
			name: '春',
			items: terms.filter((t) => t.index >= 2 && t.index <= 7),
			theme: 3,
		},
		{
			name: '夏',
			items: terms.filter((t) => t.index >= 8 && t.index <= 13),
			theme: 6,
		},
		{
			name: '秋',
			items: terms.filter((t) => t.index >= 14 && t.index <= 19),
			theme: 9,
		},
		{ name: '冬', items: winterTerms, theme: 12 },
	];

	for (const season of seasons) {
		const section = board.createDiv({
			cls:
				'wnl-season' +
				(colorfulTheme ? ` wnl-month--m${season.theme}` : ' wnl-month--plain') +
				(showMonthShadow ? ' wnl-month--shadow' : ''),
		});
		section.createDiv({ cls: 'wnl-season__title', text: season.name });
		const grid = section.createDiv({ cls: 'wnl-season__grid' });

		for (const term of season.items) {
			const card = grid.createDiv({
				cls:
					'wnl-term-card' +
					(term.isCurrent ? ' is-current' : '') +
					(term.daysFromToday === 0 ? ' is-today' : '') +
					(onDayClick ? ' is-clickable' : ''),
			});

			const head = card.createDiv({ cls: 'wnl-term-card__head' });
			head.createDiv({ cls: 'wnl-term-card__name', text: term.name });
			head.createDiv({
				cls:
					'wnl-term-card__delta' +
					(term.isCurrent
						? ' is-now'
						: term.daysFromToday > 0
							? ' is-future'
							: ' is-past'),
				text: term.isCurrent ? '当前节气' : formatDaysFromToday(term.daysFromToday),
			});

			card.createDiv({
				cls: 'wnl-term-card__date',
				text: `${term.year}年${term.month}月${term.day}日 星期${WEEK[term.week]!}`,
			});

			card.createDiv({
				cls: 'wnl-term-card__range',
				text: `起 ${term.startText}  ·  止 ${term.endText}`,
			});

			if (term.lunarText) {
				card.createDiv({
					cls: 'wnl-term-card__lunar',
					text: `农历${term.lunarText}${term.zodiac ? ` · ${term.zodiac}年` : ''}`,
				});
			}

			if (term.ganzhiText) {
				card.createDiv({
					cls: 'wnl-term-card__ganzhi',
					text: term.ganzhiText,
				});
			}

			const meta = card.createDiv({ cls: 'wnl-term-card__meta' });
			if (term.jianChu) {
				meta.createSpan({
					cls: 'wnl-term-card__tag',
					text: `${term.jianChu}日`,
				});
			}
			if (term.huangDao) {
				meta.createSpan({
					cls:
						'wnl-term-card__tag' +
						(term.isHuangDao ? ' is-huang' : ' is-hei'),
					text: term.huangDao,
				});
			}
			meta.createSpan({
				cls: 'wnl-term-card__tag',
				text: `持续${term.daysToNext}天`,
			});

			if (onDayClick) {
				card.addEventListener('click', () => {
					onDayClick(term.year, term.month, term.day);
				});
			}
		}
	}
}

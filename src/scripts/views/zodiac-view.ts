import {
	ganzhiOfYear,
	listZodiacGroups,
	zodiacOfYear,
} from '../lunar/special-views';

export interface ZodiacViewOptions {
	/** 高亮年份（通常为导航栏当前年） */
	focusYear: number;
	colorfulTheme?: boolean;
	showMonthShadow?: boolean;
	onYearClick?: (year: number) => void;
}

/** 渲染 1900–2099 十二生肖年表 */
export function renderZodiacView(
	container: HTMLElement,
	options: ZodiacViewOptions,
): void {
	const {
		focusYear,
		colorfulTheme = true,
		showMonthShadow = true,
		onYearClick,
	} = options;
	const nowYear = new Date().getFullYear();
	const groups = listZodiacGroups();

	const board = container.createDiv({ cls: 'wnl-board wnl-board--zodiac' });
	const firstGroup = groups[0];
	const rangeStart = firstGroup?.years[0] ?? 1900;
	const rangeEnd =
		firstGroup?.years[firstGroup.years.length - 1] ?? 2099;
	board.createDiv({
		cls: 'wnl-zodiac-hint',
		text: `十二生肖年表（${rangeStart}–${rangeEnd}）· 点击年份切换到阳历视图`,
	});

	const grid = board.createDiv({ cls: 'wnl-zodiac-grid' });

	for (const group of groups) {
		const theme = (group.zhiIndex % 12) + 1;
		const card = grid.createDiv({
			cls:
				'wnl-zodiac-card' +
				(colorfulTheme ? ` wnl-month--m${theme}` : ' wnl-month--plain') +
				(showMonthShadow ? ' wnl-month--shadow' : ''),
		});
		const head = card.createDiv({ cls: 'wnl-zodiac-card__head' });
		head.createSpan({ cls: 'wnl-zodiac-card__animal', text: group.animal });
		head.createSpan({
			cls: 'wnl-zodiac-card__meta',
			text: `${group.years.length} 年`,
		});

		const years = card.createDiv({ cls: 'wnl-zodiac-card__years' });
		for (const y of group.years) {
			const btn = years.createEl('button', {
				cls:
					'wnl-zodiac-year' +
					(y === nowYear ? ' is-today' : '') +
					(y === focusYear ? ' is-focus' : ''),
				text: String(y),
				attr: {
					type: 'button',
					title: `${y} ${ganzhiOfYear(y)}年 · 属${zodiacOfYear(y)}`,
				},
			});
			if (onYearClick) {
				btn.addEventListener('click', () => onYearClick(y));
			}
		}
	}
}

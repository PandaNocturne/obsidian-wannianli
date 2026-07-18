/** 农历日转中文（初一、廿二等） */
export function cDay(d: number): string {
	const day = parseInt(String(d), 10);
	if (isNaN(day) || day <= 0 || day > 30) return '';

	const nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

	switch (day) {
		case 10:
			return '初十';
		case 20:
			return '二十';
		case 30:
			return '三十';
		case 1:
		case 2:
		case 3:
		case 4:
		case 5:
		case 6:
		case 7:
		case 8:
		case 9:
			return '初' + nums[day - 1];
		case 11:
		case 12:
		case 13:
		case 14:
		case 15:
		case 16:
		case 17:
		case 18:
		case 19:
			return '十' + nums[day - 11];
		case 21:
		case 22:
		case 23:
		case 24:
		case 25:
		case 26:
		case 27:
		case 28:
		case 29:
			return '廿' + nums[day - 21];
		default:
			return '';
	}
}

/** 农历月份数字转中文（正、二…腊） */
export function lunarMonthToChinese(month: number): string {
	const monthNums = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
	if (month >= 1 && month <= 12) return monthNums[month - 1]!;
	return String(month);
}

export function padZero(num: number): string {
	return num < 10 ? '0' + num : String(num);
}

const WEEKDAY_CN = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export function formatCurrentDate(date: Date = new Date()): string {
	return (
		' 公元 ' +
		date.getFullYear() +
		' 年 ' +
		(date.getMonth() + 1) +
		'月 ' +
		date.getDate() +
		'日 ' +
		WEEKDAY_CN[date.getDay()]
	);
}

export function formatClock(date: Date = new Date()): string {
	return (
		date.getFullYear() +
		'/' +
		padZero(date.getMonth() + 1) +
		'/' +
		padZero(date.getDate()) +
		' ' +
		padZero(date.getHours()) +
		':' +
		padZero(date.getMinutes()) +
		':' +
		padZero(date.getSeconds())
	);
}

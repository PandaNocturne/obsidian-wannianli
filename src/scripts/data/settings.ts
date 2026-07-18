/** 自定义事件类型：阳历（公历）或阴历（农历） */
export type EventKind = 'solar' | 'lunar';

/** 用户自定义事件（按月日每年重复） */
export interface CustomEvent {
	id: string;
	name: string;
	kind: EventKind;
	/** 1–12 */
	month: number;
	/** 1–31 */
	day: number;
}

export interface WannianliSettings {
	customEvents: CustomEvent[];
}

/** 从原 festivals 个人生日迁入的默认自定义事件 */
export const DEFAULT_CUSTOM_EVENTS: CustomEvent[] = [
	{ id: 'default-guo', name: '郭XX生日', kind: 'lunar', month: 9, day: 24 },
	{ id: 'default-liu', name: '刘xx生日', kind: 'lunar', month: 11, day: 8 },
	{ id: 'default-qiu', name: '邱xx生日', kind: 'lunar', month: 2, day: 13 },
	{ id: 'default-mom', name: '老妈生日', kind: 'lunar', month: 5, day: 12 },
	{ id: 'default-li', name: '李xx生日', kind: 'lunar', month: 5, day: 18 },
	{ id: 'default-yang', name: '杨xx生日', kind: 'lunar', month: 6, day: 25 },
	{ id: 'default-dad', name: '老爸生日', kind: 'lunar', month: 7, day: 12 },
	{ id: 'default-ouyang', name: '欧阳xx生日', kind: 'lunar', month: 7, day: 18 },
];

export const DEFAULT_SETTINGS: WannianliSettings = {
	customEvents: DEFAULT_CUSTOM_EVENTS.map((e) => ({ ...e })),
};

export function createEventId(): string {
	return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

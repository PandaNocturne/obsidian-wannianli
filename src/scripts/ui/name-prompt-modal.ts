import { Modal, Setting } from 'obsidian';

/** 简易名称输入弹窗：新建 / 重命名标签 */
export class NamePromptModal extends Modal {
	private value: string;

	constructor(
		app: ConstructorParameters<typeof Modal>[0],
		private titleText: string,
		initial: string,
		private placeholder: string,
		private onSubmit: (value: string) => void | Promise<void>,
	) {
		super(app);
		this.value = initial;
	}

	onOpen(): void {
		this.setTitle(this.titleText);
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl)
			.setName('名称')
			.addText((text) => {
				text.setPlaceholder(this.placeholder).setValue(this.value);
				text.inputEl.select();
				text.onChange((v) => {
					this.value = v;
				});
				text.inputEl.addEventListener('keydown', (evt) => {
					if (evt.key === 'Enter') {
						evt.preventDefault();
						void this.submit();
					}
				});
			});

		new Setting(contentEl)
			.addButton((btn) => {
				btn.setButtonText('取消').onClick(() => this.close());
			})
			.addButton((btn) => {
				btn.setButtonText('确定')
					.setCta()
					.onClick(() => {
						void this.submit();
					});
			});
	}

	private async submit(): Promise<void> {
		const next = this.value.trim();
		if (!next) return;
		await this.onSubmit(next);
		this.close();
	}
}

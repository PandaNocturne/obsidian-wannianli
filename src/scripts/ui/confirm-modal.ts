import { Modal, Setting } from 'obsidian';

/** 二次确认弹窗 */
export class ConfirmModal extends Modal {
	constructor(
		app: ConstructorParameters<typeof Modal>[0],
		private titleText: string,
		private message: string,
		private onConfirm: () => void | Promise<void>,
		private confirmText = '删除',
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.titleText);
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('p', {
			cls: 'wnl-confirm-modal__message',
			text: this.message,
		});

		new Setting(contentEl)
			.addButton((btn) => {
				btn.setButtonText('取消').onClick(() => this.close());
			})
			.addButton((btn) => {
				btn
					.setButtonText(this.confirmText)
					.setWarning()
					.onClick(() => {
						void this.submit();
					});
			});
	}

	private async submit(): Promise<void> {
		await this.onConfirm();
		this.close();
	}
}

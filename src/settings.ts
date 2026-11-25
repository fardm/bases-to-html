import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import type BasesToHtmlPlugin from './main';
import { ExportFormat, ExportScope, ExportedDataScope, FontMode, OutputStorageMode } from './types';

export interface ExportPreferences {
	documentTitle: string;
	exportFormat: ExportFormat;
	exportedData: ExportedDataScope;
	exportScope: ExportScope;
	fontMode: FontMode;
	googleFontName: string;
	localFontPath: string;
	localFontName: string;
	customCssText: string;
	customCssVaultPaths: string[];
	outputMode: OutputStorageMode;
	vaultOutputFolder: string;
	localOutputFolder: string;
	openExportedFiles: boolean;
}

export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = {
	documentTitle: 'My archive',
	exportFormat: 'single',
	exportedData: 'all',
	exportScope: 'full',
	fontMode: 'default',
	googleFontName: '',
	localFontPath: '',
	localFontName: '',
	customCssText: '',
	customCssVaultPaths: [],
	outputMode: 'vault',
	vaultOutputFolder: '',
	localOutputFolder: '',
	openExportedFiles: true,
};

export interface BasesToHtmlSettings {
	exportPreferences: ExportPreferences;
	// Legacy top-level keys kept optional for backward-compatible migration
	outputMode?: OutputStorageMode;
	vaultOutputFolder?: string;
	localOutputFolder?: string;
	fontMode?: FontMode;
	googleFontName?: string;
	localFontPath?: string;
	localFontName?: string;
	defaultOutputFolder?: string;
}

export const DEFAULT_SETTINGS: BasesToHtmlSettings = {
	exportPreferences: { ...DEFAULT_EXPORT_PREFERENCES },
};

class ConfirmResetModal extends Modal {
	private onConfirm: () => Promise<void>;

	constructor(app: App, onConfirm: () => Promise<void>) {
		super(app);
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Reset export preferences?' });
		contentEl.createEl('p', {
			text: "This will clear your saved export modal preferences and restore the default settings. This won't delete any exported files.",
		});

		const actions = contentEl.createDiv({ cls: 'b2h-modal-actions' });
		const cancelBtn = actions.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const confirmBtn = actions.createEl('button', {
			text: 'Reset',
			cls: 'mod-warning',
		});
		confirmBtn.addEventListener('click', () => {
			void (async () => {
				await this.onConfirm();
				this.close();
			})();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export class BasesToHtmlSettingTab extends PluginSettingTab {
	plugin: BasesToHtmlPlugin;

	constructor(app: App, plugin: BasesToHtmlPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Reset Export Preferences')
			.setDesc("Clear your saved export preferences and restore the default settings. This won't delete any exported files.")
			.addButton((btn) => {
				btn.setButtonText('Reset');
				btn.buttonEl.addClass('mod-warning');
				btn.onClick(() => {
					new ConfirmResetModal(this.app, async () => {
						await this.plugin.resetExportPreferences();
						new Notice('Export preferences have been reset to defaults.');
					}).open();
				});
			});
	}
}

import { App, PluginSettingTab, Setting } from 'obsidian';
import type BasesToHtmlPlugin from './main';
import { ExportFormat, ExportScope, ExportedDataScope } from './types';
import { renderExportedDataRadioGroup } from './ui/exported-data-radio';
import { renderNoteContentRadioGroup } from './ui/note-content-radio';

export interface BasesToHtmlSettings {
	defaultTitle: string;
	defaultFormat: ExportFormat;
	defaultScope: ExportScope;
	defaultExportedData: ExportedDataScope;
	defaultFont: string;
	defaultOutputFolder: string;
	openAfterExport: boolean;
	customCss: string;
}

export const DEFAULT_SETTINGS: BasesToHtmlSettings = {
	defaultTitle: 'My archive',
	defaultFormat: 'single',
	defaultScope: 'full',
	defaultExportedData: 'all',
	defaultFont: 'vazirmatn',
	defaultOutputFolder: '',
	openAfterExport: true,
	customCss: '',
};

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
			.setName('Export defaults')
			.setHeading();

		new Setting(containerEl)
			.setName('Default document title')
			.setDesc('Default title for exported HTML pages.')
			.addText((text) =>
				text
					.setPlaceholder('My archive')
					.setValue(this.plugin.settings.defaultTitle)
					.onChange(async (val) => {
						this.plugin.settings.defaultTitle = val.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Default export format')
			.setDesc(
				'Single page embeds all scripts, styles, and images. Multi-file generates a structured directory.',
			)
			.addDropdown((drop) =>
				drop
					.addOption('single', 'Single page (embedded)')
					.addOption('multi', 'Multi-file (folder with assets)')
					.setValue(this.plugin.settings.defaultFormat)
					.onChange(async (val) => {
						this.plugin.settings.defaultFormat = val as ExportFormat;
						await this.plugin.saveSettings();
					}),
			);

		renderExportedDataRadioGroup(
			containerEl,
			this.plugin.settings.defaultExportedData,
			(val) => {
				this.plugin.settings.defaultExportedData = val;
				void this.plugin.saveSettings();
			},
			'settingsDefaultExportedData',
		);

		renderNoteContentRadioGroup(
			containerEl,
			this.plugin.settings.defaultScope,
			(val) => {
				this.plugin.settings.defaultScope = val;
				void this.plugin.saveSettings();
			},
			'settingsDefaultNoteContent',
		);

		new Setting(containerEl)
			.setName('Default font')
			.setDesc('Default typography font used in the output HTML.')
			.addDropdown((drop) =>
				drop
					.addOption('vazirmatn', 'Vazirmatn (default / multilingual)')
					.addOption('inter', 'Inter')
					.addOption('system-sans', 'System sans-serif')
					.addOption('system-serif', 'System serif')
					.setValue(this.plugin.settings.defaultFont)
					.onChange(async (val) => {
						this.plugin.settings.defaultFont = val;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Default output folder')
			.setDesc('Folder in vault to store exports (leave blank for vault root).')
			.addText((text) =>
				text
					.setPlaceholder('Exports')
					.setValue(this.plugin.settings.defaultOutputFolder)
					.onChange(async (val) => {
						this.plugin.settings.defaultOutputFolder = val.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Open exported files')
			.setDesc('Automatically open the exported HTML file after generation.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openAfterExport)
					.onChange(async (val) => {
						this.plugin.settings.openAfterExport = val;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Global custom CSS')
			.setDesc('Default CSS applied across exported HTML files.')
			.addTextArea((text) =>
				text
					.setPlaceholder('/* enter custom CSS rules */')
					.setValue(this.plugin.settings.customCss)
					.onChange(async (val) => {
						this.plugin.settings.customCss = val;
						await this.plugin.saveSettings();
					}),
			);
	}
}

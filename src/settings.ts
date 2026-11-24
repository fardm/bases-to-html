import { App, PluginSettingTab, Setting } from 'obsidian';
import type BasesToHtmlPlugin from './main';

export interface BasesToHtmlSettings {
	defaultOutputFolder: string;
}

export const DEFAULT_SETTINGS: BasesToHtmlSettings = {
	defaultOutputFolder: '',
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
			.setName('Default output folder')
			.setDesc('Vault folder location to store exports. Leave blank to save in vault root.')
			.addText((text) =>
				text
					.setPlaceholder('Exports (or leave blank for root)')
					.setValue(this.plugin.settings.defaultOutputFolder)
					.onChange(async (val) => {
						this.plugin.settings.defaultOutputFolder = val.trim();
						await this.plugin.saveSettings();
					}),
			);
	}
}

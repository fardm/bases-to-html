import { Plugin } from 'obsidian';
import {
	BasesToHtmlSettings,
	BasesToHtmlSettingTab,
	DEFAULT_SETTINGS,
} from './settings';
import { ExportModal } from './ui/export-modal';

export default class BasesToHtmlPlugin extends Plugin {
	settings!: BasesToHtmlSettings;

	async onload() {
		await this.loadSettings();

		// Add Ribbon icon to open export modal
		this.addRibbonIcon('layout-grid', 'Export to HTML', () => {
			new ExportModal(this.app, this).open();
		});

		// Add Command palette action
		this.addCommand({
			id: 'export-html',
			name: 'Export to HTML',
			callback: () => {
				new ExportModal(this.app, this).open();
			},
		});

		// Register Plugin settings tab
		this.addSettingTab(new BasesToHtmlSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<BasesToHtmlSettings>,
		);
		if ((this.settings.defaultScope as string) === 'all') {
			this.settings.defaultScope = 'full';
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

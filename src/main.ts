import { Plugin } from 'obsidian';
import {
	BasesToHtmlSettings,
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
	}

	onunload() {}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<BasesToHtmlSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);

		// Migrate legacy defaultOutputFolder from Community Settings into vaultOutputFolder
		if (!this.settings.vaultOutputFolder && this.settings.defaultOutputFolder) {
			this.settings.vaultOutputFolder = this.settings.defaultOutputFolder;
			delete this.settings.defaultOutputFolder;
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

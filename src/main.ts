import { Plugin } from 'obsidian';
import {
	BasesToHtmlSettings,
	BasesToHtmlSettingTab,
	DEFAULT_EXPORT_PREFERENCES,
	DEFAULT_SETTINGS,
	ExportPreferences,
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

		// Register Community Settings tab (Reset Export Preferences)
		this.addSettingTab(new BasesToHtmlSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<BasesToHtmlSettings> | null;
		const prefs: ExportPreferences = {
			...DEFAULT_EXPORT_PREFERENCES,
			...(loaded?.exportPreferences || {}),
		};

		// Migrate legacy top-level keys if present in older data.json
		let migrated = false;
		if (loaded) {
			if (!loaded.exportPreferences) {
				if (loaded.outputMode) prefs.outputMode = loaded.outputMode;
				if (loaded.vaultOutputFolder) prefs.vaultOutputFolder = loaded.vaultOutputFolder;
				else if (loaded.defaultOutputFolder) prefs.vaultOutputFolder = loaded.defaultOutputFolder;
				if (loaded.localOutputFolder) prefs.localOutputFolder = loaded.localOutputFolder;
				if (loaded.fontMode) prefs.fontMode = loaded.fontMode;
				if (loaded.googleFontName) prefs.googleFontName = loaded.googleFontName;
				if (loaded.localFontPath) prefs.localFontPath = loaded.localFontPath;
				if (loaded.localFontName) prefs.localFontName = loaded.localFontName;
				migrated = true;
			}
		}

		const rest: Record<string, unknown> = loaded ? { ...loaded } : {};
		delete rest.outputMode;
		delete rest.vaultOutputFolder;
		delete rest.localOutputFolder;
		delete rest.fontMode;
		delete rest.googleFontName;
		delete rest.localFontPath;
		delete rest.localFontName;
		delete rest.defaultOutputFolder;

		this.settings = {
			...DEFAULT_SETTINGS,
			...rest,
			exportPreferences: prefs,
		};

		if (migrated) {
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async resetExportPreferences() {
		this.settings.exportPreferences = {
			...DEFAULT_EXPORT_PREFERENCES,
			customCssVaultPaths: [],
		};
		await this.saveSettings();
	}
}

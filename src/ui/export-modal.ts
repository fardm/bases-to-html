import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { Exporter } from '../generator/exporter';
import type BasesToHtmlPlugin from '../main';
import { ExportFormat, ExportOptions, ExportScope } from '../types';

export class ExportModal extends Modal {
	private plugin: BasesToHtmlPlugin;
	private baseFiles: TFile[] = [];
	private selectedFiles: Set<string> = new Set();
	private documentTitle: string;
	private exportFormat: ExportFormat;
	private exportScope: ExportScope;
	private font: string;
	private customCss: string;
	private customCssScope: 'global' | 'per-base';
	private perBaseCss: Record<string, string> = {};
	private outputLocation: string;
	private openExportedFiles: boolean;

	constructor(app: App, plugin: BasesToHtmlPlugin) {
		super(app);
		this.plugin = plugin;

		const defaults = plugin.settings;
		this.documentTitle = defaults.defaultTitle || 'My archive';
		this.exportFormat = defaults.defaultFormat || 'single';
		this.exportScope = defaults.defaultScope || 'all';
		this.font = defaults.defaultFont || 'vazirmatn';
		this.customCss = defaults.customCss || '';
		this.customCssScope = defaults.customCssScope || 'global';
		this.outputLocation = defaults.defaultOutputFolder || '';
		this.openExportedFiles = defaults.openAfterExport ?? true;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('bases-to-html-export-modal');

		contentEl.createEl('h2', { text: 'Export bases to HTML' });

		// Discover all .base files in the vault
		this.baseFiles = this.app.vault
			.getFiles()
			.filter((f) => f.extension === 'base');

		// Pre-select all by default
		this.baseFiles.forEach((f) => this.selectedFiles.add(f.path));

		if (this.baseFiles.length === 0) {
			contentEl.createEl('p', {
				text: 'No base files found in your vault. Create a base file first to export.',
				cls: 'mod-warning',
			});
			return;
		}

		// 3.1 Document title
		new Setting(contentEl)
			.setName('Document title')
			.setDesc('Used for the document title, navigation bar, and output folder.')
			.addText((text) =>
				text
					.setValue(this.documentTitle)
					.setPlaceholder('My archive')
					.onChange((val) => {
						this.documentTitle = val.trim();
					}),
			);

		// 3.2 Select Base Files Section
		const baseFilesSection = contentEl.createDiv({
			cls: 'b2h-base-select-section',
		});
		baseFilesSection.createEl('h3', { text: 'Select base files' });

		const controlsRow = baseFilesSection.createDiv({
			cls: 'b2h-base-select-controls',
		});

		const searchInput = controlsRow.createEl('input', {
			type: 'text',
			placeholder: 'Filter bases...',
			cls: 'b2h-base-search-input',
		});

		const selectAllBtn = controlsRow.createEl('button', {
			text: 'Select all',
		});
		const deselectAllBtn = controlsRow.createEl('button', {
			text: 'Deselect all',
		});

		const fileListContainer = baseFilesSection.createDiv({
			cls: 'b2h-file-list-container',
		});

		const renderFileList = (filter = '') => {
			fileListContainer.empty();
			const lower = filter.toLowerCase();
			const matching = this.baseFiles.filter((f) =>
				f.path.toLowerCase().includes(lower),
			);

			if (matching.length === 0) {
				fileListContainer.createEl('p', {
					text: 'No matching base files.',
					cls: 'text-muted',
				});
				return;
			}

			matching.forEach((file) => {
				const row = fileListContainer.createDiv({ cls: 'b2h-file-checkbox-row' });

				const cb = row.createEl('input', { type: 'checkbox' });
				cb.checked = this.selectedFiles.has(file.path);
				cb.addEventListener('change', () => {
					if (cb.checked) {
						this.selectedFiles.add(file.path);
					} else {
						this.selectedFiles.delete(file.path);
					}
				});

				const label = row.createEl('label', {
					text: file.path,
					cls: 'b2h-file-checkbox-label',
				});
				label.addEventListener('click', () => {
					cb.checked = !cb.checked;
					cb.dispatchEvent(new Event('change'));
				});
			});
		};

		renderFileList();

		searchInput.addEventListener('input', (e) => {
			renderFileList((e.target as HTMLInputElement).value);
		});

		selectAllBtn.addEventListener('click', () => {
			this.baseFiles.forEach((f) => this.selectedFiles.add(f.path));
			renderFileList(searchInput.value);
		});

		deselectAllBtn.addEventListener('click', () => {
			this.selectedFiles.clear();
			renderFileList(searchInput.value);
		});

		// 3.3 Export format
		new Setting(contentEl)
			.setName('Export format')
			.setDesc(
				'Single page embeds scripts, styles, and images. Multi-file generates a structured directory.',
			)
			.addDropdown((drop) =>
				drop
					.addOption('single', 'Single page (embedded)')
					.addOption('multi', 'Multi-file (folder with assets)')
					.setValue(this.exportFormat)
					.onChange((val) => {
						this.exportFormat = val as ExportFormat;
					}),
			);

		// 3.4 Export scope
		new Setting(contentEl)
			.setName('Export scope')
			.setDesc(
				'Include notes renders full Markdown notes in interactive modals. Bases only exports base cards and metadata.',
			)
			.addDropdown((drop) =>
				drop
					.addOption('all', 'Include notes (full content in modals)')
					.addOption('bases-only', 'Bases only (cards view only)')
					.setValue(this.exportScope)
					.onChange((val) => {
						this.exportScope = val as ExportScope;
					}),
			);

		// 3.5 Font selection
		new Setting(contentEl)
			.setName('Font')
			.setDesc('Typography font loaded via Google fonts CDN in the HTML output.')
			.addDropdown((drop) =>
				drop
					.addOption('vazirmatn', 'Vazirmatn (default / multilingual)')
					.addOption('inter', 'Inter')
					.addOption('system-sans', 'System sans-serif')
					.addOption('system-serif', 'System serif')
					.setValue(this.font)
					.onChange((val) => {
						this.font = val;
					}),
			);

		// 3.6 Custom CSS
		new Setting(contentEl)
			.setName('Custom CSS scope')
			.setDesc('Apply custom styles across all bases or individually per base.')
			.addDropdown((drop) =>
				drop
					.addOption('global', 'Global (apply to all)')
					.addOption('per-base', 'Per-base (specific per base file)')
					.setValue(this.customCssScope)
					.onChange((val) => {
						this.customCssScope = val as 'global' | 'per-base';
					}),
			);

		new Setting(contentEl)
			.setName('Custom CSS code')
			.setDesc('Paste or edit custom CSS styles for the exported pages.')
			.addTextArea((text) =>
				text
					.setValue(this.customCss)
					.setPlaceholder('/* .base-card { border-radius: 20px; } */')
					.onChange((val) => {
						this.customCss = val;
					}),
			);

		// 3.7 Output location
		new Setting(contentEl)
			.setName('Output folder')
			.setDesc(
				'Vault folder location to save exports. Default creates a folder named after document title in vault root.',
			)
			.addText((text) =>
				text
					.setValue(this.outputLocation)
					.setPlaceholder('Exports (or leave blank for root)')
					.onChange((val) => {
						this.outputLocation = val.trim();
					}),
			);

		// 3.8 Open exported files
		new Setting(contentEl)
			.setName('Open exported files')
			.setDesc('Automatically open the exported HTML upon completion.')
			.addToggle((toggle) =>
				toggle.setValue(this.openExportedFiles).onChange((val) => {
					this.openExportedFiles = val;
				}),
			);

		// Action buttons
		const actionsContainer = contentEl.createDiv({
			cls: 'b2h-modal-actions',
		});

		const cancelBtn = actionsContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const exportBtn = actionsContainer.createEl('button', {
			text: 'Export HTML',
			cls: 'mod-cta',
		});
		exportBtn.addEventListener('click', () => {
			void this.triggerExport(exportBtn);
		});
	}

	private async triggerExport(exportBtn: HTMLButtonElement): Promise<void> {
		if (this.selectedFiles.size === 0) {
			new Notice('Please select at least one base file.');
			return;
		}

		exportBtn.disabled = true;
		exportBtn.setText('Exporting...');

		const options: ExportOptions = {
			documentTitle: this.documentTitle || 'My archive',
			baseFilePaths: Array.from(this.selectedFiles),
			exportFormat: this.exportFormat,
			exportScope: this.exportScope,
			font: this.font,
			customCss: this.customCss,
			customCssScope: this.customCssScope,
			perBaseCss: this.perBaseCss,
			outputLocation: this.outputLocation,
			openExportedFiles: this.openExportedFiles,
		};

		const exporter = new Exporter(this.app, this.plugin);
		try {
			await exporter.exportBases(options);
			this.close();
		} catch (err) {
			console.error('Export error:', err);
			const errorMsg = err instanceof Error ? err.message : String(err);
			new Notice(`Export failed: ${errorMsg}`);
		} finally {
			exportBtn.disabled = false;
			exportBtn.setText('Export HTML');
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

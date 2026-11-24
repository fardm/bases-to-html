import { App, FuzzySuggestModal, Modal, Notice, Setting, TFile } from 'obsidian';
import { Exporter } from '../generator/exporter';
import type BasesToHtmlPlugin from '../main';
import { ExportFormat, ExportOptions, ExportScope } from '../types';

class VaultCssPickerModal extends FuzzySuggestModal<TFile> {
	private onSelect: (file: TFile) => void;

	constructor(app: App, onSelect: (file: TFile) => void) {
		super(app);
		this.onSelect = onSelect;
		this.setPlaceholder('Select a CSS file from your vault...');
	}

	getItems(): TFile[] {
		return this.app.vault.getFiles().filter((f) => f.extension === 'css');
	}

	getItemText(item: TFile): string {
		return item.path;
	}

	onChooseItem(item: TFile): void {
		this.onSelect(item);
	}
}

export class ExportModal extends Modal {
	private plugin: BasesToHtmlPlugin;
	private baseFiles: TFile[] = [];
	private selectedFiles: Set<string> = new Set();
	private documentTitle: string;
	private exportFormat: ExportFormat;
	private exportScope: ExportScope;
	private font: string;
	private customCss: string;
	private cssSource: string;
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
		this.cssSource = this.customCss.trim() ? 'Default settings' : 'None';
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

		// 3.6 Custom CSS section
		const customCssSection = contentEl.createDiv({
			cls: 'b2h-custom-css-section',
		});

		const cssHeader = customCssSection.createDiv({
			cls: 'b2h-css-header',
		});

		const cssTitleGroup = cssHeader.createDiv({ cls: 'b2h-css-title-group' });
		cssTitleGroup.createDiv({
			text: 'Custom CSS',
			cls: 'setting-item-name',
		});
		cssTitleGroup.createDiv({
			text: 'Enter custom styles or select a stylesheet from your vault or local storage.',
			cls: 'setting-item-description',
		});

		const cssSourceIndicator = cssHeader.createDiv({
			cls: 'b2h-css-source-badge',
		});

		const updateSourceBadge = () => {
			cssSourceIndicator.setText(`Source: ${this.cssSource}`);
		};
		updateSourceBadge();

		const cssControlsRow = customCssSection.createDiv({
			cls: 'b2h-css-controls-row',
		});

		// Hidden file input for disk CSS selection
		const diskFileInput = cssControlsRow.createEl('input', {
			type: 'file',
			cls: 'b2h-hidden-input',
		});
		diskFileInput.accept = '.css';
		diskFileInput.addEventListener('change', () => {
			const file = diskFileInput.files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = () => {
				const content = typeof reader.result === 'string' ? reader.result : '';
				this.customCss = content;
				this.cssSource = `Disk: ${file.name}`;
				cssTextarea.value = this.customCss;
				updateSourceBadge();
				new Notice(`Loaded ${file.name}`);
			};
			reader.onerror = () => {
				new Notice('Failed to read CSS file from disk.');
			};
			reader.readAsText(file);
			// Reset input value so the same file can be re-selected if needed
			diskFileInput.value = '';
		});

		const fromVaultBtn = cssControlsRow.createEl('button', {
			text: 'Select from vault',
		});
		fromVaultBtn.addEventListener('click', () => {
			const cssFiles = this.app.vault
				.getFiles()
				.filter((f) => f.extension === 'css');
			if (cssFiles.length === 0) {
				new Notice('No CSS files found in vault.');
				return;
			}

			new VaultCssPickerModal(this.app, (file: TFile) => {
				void (async () => {
					try {
						const content = await this.app.vault.read(file);
						this.customCss = content;
						this.cssSource = `Vault: ${file.path}`;
						cssTextarea.value = this.customCss;
						updateSourceBadge();
						new Notice(`Loaded ${file.name}`);
					} catch {
						new Notice('Failed to read CSS file from vault.');
					}
				})();
			}).open();
		});

		const fromDiskBtn = cssControlsRow.createEl('button', {
			text: 'Select from disk',
		});
		fromDiskBtn.addEventListener('click', () => {
			diskFileInput.click();
		});

		const clearBtn = cssControlsRow.createEl('button', {
			text: 'Clear',
		});
		clearBtn.addEventListener('click', () => {
			this.customCss = '';
			this.cssSource = 'None';
			cssTextarea.value = '';
			updateSourceBadge();
		});

		const cssTextarea = customCssSection.createEl('textarea', {
			cls: 'b2h-custom-css-textarea',
		});
		cssTextarea.placeholder = '/* enter or paste custom CSS rules */';
		cssTextarea.value = this.customCss;
		cssTextarea.addEventListener('input', () => {
			this.customCss = cssTextarea.value;
			this.cssSource = this.customCss.trim() ? 'Direct input' : 'None';
			updateSourceBadge();
		});

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

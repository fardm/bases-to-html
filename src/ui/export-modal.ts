import { App, FuzzySuggestModal, Modal, Notice, Setting, TFile, setIcon } from 'obsidian';
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
	private openExportedFiles: boolean;
	private documentClickHandler?: (e: MouseEvent) => void;

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

		// Pre-select the active file if it is a .base file
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile.extension === 'base') {
			this.selectedFiles.add(activeFile.path);
		}

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

		const pickerContainer = baseFilesSection.createDiv({
			cls: 'b2h-base-picker-container',
		});

		const inputWrapper = pickerContainer.createDiv({
			cls: 'b2h-base-input-wrapper',
		});

		const searchInput = inputWrapper.createEl('input', {
			type: 'text',
			placeholder: 'Click or type to search and add base files...',
			cls: 'b2h-base-search-input',
		});

		const dropdownMenu = inputWrapper.createDiv({
			cls: 'b2h-base-dropdown',
		});
		dropdownMenu.hide();

		const selectedListContainer = pickerContainer.createDiv({
			cls: 'b2h-selected-bases-list',
		});

		const renderSelectedList = () => {
			selectedListContainer.empty();
			if (this.selectedFiles.size === 0) {
				selectedListContainer.createDiv({
					text: 'No base files selected. Search above to add base files to export.',
					cls: 'b2h-selected-empty',
				});
				return;
			}

			this.selectedFiles.forEach((filePath) => {
				const row = selectedListContainer.createDiv({
					cls: 'b2h-selected-base-row',
				});

				const info = row.createDiv({ cls: 'b2h-selected-base-info' });
				const iconSpan = info.createSpan({ cls: 'b2h-base-row-icon' });
				setIcon(iconSpan, 'database');
				info.createSpan({ text: filePath, cls: 'b2h-base-row-title' });

				const deleteBtn = row.createEl('button', {
					cls: 'clickable-icon b2h-btn-remove',
					attr: { 'aria-label': 'Remove base file', type: 'button' },
				});
				setIcon(deleteBtn, 'trash-2');

				deleteBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.selectedFiles.delete(filePath);
					renderSelectedList();
					if (dropdownMenu.isShown()) {
						renderDropdown();
					}
				});
			});
		};

		const renderDropdown = () => {
			dropdownMenu.empty();
			const query = searchInput.value.trim().toLowerCase();
			const available = this.baseFiles.filter(
				(f) => !this.selectedFiles.has(f.path) && f.path.toLowerCase().includes(query),
			);

			if (available.length === 0) {
				const emptyMsg = this.baseFiles.every((f) => this.selectedFiles.has(f.path))
					? 'All base files have been added'
					: 'No matching base files found';
				dropdownMenu.createDiv({
					text: emptyMsg,
					cls: 'b2h-base-dropdown-empty',
				});
				return;
			}

			available.forEach((file) => {
				const item = dropdownMenu.createDiv({ cls: 'b2h-base-dropdown-item' });
				const iconSpan = item.createSpan({ cls: 'b2h-dropdown-item-icon' });
				setIcon(iconSpan, 'database');
				item.createSpan({ text: file.path, cls: 'b2h-dropdown-item-text' });

				item.addEventListener('mousedown', (e) => {
					e.preventDefault();
					this.selectedFiles.add(file.path);
					searchInput.value = '';
					renderSelectedList();
					renderDropdown();
				});
			});
		};

		const showDropdown = () => {
			renderDropdown();
			dropdownMenu.show();
		};

		searchInput.addEventListener('focus', () => showDropdown());
		searchInput.addEventListener('click', () => showDropdown());
		searchInput.addEventListener('input', () => showDropdown());

		this.documentClickHandler = (e: MouseEvent) => {
			if (!inputWrapper.contains(e.target as Node)) {
				dropdownMenu.hide();
			}
		};
		document.addEventListener('click', this.documentClickHandler);

		renderSelectedList();

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

		// 3.7 Open exported files
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
			outputLocation: this.plugin.settings.defaultOutputFolder || '',
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
		if (this.documentClickHandler) {
			document.removeEventListener('click', this.documentClickHandler);
			this.documentClickHandler = undefined;
		}
		const { contentEl } = this;
		contentEl.empty();
	}
}

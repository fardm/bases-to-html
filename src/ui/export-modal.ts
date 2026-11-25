import { App, FuzzySuggestModal, Modal, Notice, Setting, TFile, TFolder, setIcon } from 'obsidian';
import { Exporter } from '../generator/exporter';
import type BasesToHtmlPlugin from '../main';
import { ExportFormat, ExportOptions, ExportScope, ExportedDataScope, OutputStorageMode } from '../types';
import { renderExportedDataRadioGroup } from './exported-data-radio';
import { renderNoteContentRadioGroup } from './note-content-radio';

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

interface SelectedCssFile {
	id: string;
	name: string;
	content: string;
	source: 'vault' | 'disk';
}

export class ExportModal extends Modal {
	private plugin: BasesToHtmlPlugin;
	private baseFiles: TFile[] = [];
	private selectedFiles: Set<string> = new Set();
	private documentTitle: string;
	private exportFormat: ExportFormat;
	private exportScope: ExportScope;
	private exportedData: ExportedDataScope;
	private font: string;
	private selectedCssFiles: SelectedCssFile[] = [];
	private customCssText: string;
	private cssSource: string;
	private outputMode: OutputStorageMode;
	private vaultOutputFolder: string;
	private localOutputFolder: string;
	private openExportedFiles: boolean;
	private documentClickHandler?: (e: MouseEvent) => void;

	constructor(app: App, plugin: BasesToHtmlPlugin) {
		super(app);
		this.plugin = plugin;

		this.documentTitle = 'My archive';
		this.exportFormat = 'single';
		this.exportScope = 'full';
		this.exportedData = 'all';
		this.font = 'vazirmatn';
		this.selectedCssFiles = [];
		this.customCssText = '';
		this.cssSource = 'None';
		this.outputMode = plugin.settings.outputMode || 'vault';
		this.vaultOutputFolder = plugin.settings.vaultOutputFolder || '';
		this.localOutputFolder = plugin.settings.localOutputFolder || '';
		this.openExportedFiles = true;
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
		activeDocument.addEventListener('click', this.documentClickHandler);

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

		// 3.4 Exported Data Section (Radio Group)
		renderExportedDataRadioGroup(
			contentEl,
			this.exportedData,
			(val) => {
				this.exportedData = val;
			},
			'exportModalExportedData',
		);

		// 3.5 Note Content Section (Radio Group)
		renderNoteContentRadioGroup(
			contentEl,
			this.exportScope,
			(val) => {
				this.exportScope = val;
			},
			'exportModalNoteContent',
		);

		// 3.6 Font selection
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
			const count = this.selectedCssFiles.length;
			const hasText = Boolean(this.customCssText.trim());
			if (count > 0 && hasText) {
				this.cssSource = `${count} file${count > 1 ? 's' : ''} + Direct input`;
			} else if (count > 0) {
				this.cssSource = `${count} file${count > 1 ? 's' : ''}`;
			} else if (hasText) {
				this.cssSource = 'Direct input';
			} else {
				this.cssSource = 'None';
			}
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
		diskFileInput.multiple = true;
		diskFileInput.addEventListener('change', () => {
			const files = diskFileInput.files;
			if (!files || files.length === 0) return;

			let loadedCount = 0;
			const totalFiles = files.length;
			for (let i = 0; i < totalFiles; i++) {
				const file = files[i];
				if (!file) continue;

				const reader = new FileReader();
				reader.onload = () => {
					const content = typeof reader.result === 'string' ? reader.result : '';
					this.selectedCssFiles.push({
						id: `disk:${file.name}-${Date.now()}-${Math.random()}`,
						name: file.name,
						content,
						source: 'disk',
					});
					loadedCount++;
					if (loadedCount === totalFiles) {
						renderCssFilesList();
						updateSourceBadge();
						new Notice(totalFiles === 1 ? `Loaded ${file.name}` : `Loaded ${totalFiles} CSS files from disk`);
					}
				};
				reader.onerror = () => {
					new Notice(`Failed to read ${file.name} from disk.`);
				};
				reader.readAsText(file);
			}
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
						const fileId = `vault:${file.path}`;
						const exists = this.selectedCssFiles.some((f) => f.id === fileId);
						if (exists) {
							new Notice(`${file.name} is already selected.`);
							return;
						}
						this.selectedCssFiles.push({
							id: fileId,
							name: file.name,
							content,
							source: 'vault',
						});
						renderCssFilesList();
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
			this.selectedCssFiles = [];
			this.customCssText = '';
			cssTextarea.value = '';
			renderCssFilesList();
			updateSourceBadge();
		});

		const cssFilesListContainer = customCssSection.createDiv({
			cls: 'b2h-selected-css-list',
		});

		const renderCssFilesList = () => {
			cssFilesListContainer.empty();
			this.selectedCssFiles.forEach((cssFile, index) => {
				const row = cssFilesListContainer.createDiv({
					cls: 'b2h-selected-css-row',
				});

				const info = row.createDiv({ cls: 'b2h-selected-css-info' });
				const iconSpan = info.createSpan({ cls: 'b2h-css-row-icon' });
				setIcon(iconSpan, 'file-code');
				info.createSpan({ text: cssFile.name, cls: 'b2h-css-row-name' });

				const deleteBtn = row.createEl('button', {
					cls: 'clickable-icon b2h-btn-remove',
					attr: { 'aria-label': `Remove ${cssFile.name}`, type: 'button' },
				});
				setIcon(deleteBtn, 'trash-2');

				deleteBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.selectedCssFiles.splice(index, 1);
					renderCssFilesList();
					updateSourceBadge();
				});
			});
		};
		renderCssFilesList();

		const cssTextarea = customCssSection.createEl('textarea', {
			cls: 'b2h-custom-css-textarea',
		});
		cssTextarea.placeholder = '/* enter or paste custom CSS rules */';
		cssTextarea.value = this.customCssText;
		cssTextarea.addEventListener('input', () => {
			this.customCssText = cssTextarea.value;
			updateSourceBadge();
		});

		// 3.7 Output location (Vault vs Local storage)
		const outputSection = contentEl.createDiv({
			cls: 'b2h-output-location-section',
		});

		const outputHeader = outputSection.createDiv({ cls: 'b2h-output-header' });
		outputHeader.createDiv({ text: 'Output location', cls: 'setting-item-name' });
		outputHeader.createDiv({
			text: 'Choose where to save the exported HTML files.',
			cls: 'setting-item-description',
		});

		const modeToggleRow = outputSection.createDiv({ cls: 'b2h-output-mode-toggle' });
		const vaultModeBtn = modeToggleRow.createEl('button', {
			text: 'Vault',
			cls: 'b2h-mode-btn',
			attr: { type: 'button' },
		});
		const localModeBtn = modeToggleRow.createEl('button', {
			text: 'Local storage',
			cls: 'b2h-mode-btn',
			attr: { type: 'button' },
		});

		const vaultPanel = outputSection.createDiv({ cls: 'b2h-output-panel' });
		const localPanel = outputSection.createDiv({ cls: 'b2h-output-panel' });

		// Vault searchable folder picker
		const vaultFolderWrapper = vaultPanel.createDiv({ cls: 'b2h-base-input-wrapper' });
		const vaultFolderInput = vaultFolderWrapper.createEl('input', {
			type: 'text',
			placeholder: 'Search or select vault folder (leave blank for root)...',
			cls: 'b2h-base-search-input',
		});
		vaultFolderInput.value = this.vaultOutputFolder;

		const vaultFolderDropdown = vaultFolderWrapper.createDiv({ cls: 'b2h-base-dropdown' });
		vaultFolderDropdown.hide();

		const allVaultFolders = this.app.vault
			.getAllLoadedFiles()
			.filter((f): f is TFolder => f instanceof TFolder && !f.isRoot())
			.map((f) => f.path)
			.sort((a, b) => a.localeCompare(b));

		const renderVaultFolderDropdown = () => {
			vaultFolderDropdown.empty();
			const q = vaultFolderInput.value.trim().toLowerCase();

			if (!q || 'vault root'.includes(q) || q === '/') {
				const rootItem = vaultFolderDropdown.createDiv({ cls: 'b2h-base-dropdown-item' });
				const rootIcon = rootItem.createSpan({ cls: 'b2h-dropdown-item-icon' });
				setIcon(rootIcon, 'folder');
				rootItem.createSpan({ text: '/ (Vault root)', cls: 'b2h-dropdown-item-text' });
				rootItem.addEventListener('mousedown', (e) => {
					e.preventDefault();
					this.vaultOutputFolder = '';
					vaultFolderInput.value = '';
					vaultFolderDropdown.hide();
				});
			}

			const matches = allVaultFolders.filter((p) => p.toLowerCase().includes(q));
			if (matches.length === 0 && q && !'vault root'.includes(q)) {
				vaultFolderDropdown.createDiv({
					text: `Use custom path "${vaultFolderInput.value.trim()}" (will be created if missing)`,
					cls: 'b2h-base-dropdown-empty',
				});
				return;
			}

			matches.forEach((folderPath) => {
				const item = vaultFolderDropdown.createDiv({ cls: 'b2h-base-dropdown-item' });
				const iconSpan = item.createSpan({ cls: 'b2h-dropdown-item-icon' });
				setIcon(iconSpan, 'folder');
				item.createSpan({ text: folderPath, cls: 'b2h-dropdown-item-text' });
				item.addEventListener('mousedown', (e) => {
					e.preventDefault();
					this.vaultOutputFolder = folderPath;
					vaultFolderInput.value = folderPath;
					vaultFolderDropdown.hide();
				});
			});
		};

		vaultFolderInput.addEventListener('focus', () => {
			renderVaultFolderDropdown();
			vaultFolderDropdown.show();
		});
		vaultFolderInput.addEventListener('click', () => {
			renderVaultFolderDropdown();
			vaultFolderDropdown.show();
		});
		vaultFolderInput.addEventListener('input', () => {
			this.vaultOutputFolder = vaultFolderInput.value.trim();
			renderVaultFolderDropdown();
			vaultFolderDropdown.show();
		});

		const prevClickHandler = this.documentClickHandler;
		this.documentClickHandler = (e: MouseEvent) => {
			prevClickHandler?.(e);
			if (!vaultFolderWrapper.contains(e.target as Node)) {
				vaultFolderDropdown.hide();
			}
		};
		if (prevClickHandler) {
			activeDocument.removeEventListener('click', prevClickHandler);
		}
		activeDocument.addEventListener('click', this.documentClickHandler);

		// Local storage folder picker (OS directory dialog)
		const localInputRow = localPanel.createDiv({ cls: 'b2h-local-path-row' });
		const localPathInput = localInputRow.createEl('input', {
			type: 'text',
			placeholder: 'Select a folder on your device...',
			cls: 'b2h-base-search-input',
		});
		localPathInput.value = this.localOutputFolder;
		localPathInput.addEventListener('input', () => {
			this.localOutputFolder = localPathInput.value.trim();
		});

		const browseLocalBtn = localInputRow.createEl('button', {
			text: 'Browse',
			attr: { type: 'button' },
		});
		browseLocalBtn.addEventListener('click', () => {
			void this.pickLocalDirectory(localPathInput);
		});

		const updateOutputModeUI = () => {
			const isVault = this.outputMode === 'vault';
			vaultModeBtn.toggleClass('is-active', isVault);
			localModeBtn.toggleClass('is-active', !isVault);
			vaultPanel.toggle(isVault);
			localPanel.toggle(!isVault);
		};

		vaultModeBtn.addEventListener('click', () => {
			this.outputMode = 'vault';
			updateOutputModeUI();
		});
		localModeBtn.addEventListener('click', () => {
			this.outputMode = 'local';
			updateOutputModeUI();
		});
		updateOutputModeUI();

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

	private async pickLocalDirectory(localPathInput: HTMLInputElement): Promise<void> {
		try {
			const electron = (
				window as unknown as {
					require?: (mod: string) => {
						remote?: {
							dialog?: {
								showOpenDialog: (opts: {
									title?: string;
									defaultPath?: string;
									properties: string[];
								}) => Promise<{ canceled: boolean; filePaths: string[] }>;
							};
						};
						dialog?: {
							showOpenDialog: (opts: {
								title?: string;
								defaultPath?: string;
								properties: string[];
							}) => Promise<{ canceled: boolean; filePaths: string[] }>;
						};
					};
				}
			).require?.('electron');

			const dialog = electron?.remote?.dialog ?? electron?.dialog;
			if (dialog?.showOpenDialog) {
				const result = await dialog.showOpenDialog({
					title: 'Select output folder',
					defaultPath: this.localOutputFolder || undefined,
					properties: ['openDirectory', 'createDirectory'],
				});
				if (!result.canceled && result.filePaths[0]) {
					this.localOutputFolder = result.filePaths[0];
					localPathInput.value = result.filePaths[0];
				}
				return;
			}
		} catch (err) {
			console.error('Failed to open local folder dialog:', err);
		}

		new Notice(
			'Native folder picker is only available on Obsidian Desktop. Please enter a path manually or switch to Vault storage.',
		);
	}

	private async triggerExport(exportBtn: HTMLButtonElement): Promise<void> {
		if (this.selectedFiles.size === 0) {
			new Notice('Please select at least one base file.');
			return;
		}

		if (this.outputMode === 'local' && !this.localOutputFolder.trim()) {
			new Notice('Please select or enter a local output folder.');
			return;
		}

		exportBtn.disabled = true;
		exportBtn.setText('Exporting...');

		this.plugin.settings.outputMode = this.outputMode;
		this.plugin.settings.vaultOutputFolder = this.vaultOutputFolder;
		this.plugin.settings.localOutputFolder = this.localOutputFolder;
		await this.plugin.saveSettings();

		const combinedCss = [
			...this.selectedCssFiles.map((f) => f.content),
			this.customCssText,
		]
			.filter((c) => c && c.trim())
			.join('\n\n');

		const options: ExportOptions = {
			documentTitle: this.documentTitle || 'My archive',
			baseFilePaths: Array.from(this.selectedFiles),
			exportFormat: this.exportFormat,
			exportScope: this.exportScope,
			exportedData: this.exportedData,
			font: this.font,
			customCss: combinedCss,
			outputLocation:
				this.outputMode === 'local'
					? this.localOutputFolder.trim()
					: this.vaultOutputFolder.trim(),
			outputMode: this.outputMode,
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
			activeDocument.removeEventListener('click', this.documentClickHandler);
			this.documentClickHandler = undefined;
		}
		const { contentEl } = this;
		contentEl.empty();
	}
}

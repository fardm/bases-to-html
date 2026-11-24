import {
	App,
	Component,
	Notice,
	TFile,
	normalizePath,
} from 'obsidian';
import { parseBaseFile } from '../parser/base-parser';
import { ScannedVaultData, VaultScanner } from '../parser/vault-scanner';
import { ExportOptions, NoteItem } from '../types';
import { HtmlBuilder, sanitizeSlug } from './html-builder';

export class Exporter {
	private app: App;
	private component: Component;

	constructor(app: App, component: Component) {
		this.app = app;
		this.component = component;
	}

	async exportBases(options: ExportOptions): Promise<string | null> {
		if (!options.baseFilePaths || options.baseFilePaths.length === 0) {
			new Notice('Please select at least one base file to export.');
			return null;
		}

		new Notice('Exporting bases to HTML...');

		const scanner = new VaultScanner(this.app, this.component);
		const htmlBuilder = new HtmlBuilder(options);

		// Determine target directory path
		const safeDocTitle = sanitizeFolderName(options.documentTitle || 'Bases Export');
		const baseDir = options.outputLocation
			? normalizePath(options.outputLocation)
			: '';
		const targetDir = normalizePath(
			baseDir ? `${baseDir}/${safeDocTitle}` : safeDocTitle,
		);

		// Ensure target directory exists
		await this.ensureDirectory(targetDir);

		const scannedBases: ScannedVaultData[] = [];

		for (const path of options.baseFilePaths) {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) continue;

			const rawContent = await this.app.vault.read(file);
			const baseConfig = parseBaseFile(rawContent, file.path);
			const scanned = await scanner.scanForBase(
				baseConfig,
				options.exportScope,
				options.exportFormat,
				options.exportedData,
			);
			scannedBases.push(scanned);
		}

		if (scannedBases.length === 0) {
			new Notice('No valid bases were loaded for export.');
			return null;
		}

		let mainEntryPath = '';

		if (options.exportFormat === 'single') {
			if (scannedBases.length === 1) {
				const singleBase = scannedBases[0];
				if (!singleBase) return null;
				const { baseConfig, items } = singleBase;
				const htmlContent = htmlBuilder.buildSinglePage(baseConfig, items);
				const outputPath = normalizePath(`${targetDir}/index.html`);
				await this.writeFileSafe(outputPath, htmlContent);
				mainEntryPath = outputPath;
			} else {
				// Multiple bases in single page format: generate an index and individual standalone single pages
				const multiFileData: Array<{ config: typeof scannedBases[0]['baseConfig']; items: NoteItem[] }> = [];
				for (const scanned of scannedBases) {
					const { baseConfig, items } = scanned;
					const htmlContent = htmlBuilder.buildSinglePage(baseConfig, items);
					const slug = sanitizeSlug(baseConfig.fileName);
					const outputPath = normalizePath(`${targetDir}/${slug}.html`);
					await this.writeFileSafe(outputPath, htmlContent);
					multiFileData.push({ config: baseConfig, items });
				}

				// Build directory index linking to the single page files (with self-contained inlined styles)
				const indexHtml = htmlBuilder.buildDirectoryIndex(multiFileData, true);
				const indexPath = normalizePath(`${targetDir}/index.html`);
				await this.writeFileSafe(indexPath, indexHtml);
				mainEntryPath = indexPath;
			}
		} else {
			// Multi-file format
			const multiFileData = scannedBases.map((s) => ({
				config: s.baseConfig,
				items: s.items,
			}));

			const generatedFiles = htmlBuilder.buildMultiFile(multiFileData);

			for (const genFile of generatedFiles) {
				const fullPath = normalizePath(`${targetDir}/${genFile.relativePath}`);
				const dir = getParentDir(fullPath);
				if (dir) await this.ensureDirectory(dir);
				await this.writeFileSafe(fullPath, genFile.content);
				if (genFile.relativePath === 'index.html') {
					mainEntryPath = fullPath;
				}
			}

			// Copy referenced image assets
			for (const scanned of scannedBases) {
				for (const [relPath, imgTFile] of scanned.imageFilesToCopy.entries()) {
					const targetImagePath = normalizePath(`${targetDir}/${relPath}`);
					const imgDir = getParentDir(targetImagePath);
					if (imgDir) await this.ensureDirectory(imgDir);

					try {
						const buffer = await this.app.vault.readBinary(imgTFile);
						await this.writeBinarySafe(targetImagePath, buffer);
					} catch (err) {
						console.error(`Failed to copy image ${imgTFile.path}:`, err);
					}
				}
			}
		}

		new Notice(`Bases exported successfully to:\n${targetDir}`);

		if (options.openExportedFiles && mainEntryPath) {
			await this.openFile(mainEntryPath);
		}

		return mainEntryPath;
	}

	private async ensureDirectory(path: string): Promise<void> {
		const normalized = normalizePath(path);
		if (!normalized || normalized === '/' || normalized === '.') return;
		const parts = normalized.split('/');
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const exists = await this.app.vault.adapter.exists(current);
			if (!exists) {
				await this.app.vault.adapter.mkdir(current);
			}
		}
	}

	private async writeFileSafe(path: string, content: string): Promise<void> {
		const normalized = normalizePath(path);
		await this.app.vault.adapter.write(normalized, content);
	}

	private async writeBinarySafe(path: string, buffer: ArrayBuffer): Promise<void> {
		const normalized = normalizePath(path);
		await this.app.vault.adapter.writeBinary(normalized, buffer);
	}

	private async openFile(filePath: string): Promise<void> {
		try {
			// On desktop, try launching with system default application (browser)
			const electron = (window as unknown as { require?: (mod: string) => { shell?: { openPath: (p: string) => Promise<string> } } }).require?.('electron');
			if (electron?.shell && 'getBasePath' in this.app.vault.adapter) {
				const adapterWithBase = this.app.vault.adapter as { getBasePath: () => string };
				const fullDiskPath = normalizePath(`${adapterWithBase.getBasePath()}/${filePath}`);
				await electron.shell.openPath(fullDiskPath);
				return;
			}
		} catch {
			// Fallback to internal Obsidian leaf
		}

		const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
		if (abstractFile instanceof TFile) {
			await this.app.workspace.getLeaf(true).openFile(abstractFile);
		}
	}
}

function sanitizeFolderName(name: string): string {
	return (
		name
			.replace(/[\\/:*?"<>|]+/g, '_')
			.trim() || 'Export'
	);
}

function getParentDir(path: string): string {
	const lastSlash = path.lastIndexOf('/');
	if (lastSlash === -1) return '';
	return path.slice(0, lastSlash);
}

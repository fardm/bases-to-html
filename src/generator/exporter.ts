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
import { buildCustomFontCss } from './font-utils';
import { HtmlBuilder, sanitizeSlug } from './html-builder';

interface NodeFsModule {
	promises: {
		mkdir: (path: string, options: { recursive: boolean }) => Promise<void>;
		writeFile: (path: string, data: string | Uint8Array, encoding?: string) => Promise<void>;
		readFile?: (path: string) => Promise<Uint8Array>;
	};
}

interface NodePathModule {
	join: (...paths: string[]) => string;
	dirname: (path: string) => string;
}

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

		const isLocalMode = options.outputMode === 'local';
		if (isLocalMode && !options.outputLocation?.trim()) {
			new Notice('Please select a local output folder.');
			return null;
		}

		const nodeMods = isLocalMode ? this.getNodeFileModules() : null;
		if (isLocalMode && !nodeMods) {
			new Notice('Local storage export outside the vault is only supported on Obsidian Desktop.');
			return null;
		}

		new Notice('Exporting bases to HTML...');

		const scanner = new VaultScanner(this.app, this.component);

		// Resolve font (Default / Google Fonts / Local Font)
		const fontMode = options.fontMode || 'default';
		let localFontBuffer: ArrayBuffer | undefined;
		if (fontMode === 'local' && options.localFont) {
			if (options.localFont.data) {
				localFontBuffer = options.localFont.data;
			} else if (options.localFont.filePath) {
				const fsMods = this.getNodeFileModules();
				if (fsMods?.fs.promises.readFile) {
					const bytes = await fsMods.fs.promises.readFile(options.localFont.filePath);
					localFontBuffer = bytes.buffer.slice(
						bytes.byteOffset,
						bytes.byteOffset + bytes.byteLength,
					) as ArrayBuffer;
				}
			}
			if (!localFontBuffer) {
				new Notice('Could not read the selected local font file.');
				return null;
			}
		}

		const fontCssResult = buildCustomFontCss({
			fontMode,
			googleFontName: options.font,
			localFont: options.localFont,
			exportFormat: options.exportFormat,
			localFontBuffer,
		});

		const resolvedOptions: ExportOptions = {
			...options,
			resolvedFontCss: fontCssResult.css,
		};
		const htmlBuilder = new HtmlBuilder(resolvedOptions);

		// Determine target directory path (save directly into selected output location)
		const targetDir = isLocalMode && nodeMods
			? options.outputLocation.trim()
			: normalizePath(options.outputLocation?.trim() || '');

		const joinOutputPath = (dir: string, rel: string): string =>
			isLocalMode && nodeMods
				? nodeMods.path.join(dir, rel)
				: dir
					? normalizePath(`${dir}/${rel}`)
					: normalizePath(rel);

		const getOutputParent = (fullPath: string): string =>
			isLocalMode && nodeMods ? nodeMods.path.dirname(fullPath) : getParentDir(fullPath);

		// Ensure target directory exists
		await this.ensureDirectory(targetDir, nodeMods);

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
				const outputPath = joinOutputPath(targetDir, 'index.html');
				await this.writeFileSafe(outputPath, htmlContent, nodeMods);
				mainEntryPath = outputPath;
			} else {
				// Multiple bases in single page format: generate an index and individual standalone single pages
				const multiFileData: Array<{ config: typeof scannedBases[0]['baseConfig']; items: NoteItem[] }> = [];
				for (const scanned of scannedBases) {
					const { baseConfig, items } = scanned;
					const htmlContent = htmlBuilder.buildSinglePage(baseConfig, items);
					const slug = sanitizeSlug(baseConfig.fileName);
					const outputPath = joinOutputPath(targetDir, `${slug}.html`);
					await this.writeFileSafe(outputPath, htmlContent, nodeMods);
					multiFileData.push({ config: baseConfig, items });
				}

				// Build directory index linking to the single page files (with self-contained inlined styles)
				const indexHtml = htmlBuilder.buildDirectoryIndex(multiFileData, true);
				const indexPath = joinOutputPath(targetDir, 'index.html');
				await this.writeFileSafe(indexPath, indexHtml, nodeMods);
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
				const fullPath = joinOutputPath(targetDir, genFile.relativePath);
				const dir = getOutputParent(fullPath);
				if (dir) await this.ensureDirectory(dir, nodeMods);
				await this.writeFileSafe(fullPath, genFile.content, nodeMods);
				if (genFile.relativePath === 'index.html') {
					mainEntryPath = fullPath;
				}
			}

			// Copy referenced image assets
			for (const scanned of scannedBases) {
				for (const [relPath, imgTFile] of scanned.imageFilesToCopy.entries()) {
					const targetImagePath = joinOutputPath(targetDir, relPath);
					const imgDir = getOutputParent(targetImagePath);
					if (imgDir) await this.ensureDirectory(imgDir, nodeMods);

					try {
						const buffer = await this.app.vault.readBinary(imgTFile);
						await this.writeBinarySafe(targetImagePath, buffer, nodeMods);
					} catch (err) {
						console.error(`Failed to copy image ${imgTFile.path}:`, err);
					}
				}
			}

			// Copy local font file once into assets/fonts/ (no duplicates)
			if (fontMode === 'local' && fontCssResult.fontAssetRelativePath && localFontBuffer) {
				const targetFontPath = joinOutputPath(targetDir, fontCssResult.fontAssetRelativePath);
				const fontDir = getOutputParent(targetFontPath);
				if (fontDir) await this.ensureDirectory(fontDir, nodeMods);
				await this.writeBinarySafe(targetFontPath, localFontBuffer, nodeMods);
			}
		}

		new Notice(`Bases exported successfully to:\n${targetDir || 'Vault root'}`);

		if (options.openExportedFiles && mainEntryPath) {
			await this.openFile(mainEntryPath, isLocalMode);
		}

		return mainEntryPath;
	}

	private getNodeFileModules(): { fs: NodeFsModule; path: NodePathModule } | null {
		try {
			const req = (window as unknown as { require?: (mod: string) => unknown }).require;
			if (!req) return null;
			const fs = req('fs') as NodeFsModule;
			const path = req('path') as NodePathModule;
			if (
				typeof fs?.promises?.mkdir === 'function' &&
				typeof fs?.promises?.writeFile === 'function' &&
				typeof path?.join === 'function' &&
				typeof path?.dirname === 'function'
			) {
				return { fs, path };
			}
		} catch {
			// Unavailable on mobile / non-Node environments
		}
		return null;
	}

	private async ensureDirectory(
		path: string,
		nodeMods: { fs: NodeFsModule; path: NodePathModule } | null,
	): Promise<void> {
		if (nodeMods) {
			await nodeMods.fs.promises.mkdir(path, { recursive: true });
			return;
		}
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

	private async writeFileSafe(
		path: string,
		content: string,
		nodeMods: { fs: NodeFsModule; path: NodePathModule } | null,
	): Promise<void> {
		if (nodeMods) {
			await nodeMods.fs.promises.writeFile(path, content, 'utf8');
			return;
		}
		const normalized = normalizePath(path);
		await this.app.vault.adapter.write(normalized, content);
	}

	private async writeBinarySafe(
		path: string,
		buffer: ArrayBuffer,
		nodeMods: { fs: NodeFsModule; path: NodePathModule } | null,
	): Promise<void> {
		if (nodeMods) {
			await nodeMods.fs.promises.writeFile(path, new Uint8Array(buffer));
			return;
		}
		const normalized = normalizePath(path);
		await this.app.vault.adapter.writeBinary(normalized, buffer);
	}

	private async openFile(filePath: string, isLocalMode: boolean): Promise<void> {
		try {
			// On desktop, try launching with system default application (browser)
			const electron = (window as unknown as { require?: (mod: string) => { shell?: { openPath: (p: string) => Promise<string> } } }).require?.('electron');
			if (electron?.shell) {
				if (isLocalMode) {
					await electron.shell.openPath(filePath);
					return;
				}
				if ('getBasePath' in this.app.vault.adapter) {
					const adapterWithBase = this.app.vault.adapter as { getBasePath: () => string };
					const fullDiskPath = normalizePath(`${adapterWithBase.getBasePath()}/${filePath}`);
					await electron.shell.openPath(fullDiskPath);
					return;
				}
			}
		} catch {
			// Fallback to internal Obsidian leaf
		}

		if (!isLocalMode) {
			const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
			if (abstractFile instanceof TFile) {
				await this.app.workspace.getLeaf(true).openFile(abstractFile);
			}
		}
	}
}

function getParentDir(path: string): string {
	const lastSlash = path.lastIndexOf('/');
	if (lastSlash === -1) return '';
	return path.slice(0, lastSlash);
}

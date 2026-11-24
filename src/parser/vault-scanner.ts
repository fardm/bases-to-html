import {
	App,
	Component,
	getAllTags,
	MarkdownRenderer,
	TFile,
	arrayBufferToBase64,
} from 'obsidian';
import {
	BaseFileConfig,
	ExportFormat,
	ExportScope,
	NoteItem,
} from '../types';
import {
	evaluateFilter,
	evaluateFormula,
	EvaluationContext,
	toSafeString,
} from './expression-evaluator';

export interface ScannedVaultData {
	baseConfig: BaseFileConfig;
	items: NoteItem[];
	imageFilesToCopy: Map<string, TFile>;
}

export class VaultScanner {
	private app: App;
	private component: Component;

	constructor(app: App, component: Component) {
		this.app = app;
		this.component = component;
	}

	async scanForBase(
		baseConfig: BaseFileConfig,
		scope: ExportScope,
		format: ExportFormat,
	): Promise<ScannedVaultData> {
		const configDir = this.app.vault.configDir;
		const markdownFiles = this.app.vault.getMarkdownFiles().filter(
			(f) => !f.path.startsWith(configDir + '/'),
		);

		const items: NoteItem[] = [];
		const imageFilesToCopy = new Map<string, TFile>();

		for (const file of markdownFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter ? { ...cache.frontmatter } : {};
			delete frontmatter.position;

			const rawTags = (cache ? getAllTags(cache) || [] : []).map((t) =>
				t.replace(/^#/, ''),
			);
			if (frontmatter.tags) {
				if (Array.isArray(frontmatter.tags)) {
					for (const t of frontmatter.tags) {
						const clean = toSafeString(t).replace(/^#/, '');
						if (!rawTags.includes(clean)) rawTags.push(clean);
					}
				} else if (typeof frontmatter.tags === 'string') {
					for (const t of frontmatter.tags.split(/[\s,]+/)) {
						const clean = t.replace(/^#/, '');
						if (clean && !rawTags.includes(clean)) rawTags.push(clean);
					}
				}
			}

			const context: EvaluationContext = {
				file: {
					name: file.basename,
					path: file.path,
					folder: file.parent ? file.parent.path : '',
					tags: rawTags,
				},
				properties: frontmatter,
				formulas: baseConfig.formulas,
				computedFormulas: {},
			};

			// Check if this note matches at least one view in the base
			let matchesAnyView = false;
			for (const view of baseConfig.views) {
				if (!view.filters) {
					matchesAnyView = true;
					break;
				}
				if (evaluateFilter(view.filters, context)) {
					matchesAnyView = true;
					break;
				}
			}

			if (!matchesAnyView) continue;

			// Compute all formulas for this note
			const computedFormulas: Record<string, unknown> = {};
			if (baseConfig.formulas) {
				for (const [key, formulaCode] of Object.entries(baseConfig.formulas)) {
					computedFormulas[key] = evaluateFormula(formulaCode, context);
				}
			}

			// Resolve cover image
			const coverInfo = await this.resolveCoverImage(
				frontmatter,
				file.path,
				format,
				imageFilesToCopy,
			);

			// Render HTML if Include Notes is enabled
			let htmlContent: string | undefined;
			let rawMarkdown: string | undefined;
			if (scope === 'all') {
				try {
					rawMarkdown = await this.app.vault.read(file);
					const bodyMarkdown = stripFrontmatter(rawMarkdown);
					const container = createDiv();
					await MarkdownRenderer.render(
						this.app,
						bodyMarkdown,
						container,
						file.path,
						this.component,
					);
					htmlContent = container.innerHTML;
				} catch (e) {
					console.error(`Failed to render markdown for ${file.path}:`, e);
					htmlContent = `<p>${escapeHtml(rawMarkdown || '')}</p>`;
				}
			}

			const item: NoteItem = {
				id: file.path,
				title: file.basename,
				path: file.path,
				folder: file.parent ? file.parent.path : '',
				tags: rawTags,
				properties: frontmatter,
				computedFormulas,
				coverImage: coverInfo.url,
				coverImageBase64: coverInfo.base64,
				coverAssetRelativePath: coverInfo.relativePath,
				htmlContent,
				rawMarkdown,
			};

			items.push(item);
		}

		return {
			baseConfig,
			items,
			imageFilesToCopy,
		};
	}

	private async resolveCoverImage(
		frontmatter: Record<string, unknown>,
		sourcePath: string,
		format: ExportFormat,
		imageFilesToCopy: Map<string, TFile>,
	): Promise<{ url?: string; base64?: string; relativePath?: string }> {
		const rawCover =
			frontmatter.cover || frontmatter.cover_source || frontmatter.image;
		if (!rawCover) return {};

		const coverStr = toSafeString(rawCover).trim();

		// If it's an external URL (http / https)
		if (coverStr.startsWith('http://') || coverStr.startsWith('https://')) {
			return { url: coverStr };
		}

		// Clean wiki link [[image.webp]] or [[image.webp|caption]]
		const cleanLink = coverStr
			.replace(/^\[\[/, '')
			.replace(/\]\]$/, '')
			.split('|')[0]
			?.trim() || '';

		const imgFile = this.app.metadataCache.getFirstLinkpathDest(
			cleanLink,
			sourcePath,
		);

		if (imgFile && imgFile instanceof TFile) {
			const ext = imgFile.extension.toLowerCase();
			const mime = getMimeType(ext);

			if (format === 'single') {
				try {
					const buffer = await this.app.vault.readBinary(imgFile);
					const base64Str = arrayBufferToBase64(buffer);
					const dataUrl = `data:${mime};base64,${base64Str}`;
					return {
						url: dataUrl,
						base64: dataUrl,
					};
				} catch (e) {
					console.error(`Failed to read binary for image ${imgFile.path}:`, e);
				}
			} else {
				// Multi-file
				const safeName = `${imgFile.basename}-${hashString(imgFile.path)}.${ext}`;
				const relPath = `assets/images/${safeName}`;
				imageFilesToCopy.set(relPath, imgFile);
				return {
					url: relPath,
					relativePath: relPath,
				};
			}
		}

		return {};
	}
}

function stripFrontmatter(content: string): string {
	if (content.startsWith('---\n') || content.startsWith('---\r\n')) {
		const endMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
		if (endMatch && endMatch[0]) {
			return content.slice(endMatch[0].length);
		}
	}
	return content;
}

function getMimeType(extension: string): string {
	switch (extension.toLowerCase()) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'gif':
			return 'image/gif';
		case 'svg':
			return 'image/svg+xml';
		case 'avif':
			return 'image/avif';
		default:
			return 'image/jpeg';
	}
}

function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash).toString(36).slice(0, 6);
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

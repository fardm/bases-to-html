export type ExportFormat = 'single' | 'multi';
export type ExportScope = 'all' | 'bases-only';
export type PageWidth = 'full' | 'normal' | 'narrow';
export type ThemeMode = 'light' | 'dark';

export interface BaseSortConfig {
	property: string;
	direction?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface BaseGroupConfig {
	property: string;
	direction?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface BaseFilterGroup {
	and?: Array<string | BaseFilterGroup>;
	or?: Array<string | BaseFilterGroup>;
}

export type BaseFiltersConfig = string | BaseFilterGroup | Array<string | BaseFilterGroup>;

export interface BaseViewConfig {
	type: string;
	name: string;
	filters?: BaseFiltersConfig;
	groupBy?: BaseGroupConfig;
	order?: string[];
	sort?: BaseSortConfig[];
	image?: string;
	cardSize?: number;
	imageAspectRatio?: number;
	imageFit?: string;
	[key: string]: unknown;
}

export interface BaseFileConfig {
	filePath: string;
	fileName: string;
	baseTitle: string;
	formulas?: Record<string, string>;
	views: BaseViewConfig[];
}

export interface NoteItem {
	id: string;
	title: string;
	path: string;
	folder: string;
	tags: string[];
	properties: Record<string, unknown>;
	computedFormulas: Record<string, unknown>;
	coverImage?: string;
	coverImageBase64?: string;
	coverAssetRelativePath?: string;
	htmlContent?: string;
	rawMarkdown?: string;
}

export interface ExportOptions {
	documentTitle: string;
	baseFilePaths: string[];
	exportFormat: ExportFormat;
	exportScope: ExportScope;
	font: string;
	customCss: string;
	customCssScope: 'global' | 'per-base';
	perBaseCss?: Record<string, string>;
	outputLocation: string;
	openExportedFiles: boolean;
}

export interface ExportedBaseData {
	config: BaseFileConfig;
	items: NoteItem[];
}

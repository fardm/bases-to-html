export type ExportFormat = 'single' | 'multi';
export type ExportScope = 'bases-only' | 'properties-only' | 'full';
export type ExportedDataScope = 'all' | 'filtered';
export type PageWidth = 'full' | 'normal' | 'narrow';
export type ThemeMode = 'light' | 'dark';
export type PropertyType = 'text' | 'number' | 'date' | 'checkbox' | 'list' | 'link';

export interface PropertyMetadata {
	id: string;
	name: string;
	type: PropertyType;
	icon?: string;
}

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
	not?: Array<string | BaseFilterGroup> | string | BaseFilterGroup;
}

export type BaseFiltersConfig = string | BaseFilterGroup | Array<string | BaseFilterGroup>;

export interface FilterRule {
	id: string;
	conjunction?: 'and' | 'or';
	property: string;
	operator: string;
	value: unknown;
}

export interface SummaryResult {
	label: string;
	value: string | number | boolean;
}

export interface ViewStaticSummaries {
	grand: Record<string, SummaryResult>;
	groups?: Record<string, Record<string, SummaryResult>>;
}

export interface BaseViewConfig {
	id: string;
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
	columnSize?: Record<string, number>;
	summaries?: Record<string, string>;
	staticSummaries?: ViewStaticSummaries;
	[key: string]: unknown;
}

export interface BaseFileConfig {
	id: string;
	filePath: string;
	fileName: string;
	baseTitle: string;
	filters?: BaseFiltersConfig;
	formulas?: Record<string, string>;
	summaries?: Record<string, string>;
	views: BaseViewConfig[];
	propertyTypes?: Record<string, PropertyMetadata>;
}

export interface NoteItem {
	id: string;
	title: string;
	path: string;
	folder: string;
	ext?: string;
	ctime?: number;
	mtime?: number;
	size?: number;
	links?: string[];
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
	exportedData: ExportedDataScope;
	font: string;
	customCss: string;
	outputLocation: string;
	openExportedFiles: boolean;
}

export interface ExportedBaseData {
	config: BaseFileConfig;
	items: NoteItem[];
}

import { FontMode, OutputStorageMode } from './types';

export interface BasesToHtmlSettings {
	outputMode: OutputStorageMode;
	vaultOutputFolder: string;
	localOutputFolder: string;
	fontMode: FontMode;
	googleFontName: string;
	localFontPath: string;
	localFontName: string;
	// Legacy setting migrated to vaultOutputFolder
	defaultOutputFolder?: string;
}

export const DEFAULT_SETTINGS: BasesToHtmlSettings = {
	outputMode: 'vault',
	vaultOutputFolder: '',
	localOutputFolder: '',
	fontMode: 'default',
	googleFontName: '',
	localFontPath: '',
	localFontName: '',
};

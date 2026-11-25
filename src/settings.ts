import { OutputStorageMode } from './types';

export interface BasesToHtmlSettings {
	outputMode: OutputStorageMode;
	vaultOutputFolder: string;
	localOutputFolder: string;
	// Legacy setting migrated to vaultOutputFolder
	defaultOutputFolder?: string;
}

export const DEFAULT_SETTINGS: BasesToHtmlSettings = {
	outputMode: 'vault',
	vaultOutputFolder: '',
	localOutputFolder: '',
};

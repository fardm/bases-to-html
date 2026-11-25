import { ExportFormat } from '../types';
import { RadioOption, renderRadioGroup } from './radio-group';

export const EXPORT_FORMAT_OPTIONS: RadioOption<ExportFormat>[] = [
	{
		id: 'single',
		title: 'Single Page (Embedded)',
		desc: 'Embeds scripts, styles, and images into one standalone HTML file.',
	},
	{
		id: 'multi',
		title: 'Multi-File (Folder with Assets)',
		desc: 'Generates a structured folder with separate HTML, CSS, JS, and assets.',
	},
];

export function renderExportFormatRadioGroup(
	containerEl: HTMLElement,
	currentValue: ExportFormat,
	onChange: (val: ExportFormat) => void,
	groupName = 'exportFormat',
): HTMLElement {
	return renderRadioGroup(
		containerEl,
		'Export format',
		EXPORT_FORMAT_OPTIONS,
		currentValue,
		onChange,
		groupName,
	);
}

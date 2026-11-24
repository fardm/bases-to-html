import { ExportedDataScope } from '../types';

export interface ExportedDataOption {
	id: ExportedDataScope;
	title: string;
	desc: string;
}

export const EXPORTED_DATA_OPTIONS: ExportedDataOption[] = [
	{
		id: 'all',
		title: 'All Matching Data',
		desc: 'Export all items. Filters remain interactive.',
	},
	{
		id: 'filtered',
		title: 'Filtered Data Only',
		desc: "Export only items matching current filters. Other items won't be available.",
	},
];

export function renderExportedDataRadioGroup(
	containerEl: HTMLElement,
	currentValue: ExportedDataScope,
	onChange: (val: ExportedDataScope) => void,
	groupName = 'exportedDataScope',
): HTMLElement {
	const section = containerEl.createDiv({ cls: 'b2h-radio-group-section' });
	const header = section.createDiv({ cls: 'b2h-radio-group-header' });
	header.createDiv({ text: 'Exported data', cls: 'b2h-radio-group-title' });

	const group = section.createDiv({ cls: 'b2h-radio-group' });

	EXPORTED_DATA_OPTIONS.forEach((opt) => {
		const isSelected = currentValue === opt.id;
		const optionRow = group.createDiv({
			cls: `b2h-radio-option ${isSelected ? 'is-selected' : ''}`,
		});

		const radio = optionRow.createEl('input', {
			type: 'radio',
			cls: 'b2h-radio-input',
			attr: {
				name: groupName,
				value: opt.id,
			},
		});
		radio.checked = isSelected;

		const content = optionRow.createDiv({ cls: 'b2h-radio-content' });
		content.createDiv({ text: opt.title, cls: 'b2h-radio-label' });
		content.createDiv({ text: opt.desc, cls: 'b2h-radio-desc' });

		const selectThis = () => {
			group.querySelectorAll('.b2h-radio-option').forEach((el) => el.removeClass('is-selected'));
			optionRow.addClass('is-selected');
			radio.checked = true;
			onChange(opt.id);
		};

		optionRow.addEventListener('click', (e) => {
			if (e.target !== radio) {
				radio.checked = true;
			}
			selectThis();
		});

		radio.addEventListener('change', () => {
			if (radio.checked) {
				selectThis();
			}
		});
	});

	return section;
}

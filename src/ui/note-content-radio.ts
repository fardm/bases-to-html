import { ExportScope } from '../types';

export interface NoteContentOption {
	id: ExportScope;
	title: string;
	desc: string;
}

export const NOTE_CONTENT_OPTIONS: NoteContentOption[] = [
	{
		id: 'bases-only',
		title: 'Bases Only',
		desc: 'Export cards and properties only. No note content.',
	},
	{
		id: 'properties-only',
		title: 'Properties Only',
		desc: 'Show note properties and metadata in a modal.',
	},
	{
		id: 'full',
		title: 'Full Note Content',
		desc: 'Show properties and full note content in a modal.',
	},
];

export function renderNoteContentRadioGroup(
	containerEl: HTMLElement,
	currentValue: ExportScope,
	onChange: (val: ExportScope) => void,
	groupName = 'noteContentScope',
): HTMLElement {
	const section = containerEl.createDiv({ cls: 'b2h-radio-group-section' });
	const header = section.createDiv({ cls: 'b2h-radio-group-header' });
	header.createDiv({ text: 'Note content', cls: 'b2h-radio-group-title' });

	const group = section.createDiv({ cls: 'b2h-radio-group' });

	// Normalize legacy 'all' to 'full'
	const activeId = (currentValue as string) === 'all' ? 'full' : currentValue;

	NOTE_CONTENT_OPTIONS.forEach((opt) => {
		const isSelected = activeId === opt.id;
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

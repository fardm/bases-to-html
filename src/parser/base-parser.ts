import { parseYaml } from 'obsidian';
import { BaseFileConfig, BaseViewConfig } from '../types';

function isRecord(val: unknown): val is Record<string, unknown> {
	return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function parseBaseFile(content: string, filePath: string): BaseFileConfig {
	let parsed: unknown = {};
	try {
		parsed = parseYaml(content) ?? {};
	} catch (err) {
		console.error(`Failed to parse base file at ${filePath}:`, err);
		parsed = {};
	}

	const fileName = filePath.split('/').pop()?.replace(/\.base$/, '') || 'Base';
	const baseTitle = fileName;

	const formulas: Record<string, string> = {};
	const parsedObj = isRecord(parsed) ? parsed : {};

	if (isRecord(parsedObj.formulas)) {
		for (const [key, val] of Object.entries(parsedObj.formulas)) {
			if (typeof val === 'string') {
				formulas[key] = val;
			}
		}
	}

	const views: BaseViewConfig[] = [];
	if (Array.isArray(parsedObj.views)) {
		for (const item of parsedObj.views) {
			if (!isRecord(item)) continue;
			const v = item;
			const view: BaseViewConfig = {
				type: typeof v.type === 'string' ? v.type : 'cards',
				name: typeof v.name === 'string' ? v.name : 'View',
				filters: v.filters as BaseViewConfig['filters'],
				groupBy: isRecord(v.groupBy)
					? (v.groupBy as unknown as BaseViewConfig['groupBy'])
					: undefined,
				order: Array.isArray(v.order)
					? (v.order as unknown[]).filter((x): x is string => typeof x === 'string')
					: undefined,
				sort: Array.isArray(v.sort)
					? (v.sort as unknown[]).filter(
							(x): x is { property: string; direction?: 'ASC' | 'DESC' } =>
								isRecord(x) && typeof x.property === 'string',
						)
					: undefined,
				image: typeof v.image === 'string' ? v.image : '',
				cardSize: typeof v.cardSize === 'number' ? v.cardSize : 180,
				imageAspectRatio:
					typeof v.imageAspectRatio === 'number' ? v.imageAspectRatio : 1.5,
				imageFit: typeof v.imageFit === 'string' ? v.imageFit : 'cover',
			};
			views.push(view);
		}
	}

	if (views.length === 0) {
		views.push({
			type: 'cards',
			name: 'Default view',
			cardSize: 180,
			imageAspectRatio: 1.5,
			imageFit: 'cover',
		});
	}

	return {
		filePath,
		fileName,
		baseTitle,
		formulas,
		views,
	};
}

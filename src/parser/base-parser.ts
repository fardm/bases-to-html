import { parseYaml } from 'obsidian';
import { BaseFileConfig, BaseViewConfig } from '../types';

function isRecord(val: unknown): val is Record<string, unknown> {
	return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function sanitizeSlug(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[\s/\\?%*:|"<>]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'base'
	);
}

function generateStableHash(str: string): string {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash).toString(36);
}

function computeViewSignature(v: Record<string, unknown>): string {
	// Exclude name and label so renaming does not change the ID
	const parts = [
		typeof v.type === 'string' ? v.type : 'cards',
		JSON.stringify(v.filters ?? ''),
		JSON.stringify(v.groupBy ?? ''),
		JSON.stringify(v.sort ?? ''),
		JSON.stringify(v.order ?? ''),
		typeof v.image === 'string' ? v.image : '',
		typeof v.cardSize === 'number' ? v.cardSize : '',
		typeof v.imageAspectRatio === 'number' ? v.imageAspectRatio : '',
		typeof v.imageFit === 'string' ? v.imageFit : '',
		JSON.stringify(v.columnSize ?? ''),
		JSON.stringify(v.summaries ?? ''),
	];
	return parts.join('|');
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
	const parsedObj = isRecord(parsed) ? parsed : {};

	const baseId =
		typeof parsedObj.id === 'string' && parsedObj.id.trim()
			? parsedObj.id.trim()
			: sanitizeSlug(fileName);

	const formulas: Record<string, string> = {};

	if (isRecord(parsedObj.formulas)) {
		for (const [key, val] of Object.entries(parsedObj.formulas)) {
			if (typeof val === 'string') {
				formulas[key] = val;
			}
		}
	}

	const summaries: Record<string, string> = {};

	if (isRecord(parsedObj.summaries)) {
		for (const [key, val] of Object.entries(parsedObj.summaries)) {
			if (typeof val === 'string') {
				summaries[key] = val;
			}
		}
	}

	const views: BaseViewConfig[] = [];
	const seenIds = new Map<string, number>();

	if (Array.isArray(parsedObj.views)) {
		for (const item of parsedObj.views) {
			if (!isRecord(item)) continue;
			const v = item;

			let viewId =
				typeof v.id === 'string' && v.id.trim()
					? v.id.trim()
					: (typeof v.key === 'string' && v.key.trim() ? v.key.trim() : '');

			if (!viewId) {
				const sig = computeViewSignature(v);
				viewId = 'view-' + generateStableHash(sig);
			}

			const count = (seenIds.get(viewId) || 0) + 1;
			seenIds.set(viewId, count);
			if (count > 1) {
				viewId = `${viewId}-${count}`;
			}

			const view: BaseViewConfig = {
				id: viewId,
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
				columnSize: isRecord(v.columnSize)
					? (Object.fromEntries(
							Object.entries(v.columnSize).filter(([_, val]) => typeof val === 'number'),
						) as Record<string, number>)
					: undefined,
				summaries: isRecord(v.summaries)
					? (Object.fromEntries(
							Object.entries(v.summaries).filter(([_, val]) => typeof val === 'string'),
						) as Record<string, string>)
					: undefined,
			};
			views.push(view);
		}
	}

	if (views.length === 0) {
		views.push({
			id: 'default-view',
			type: 'cards',
			name: 'Default view',
			cardSize: 180,
			imageAspectRatio: 1.5,
			imageFit: 'cover',
		});
	}

	return {
		id: baseId,
		filePath,
		fileName,
		baseTitle,
		formulas,
		summaries,
		views,
	};
}

import {
	BaseFileConfig,
	BaseViewConfig,
	NoteItem,
	SummaryResult,
	ViewStaticSummaries,
} from '../types';
import {
	EvaluationContext,
	evaluateFilter,
	toSafeString,
} from './expression-evaluator';

export function getNoteItemValue(item: NoteItem, propPath: string): unknown {
	if (!propPath) return undefined;
	const clean = propPath.trim();
	if (clean === 'file.name' || clean === 'name' || clean === 'file') return item.title;
	if (clean === 'file.path') return item.path;
	if (clean === 'file.folder') return item.folder;
	if (clean === 'file.tags' || clean === 'file.tag') {
		return item.tags || [];
	}
	if (clean === 'tags') {
		const fmTags = item.properties['tags'] ?? item.properties['tag'];
		if (fmTags !== undefined && fmTags !== null) {
			if (Array.isArray(fmTags)) return fmTags;
			if (typeof fmTags === 'string') {
				return fmTags.split(/[\s,]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
			}
			return [toSafeString(fmTags).replace(/^#/, '').trim()].filter(Boolean);
		}
		return [];
	}
	if (clean.startsWith('formula.')) {
		const fName = clean.slice('formula.'.length);
		return item.computedFormulas ? item.computedFormulas[fName] : undefined;
	}
	if (clean.startsWith('note.')) {
		const p = clean.slice('note.'.length);
		return item.properties ? item.properties[p] : undefined;
	}
	if (item.properties && clean in item.properties) {
		return item.properties[clean];
	}
	if (item.computedFormulas && clean in item.computedFormulas) {
		return item.computedFormulas[clean];
	}
	return undefined;
}

export function evaluateSummaryRule(
	rule: string,
	col: string,
	items: NoteItem[],
	baseSummaries?: Record<string, string>,
): SummaryResult {
	const ruleStr = String(rule || '').trim();
	if (!ruleStr) {
		return { label: '', value: '-' };
	}

	// Extract values for this column across all items
	const rawVals: unknown[] = [];
	for (const item of items) {
		rawVals.push(getNoteItemValue(item, col));
	}

	// 1. Check if rule matches a custom summary formula from baseConfig.summaries
	if (baseSummaries && ruleStr in baseSummaries) {
		const formula = baseSummaries[ruleStr];
		if (typeof formula === 'string') {
			try {
				const val = evaluateCustomSummaryFormula(formula, rawVals);
				return { label: '', value: val };
			} catch (e) {
				console.warn(`Failed to evaluate custom summary formula "${ruleStr}":`, e);
				return { label: '', value: '-' };
			}
		}
	}

	// 2. Check if rule is directly a pipeline formula starting with 'values'
	if (ruleStr.startsWith('values')) {
		try {
			const val = evaluateCustomSummaryFormula(ruleStr, rawVals);
			return { label: '', value: val };
		} catch (e) {
			console.warn(`Failed to evaluate inline summary formula "${ruleStr}":`, e);
			return { label: '', value: '-' };
		}
	}

	// 3. Built-in summary functions
	const lower = ruleStr.toLowerCase();

	if (lower === 'count') {
		return { label: 'Count', value: items.length };
	}

	const filledVals = rawVals.filter((v) => {
		if (v === undefined || v === null || v === '') return false;
		if (Array.isArray(v) && v.length === 0) return false;
		return true;
	});

	if (lower === 'filled') {
		return { label: 'Filled', value: filledVals.length };
	}

	if (lower === 'empty') {
		return { label: 'Empty', value: items.length - filledVals.length };
	}

	if (lower === 'unique') {
		const uniq = new Set<string>();
		for (const v of filledVals) {
			if (Array.isArray(v)) {
				for (const sub of v) {
					if (sub !== null && sub !== undefined && sub !== '') uniq.add(toSafeString(sub));
				}
			} else {
				uniq.add(toSafeString(v));
			}
		}
		return { label: 'Unique', value: uniq.size };
	}

	if (lower === 'checked') {
		const checked = rawVals.filter((v) => v === true || String(v).toLowerCase() === 'true').length;
		return { label: 'Checked', value: checked };
	}

	if (lower === 'unchecked') {
		const unchecked = rawVals.filter((v) => v === false || String(v).toLowerCase() === 'false').length;
		return { label: 'Unchecked', value: unchecked };
	}

	const numVals: number[] = [];
	for (const v of filledVals) {
		const n = Number(v);
		if (!isNaN(n) && typeof v !== 'boolean') {
			numVals.push(n);
		}
	}

	if (lower === 'sum') {
		const sum = numVals.reduce((a, b) => a + b, 0);
		const formatted = Number.isInteger(sum) ? sum : Math.round(sum * 100) / 100;
		return { label: 'Sum', value: formatted };
	}

	if (lower === 'average' || lower === 'mean' || lower === 'avg') {
		if (numVals.length === 0) return { label: 'Average', value: '-' };
		const sum = numVals.reduce((a, b) => a + b, 0);
		const avg = Math.round((sum / numVals.length) * 100) / 100;
		return { label: 'Average', value: avg };
	}

	if (lower === 'median') {
		if (numVals.length === 0) return { label: 'Median', value: '-' };
		const sorted = numVals.slice().sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		const med = sorted.length % 2 !== 0 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
		return { label: 'Median', value: Math.round(med * 100) / 100 };
	}

	if (lower === 'min') {
		if (numVals.length > 0) {
			return { label: 'Min', value: Math.min(...numVals) };
		}
		if (filledVals.length > 0) {
			const sorted = filledVals.map(toSafeString).sort();
			return { label: 'Min', value: sorted[0] || '-' };
		}
		return { label: 'Min', value: '-' };
	}

	if (lower === 'max') {
		if (numVals.length > 0) {
			return { label: 'Max', value: Math.max(...numVals) };
		}
		if (filledVals.length > 0) {
			const sorted = filledVals.map(toSafeString).sort();
			return { label: 'Max', value: sorted[sorted.length - 1] || '-' };
		}
		return { label: 'Max', value: '-' };
	}

	if (lower === 'range') {
		if (numVals.length > 0) {
			const diff = Math.max(...numVals) - Math.min(...numVals);
			const formatted = Number.isInteger(diff) ? diff : Math.round(diff * 100) / 100;
			return { label: 'Range', value: formatted };
		}
		return { label: 'Range', value: '-' };
	}

	return { label: ruleStr, value: '-' };
}

export function evaluateCustomSummaryFormula(formula: string, rawVals: unknown[]): string | number | boolean {
	const calls = splitPipelineCalls(formula.trim());
	if (calls.length === 0 || calls[0] !== 'values') {
		return '-';
	}

	let current: unknown[] = rawVals.slice();

	for (let i = 1; i < calls.length; i++) {
		const callStr = calls[i];
		if (!callStr) continue;
		const match = callStr.match(/^(\w+)(?:\((.*)\))?$/s);
		if (!match) continue;

		const methodName = match[1];
		const argStr = match[2] !== undefined ? match[2] : '';

		if (methodName === 'flat') {
			const flattened: unknown[] = [];
			for (const item of current) {
				if (Array.isArray(item)) {
					for (const sub of item) {
						if (sub !== null && sub !== undefined && sub !== '') flattened.push(sub);
					}
				} else if (item !== null && item !== undefined && item !== '') {
					flattened.push(item);
				}
			}
			current = flattened;
		} else if (methodName === 'unique') {
			const seen = new Set<string>();
			current = current.filter((x) => {
				const s = toSafeString(x);
				if (seen.has(s)) return false;
				seen.add(s);
				return true;
			});
		} else if (methodName === 'filter') {
			const predExpr = argStr.trim();
			current = current.filter((item) => {
				const res = evaluateSummaryItemExpression(predExpr, item);
				return Boolean(res);
			});
		} else if (methodName === 'map') {
			const mapExpr = argStr.trim();
			current = current
				.map((item) => evaluateSummaryItemExpression(mapExpr, item))
				.filter((x) => x !== null && x !== undefined && x !== '');
		} else if (methodName === 'count') {
			return current.length;
		} else if (methodName === 'sum') {
			const s = current
				.map(Number)
				.filter((n) => !isNaN(n))
				.reduce((a, b) => a + b, 0);
			return Number.isInteger(s) ? s : Math.round(s * 100) / 100;
		} else if (methodName === 'mean' || methodName === 'avg') {
			const nums = current.map(Number).filter((n) => !isNaN(n));
			if (nums.length === 0) return 0;
			const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
			return Math.round(avg * 100) / 100;
		} else if (methodName === 'min') {
			const nums = current.map(Number).filter((n) => !isNaN(n));
			return nums.length > 0 ? Math.min(...nums) : 0;
		} else if (methodName === 'max') {
			const nums = current.map(Number).filter((n) => !isNaN(n));
			return nums.length > 0 ? Math.max(...nums) : 0;
		} else if (methodName === 'join') {
			const sep = argStr.replace(/^["']/, '').replace(/["']$/, '') || ', ';
			return current.map(toSafeString).join(sep);
		}
	}

	if (Array.isArray(current)) {
		return current.map(toSafeString).join(' ');
	}
	if (typeof current === 'number' || typeof current === 'boolean') {
		return current;
	}
	return toSafeString(current) || '-';
}

function evaluateSummaryItemExpression(rawExpr: string, itemValue: unknown): unknown {
	const expr = rawExpr.trim();
	if (!expr) return null;

	// Handle if(cond, then, else)
	if (expr.startsWith('if(') && expr.endsWith(')')) {
		const inner = expr.slice(3, -1);
		const args = splitTopLevelCommas(inner);
		if (args.length >= 2) {
			const cond = evaluateSummaryItemExpression(args[0] || '', itemValue);
			if (cond) {
				return evaluateSummaryItemExpression(args[1] || '', itemValue);
			} else if (args[2]) {
				return evaluateSummaryItemExpression(args[2], itemValue);
			}
			return null;
		}
	}

	// Handle comparison operators: ==, !=, <=, >=, <, >
	const opMatch = findTopLevelComparison(expr);
	if (opMatch) {
		const left = evaluateSummaryItemExpression(opMatch.left, itemValue);
		const right = evaluateSummaryItemExpression(opMatch.right, itemValue);
		switch (opMatch.op) {
			case '==':
				return String(left) === String(right);
			case '!=':
				return String(left) !== String(right);
			case '>=':
				return Number(left) >= Number(right);
			case '<=':
				return Number(left) <= Number(right);
			case '>':
				return Number(left) > Number(right);
			case '<':
				return Number(left) < Number(right);
		}
	}

	// Handle value.replace(pattern, replacement)
	const replaceMatch = expr.match(/^value\.replace\((.*)\)$/);
	if (replaceMatch) {
		const args = splitTopLevelCommas(replaceMatch[1] || '');
		let pattern = (args[0] || '').trim();
		const replacement = (args[1] || '').trim().replace(/^["']/, '').replace(/["']$/, '');
		const str = toSafeString(itemValue);

		const regexMatch = pattern.match(/^\/(.*)\/([gimsuy]*)$/);
		if (regexMatch) {
			try {
				const reg = new RegExp(regexMatch[1] || '', regexMatch[2]);
				return str.replace(reg, replacement);
			} catch {
				return str;
			}
		} else {
			pattern = pattern.replace(/^["']/, '').replace(/["']$/, '');
			return str.replace(pattern, replacement);
		}
	}

	// Handle array literal .contains(value) or .includes(value): ["a", "b"].contains(value)
	const arrayContainsMatch = expr.match(/^(\[.*\])\.(?:contains|includes)\((.*)\)$/s);
	if (arrayContainsMatch) {
		const arrayLiteralStr = arrayContainsMatch[1] || '';
		const innerArg = (arrayContainsMatch[2] || '').trim();
		const valToFind = innerArg === 'value' ? itemValue : evaluateSummaryItemExpression(innerArg, itemValue);

		try {
			const parsed: unknown = JSON.parse(arrayLiteralStr.replace(/'/g, '"'));
			const parsedArray: unknown[] = Array.isArray(parsed) ? parsed : [];
			const cleanFind = toSafeString(valToFind).toLowerCase().replace(/^#/, '');
			return parsedArray.some((x) => toSafeString(x).toLowerCase().replace(/^#/, '') === cleanFind);
		} catch {
			return false;
		}
	}

	// Handle string literals: "..." or '...'
	if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
		return expr.slice(1, -1);
	}

	// Handle number literals
	if (!isNaN(Number(expr)) && expr !== '') {
		return Number(expr);
	}

	// Handle boolean / null
	if (expr === 'true') return true;
	if (expr === 'false') return false;
	if (expr === 'null' || expr === 'undefined') return null;

	// Handle bare 'value'
	if (expr === 'value') {
		return itemValue;
	}

	return expr;
}

function splitPipelineCalls(expr: string): string[] {
	const calls: string[] = [];
	let depth = 0;
	let inQuote: string | null = null;
	let current = '';

	for (let i = 0; i < expr.length; i++) {
		const char = expr[i];
		if (inQuote) {
			current += char;
			if (char === inQuote && expr[i - 1] !== '\\') {
				inQuote = null;
			}
			continue;
		}
		if (char === '"' || char === "'") {
			inQuote = char;
			current += char;
			continue;
		}
		if (char === '(' || char === '[' || char === '{') {
			depth++;
			current += char;
			continue;
		}
		if (char === ')' || char === ']' || char === '}') {
			depth--;
			current += char;
			continue;
		}
		if (char === '.' && depth === 0) {
			if (current.trim()) calls.push(current.trim());
			current = '';
			continue;
		}
		current += char;
	}
	if (current.trim()) calls.push(current.trim());
	return calls;
}

function splitTopLevelCommas(str: string): string[] {
	const result: string[] = [];
	let depth = 0;
	let inQuote: string | null = null;
	let current = '';

	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		if (inQuote) {
			current += char;
			if (char === inQuote && str[i - 1] !== '\\') {
				inQuote = null;
			}
			continue;
		}
		if (char === '"' || char === "'") {
			inQuote = char;
			current += char;
			continue;
		}
		if (char === '(' || char === '[' || char === '{') {
			depth++;
			current += char;
			continue;
		}
		if (char === ')' || char === ']' || char === '}') {
			depth--;
			current += char;
			continue;
		}
		if (char === ',' && depth === 0) {
			result.push(current.trim());
			current = '';
			continue;
		}
		current += char;
	}
	if (current.trim().length > 0) {
		result.push(current.trim());
	}
	return result;
}

function findTopLevelComparison(expr: string): { left: string; op: string; right: string } | null {
	const operators = ['==', '!=', '>=', '<=', '>', '<'];
	let depth = 0;
	let inQuote: string | null = null;

	for (let i = 0; i < expr.length; i++) {
		const char = expr[i];
		if (inQuote) {
			if (char === inQuote && expr[i - 1] !== '\\') {
				inQuote = null;
			}
			continue;
		}
		if (char === '"' || char === "'") {
			inQuote = char;
			continue;
		}
		if (char === '(' || char === '[' || char === '{') {
			depth++;
			continue;
		}
		if (char === ')' || char === ']' || char === '}') {
			depth--;
			continue;
		}
		if (depth === 0) {
			for (const op of operators) {
				if (expr.slice(i, i + op.length) === op) {
					return {
						left: expr.slice(0, i).trim(),
						op,
						right: expr.slice(i + op.length).trim(),
					};
				}
			}
		}
	}
	return null;
}

export function computeViewSummaries(
	view: BaseViewConfig,
	allItems: NoteItem[],
	baseConfig: BaseFileConfig,
): ViewStaticSummaries | undefined {
	if (!view.summaries || Object.keys(view.summaries).length === 0) {
		return undefined;
	}

	// Filter items belonging to this view based on view.filters
	const viewItems = allItems.filter((item) => {
		if (!view.filters) return true;
		const ctx: EvaluationContext = {
			file: {
				name: item.title,
				path: item.path,
				folder: item.folder,
				tags: item.tags,
			},
			properties: item.properties,
			formulas: baseConfig.formulas,
			computedFormulas: item.computedFormulas,
		};
		return evaluateFilter(view.filters, ctx);
	});

	// Compute grand summaries
	const grand: Record<string, SummaryResult> = {};
	for (const [col, rule] of Object.entries(view.summaries)) {
		grand[col] = evaluateSummaryRule(rule, col, viewItems, baseConfig.summaries);
	}

	// Compute group summaries if groupBy is configured
	let groups: Record<string, Record<string, SummaryResult>> | undefined;
	if (view.groupBy && view.groupBy.property) {
		groups = {};
		const groupProp = view.groupBy.property;
		const groupMap = new Map<string, NoteItem[]>();

		for (const it of viewItems) {
			const keyVal = getNoteItemValue(it, groupProp);
			const isValEmpty =
				keyVal === undefined ||
				keyVal === null ||
				keyVal === '' ||
				(Array.isArray(keyVal) && keyVal.length === 0);
			const keyStr = isValEmpty
				? 'Uncategorized'
				: Array.isArray(keyVal)
					? keyVal.join(', ')
					: toSafeString(keyVal);
			if (!groupMap.has(keyStr)) groupMap.set(keyStr, []);
			groupMap.get(keyStr)!.push(it);
		}

		for (const [grpKey, grpItems] of groupMap.entries()) {
			groups[grpKey] = {};
			for (const [col, rule] of Object.entries(view.summaries)) {
				groups[grpKey][col] = evaluateSummaryRule(rule, col, grpItems, baseConfig.summaries);
			}
		}
	}

	return { grand, groups };
}

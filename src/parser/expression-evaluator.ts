export interface EvaluationContext {
	file: {
		name: string;
		path: string;
		folder: string;
		tags: string[];
	};
	properties: Record<string, unknown>;
	formulas?: Record<string, string>;
	computedFormulas?: Record<string, unknown>;
}

export function toSafeString(val: unknown): string {
	if (val === null || val === undefined) return '';
	if (typeof val === 'string') return val;
	if (typeof val === 'number' || typeof val === 'boolean') return String(val);
	if (Array.isArray(val)) return val.map(toSafeString).join(', ');
	return JSON.stringify(val);
}

export function evaluateFilter(
	filterConfig: unknown,
	context: EvaluationContext,
): boolean {
	if (!filterConfig) return true;

	if (typeof filterConfig === 'string') {
		return evaluateBooleanExpression(filterConfig.trim(), context);
	}

	if (Array.isArray(filterConfig)) {
		return filterConfig.every((item) => evaluateFilter(item, context));
	}

	if (typeof filterConfig === 'object') {
		const obj = filterConfig as Record<string, unknown>;
		if (obj.and && Array.isArray(obj.and)) {
			return obj.and.every((item) => evaluateFilter(item, context));
		}
		if (obj.or && Array.isArray(obj.or)) {
			return obj.or.some((item) => evaluateFilter(item, context));
		}
		if (obj.not) {
			if (Array.isArray(obj.not)) {
				return !obj.not.some((item) => evaluateFilter(item, context));
			}
			return !evaluateFilter(obj.not, context);
		}
	}

	return true;
}

export function evaluateFormula(
	formulaCode: string,
	context: EvaluationContext,
): unknown {
	if (!formulaCode || typeof formulaCode !== 'string') return '';
	return evaluateExpression(formulaCode.trim(), context);
}

export function resolvePropertyPath(
	path: string,
	context: EvaluationContext,
): unknown {
	const cleanPath = path.trim();

	if (cleanPath === 'file.name' || cleanPath === 'name') {
		return context.file.name;
	}
	if (cleanPath === 'file.path') {
		return context.file.path;
	}
	if (cleanPath === 'file.folder') {
		return context.file.folder;
	}
	if (cleanPath === 'file.tags' || cleanPath === 'file.tag') {
		return context.file.tags;
	}
	if (cleanPath === 'tags') {
		const fmTags = context.properties['tags'] ?? context.properties['tag'];
		if (fmTags !== undefined && fmTags !== null) {
			if (Array.isArray(fmTags)) return fmTags;
			if (typeof fmTags === 'string') {
				return fmTags.split(/[\s,]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
			}
			return [toSafeString(fmTags).replace(/^#/, '').trim()].filter(Boolean);
		}
		return [];
	}

	if (cleanPath.startsWith('formula.')) {
		const formulaName = cleanPath.slice('formula.'.length);
		if (context.computedFormulas && formulaName in context.computedFormulas) {
			return context.computedFormulas[formulaName];
		}
		if (context.formulas && context.formulas[formulaName]) {
			const formulaStr = context.formulas[formulaName];
			if (typeof formulaStr === 'string') {
				const res = evaluateFormula(formulaStr, context);
				if (context.computedFormulas) {
					context.computedFormulas[formulaName] = res;
				}
				return res;
			}
		}
		return '';
	}

	if (cleanPath.startsWith('note.')) {
		const prop = cleanPath.slice('note.'.length);
		return context.properties[prop];
	}

	if (cleanPath in context.properties) {
		return context.properties[cleanPath];
	}

	return undefined;
}

function evaluateBooleanExpression(
	rawExpr: string,
	context: EvaluationContext,
): boolean {
	const expr = rawExpr.trim();
	if (expr.startsWith('!')) {
		return !evaluateBooleanExpression(expr.slice(1), context);
	}
	const val = evaluateExpression(expr, context);
	return Boolean(val);
}

export function evaluateExpression(
	rawExpr: string,
	context: EvaluationContext,
): unknown {
	const expr = rawExpr.trim();
	if (!expr) return '';

	// Handle if(cond, then, else)
	if (expr.startsWith('if(') && expr.endsWith(')')) {
		const inner = expr.slice(3, -1);
		const args = splitTopLevelCommas(inner);
		const arg0 = args[0];
		const arg1 = args[1];
		const arg2 = args[2];
		if (arg0 && arg1) {
			const cond = evaluateBooleanExpression(arg0, context);
			if (cond) {
				return evaluateExpression(arg1, context);
			} else if (arg2) {
				return evaluateExpression(arg2, context);
			}
			return '';
		}
	}

	// Handle comparison operators: ==, !=, <=, >=, <, >
	const opMatch = findTopLevelComparison(expr);
	if (opMatch) {
		const left = evaluateExpression(opMatch.left, context);
		const right = evaluateExpression(opMatch.right, context);
		switch (opMatch.op) {
			case '==':
				return compareValues(left, right) === 0;
			case '!=':
				return compareValues(left, right) !== 0;
			case '>=':
				return compareValues(left, right) >= 0;
			case '<=':
				return compareValues(left, right) <= 0;
			case '>':
				return compareValues(left, right) > 0;
			case '<':
				return compareValues(left, right) < 0;
		}
	}

	// Handle method calls: file.hasTag("tag"), type.contains("film")
	const methodMatch = expr.match(/^([\w.-]+)\.(\w+)\((.*)\)$/);
	if (methodMatch) {
		const targetName = methodMatch[1];
		const methodName = methodMatch[2];
		const argsStr = methodMatch[3];
		if (targetName && methodName && argsStr !== undefined) {
			const args = splitTopLevelCommas(argsStr).map((a) =>
				evaluateExpression(a, context),
			);

			if (
				(targetName === 'file' && methodName === 'hasTag') ||
				((targetName === 'file' || targetName === 'file.tags' || targetName === 'file.tag') &&
					(methodName === 'contains' || methodName === 'hasTag'))
			) {
				const tagToFind = toSafeString(args[0]).replace(/^#/, '').toLowerCase();
				return context.file.tags.some((t) => {
					const cleanT = t.replace(/^#/, '').toLowerCase();
					return cleanT === tagToFind || cleanT.includes(tagToFind);
				});
			}

			const targetVal = resolvePropertyPath(targetName, context);
			if (methodName === 'contains' || methodName === 'hasTag') {
				const rawSearch = toSafeString(args[0]).toLowerCase();
				const cleanSearch = rawSearch.replace(/^#/, '');
				const isTagTarget =
					targetName === 'file.tags' ||
					targetName === 'tags' ||
					targetName.toLowerCase().endsWith('tag') ||
					targetName.toLowerCase().endsWith('tags');

				if (Array.isArray(targetVal)) {
					return targetVal.some((item) => {
						const rawItem = toSafeString(item).toLowerCase();
						const cleanItem = rawItem.replace(/^#/, '');
						if (isTagTarget) {
							return cleanItem === cleanSearch || cleanItem.includes(cleanSearch) || rawItem.includes(rawSearch);
						}
						return rawItem.includes(rawSearch);
					});
				}
				const rawTarget = toSafeString(targetVal).toLowerCase();
				if (isTagTarget) {
					const cleanTarget = rawTarget.replace(/^#/, '');
					return cleanTarget === cleanSearch || cleanTarget.includes(cleanSearch) || rawTarget.includes(rawSearch);
				}
				return rawTarget.includes(rawSearch);
			}
		}
	}

	// Check string literal: "..." or '...'
	if (
		(expr.startsWith('"') && expr.endsWith('"')) ||
		(expr.startsWith("'") && expr.endsWith("'"))
	) {
		return expr.slice(1, -1);
	}

	// Check number
	if (!isNaN(Number(expr)) && expr !== '') {
		return Number(expr);
	}

	// Check boolean / null
	if (expr === 'true') return true;
	if (expr === 'false') return false;
	if (expr === 'null' || expr === 'undefined') return null;

	// Otherwise, it is a property identifier or path
	return resolvePropertyPath(expr, context);
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
		} else if (char === '"' || char === "'") {
			inQuote = char;
			current += char;
		} else if (char === '(' || char === '[' || char === '{') {
			depth++;
			current += char;
		} else if (char === ')' || char === ']' || char === '}') {
			depth--;
			current += char;
		} else if (char === ',' && depth === 0) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
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

function compareValues(a: unknown, b: unknown): number {
	if (a === b) return 0;
	if (a === null || a === undefined) return -1;
	if (b === null || b === undefined) return 1;

	// Number comparison
	const numA = Number(a);
	const numB = Number(b);
	if (!isNaN(numA) && !isNaN(numB) && typeof a !== 'boolean' && typeof b !== 'boolean') {
		return numA - numB;
	}

	// String comparison
	return toSafeString(a).localeCompare(toSafeString(b));
}

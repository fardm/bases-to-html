import type { ExportFormat, FontMode, LocalFontConfig } from '../types';

function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	const parts: string[] = [];
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		parts.push(String.fromCharCode(...chunk));
	}
	return btoa(parts.join(''));
}

export interface FontFormatInfo {
	mimeType: string;
	format: 'woff2' | 'woff' | 'truetype' | 'opentype';
}

export function getFontFormatInfo(fileName: string): FontFormatInfo | null {
	const ext = fileName.split('.').pop()?.toLowerCase() || '';
	switch (ext) {
		case 'woff2':
			return { mimeType: 'font/woff2', format: 'woff2' };
		case 'woff':
			return { mimeType: 'font/woff', format: 'woff' };
		case 'ttf':
			return { mimeType: 'font/ttf', format: 'truetype' };
		case 'otf':
			return { mimeType: 'font/otf', format: 'opentype' };
		default:
			return null;
	}
}

export function sanitizeFontFileName(fileName: string): string {
	return fileName.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'custom-font.woff2';
}

export function getFontFamilyFromFileName(fileName: string): string {
	const base = fileName.replace(/\.[^.]+$/, '').trim();
	const clean = base.replace(/['"\\]/g, '').trim();
	return clean || 'CustomLocalFont';
}

export function buildGoogleFontLink(fontName: string): string {
	const trimmed = fontName.trim();
	if (!trimmed) return '';
	const encoded = encodeURIComponent(trimmed).replace(/%20/g, '+');
	return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap" rel="stylesheet">`;
}

export function buildCustomFontCss(params: {
	fontMode: FontMode;
	googleFontName?: string;
	localFont?: LocalFontConfig;
	exportFormat: ExportFormat;
	localFontBuffer?: ArrayBuffer;
}): { css: string; fontAssetRelativePath?: string; fontAssetSafeName?: string } {
	const { fontMode, googleFontName, localFont, exportFormat, localFontBuffer } = params;

	if (fontMode === 'google' && googleFontName?.trim()) {
		const safeName = googleFontName.trim().replace(/['"\\]/g, '');
		return {
			css: `[data-font="custom"] {\n  --font-family: '${safeName}', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n}`,
		};
	}

	if (fontMode === 'local' && localFont) {
		const familyName = getFontFamilyFromFileName(localFont.fileName);
		const safeFileName = sanitizeFontFileName(localFont.fileName);

		if (exportFormat === 'single') {
			const buf = localFontBuffer ?? localFont.data;
			if (!buf) return { css: '' };
			const base64 = encodeArrayBufferToBase64(buf);
			const css = `@font-face {
  font-family: '${familyName}';
  src: url('data:${localFont.mimeType};base64,${base64}') format('${localFont.format}');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
[data-font="custom"] {
  --font-family: '${familyName}', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}`;
			return { css };
		}

		// Multi-file: styles live at assets/css/styles.css, fonts at assets/fonts/<safeFileName>
		const fontAssetRelativePath = `assets/fonts/${safeFileName}`;
		const css = `@font-face {
  font-family: '${familyName}';
  src: url('../fonts/${safeFileName}') format('${localFont.format}');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
[data-font="custom"] {
  --font-family: '${familyName}', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}`;
		return {
			css,
			fontAssetRelativePath,
			fontAssetSafeName: safeFileName,
		};
	}

	return { css: '' };
}

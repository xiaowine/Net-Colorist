import { hexToColor } from './utils';

export interface ColorItem {
	id: string;
	hex: string;
	name?: string;
}

const pad = (s: string) => (s.length === 1 ? '0' + s : s);

function clamp(v: number) {
	return Math.max(0, Math.min(255, Math.round(v)));
}

export function rgbToHex(rgb: { r: number; g: number; b: number }): string {
	const r = clamp(rgb.r);
	const g = clamp(rgb.g);
	const b = clamp(rgb.b);
	const toHex = (n: number) => pad(n.toString(16));
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ensureHex(hex: string): string {
	if (!hex) return '#ffffff';
	let h = String(hex).trim();
	if (h.startsWith('rgb')) {
		const m = h.match(/rgba?\(([^)]+)\)/);
		if (m) {
			const parts = m[1].split(',').map((s) => Number(s.trim()));
			return rgbToHex({ r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0 });
		}
	}
	h = h.replace(/^#/, '');
	if (h.length === 3)
		h = h
			.split('')
			.map((c) => c + c)
			.join('');
	if (!/^([0-9a-fA-F]{6})$/.test(h)) return '#ffffff';
	return `#${h.toLowerCase()}`;
}

export function normalizeColor(input: any): ColorItem {
	if (!input) return { id: Date.now().toString(), hex: '#ffffff' };
	if (typeof input === 'object' && 'hex' in input && typeof input.hex === 'string') {
		return { id: input.id || Date.now().toString(), hex: ensureHex(input.hex), name: input.name };
	}
	if (typeof input === 'object' && 'r' in input && 'g' in input && 'b' in input) {
		try {
			const hex = rgbToHex({ r: Number(input.r) || 0, g: Number(input.g) || 0, b: Number(input.b) || 0 });
			return { id: Date.now().toString(), hex };
		} catch (e) {
			return { id: Date.now().toString(), hex: '#ffffff' };
		}
	}
	if (typeof input === 'string') {
		return { id: Date.now().toString(), hex: ensureHex(input) };
	}
	return { id: Date.now().toString(), hex: '#ffffff' };
}

export function toEdaColor(hex: string) {
	return hexToColor(ensureHex(hex));
}

export default normalizeColor;

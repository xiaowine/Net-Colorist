export interface ColorRGBA {
	r: number;
	g: number;
	b: number;
	alpha: number;
}

export type UserColorMap = Record<number, ColorRGBA>;

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

export function colorToCssRGBA(c: ColorRGBA) {
	const a = typeof c.alpha === 'number' ? c.alpha : 1;
	return `rgba(${clamp(c.r)}, ${clamp(c.g)}, ${clamp(c.b)}, ${a})`;
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

export function toEdaColor(hex: string) {
	return hexToColor(ensureHex(hex));
}

export const hexToColor = (hex: string): ColorRGBA => {
	const h = hex.replace(/^#/, '');
	const full =
		h.length === 3
			? h
					.split('')
					.map((ch) => ch + ch)
					.join('')
			: h;
	const intVal = parseInt(full, 16);
	const r = (intVal >> 16) & 0xff;
	const g = (intVal >> 8) & 0xff;
	const b = intVal & 0xff;
	return { r, g, b, alpha: 1 };
};

export const transparentRgba: ColorRGBA = { r: 0, g: 0, b: 0, alpha: 0 };

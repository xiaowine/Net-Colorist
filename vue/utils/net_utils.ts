/**
 * 过滤字符串数组：必须匹配 include（正则或子串），且不匹配 exclude（正则或子串）
 *
 * - `include` 可以是单个 `RegExp`、单个字符串（作为子串匹配），或数组
 * - `exclude` 同上，可选，不提供则仅按 include 过滤
 *
 * 返回符合条件的字符串数组
 */
export function filterStringsByRegex(
	items: string[],
	include: RegExp | string | Array<RegExp | string>,
	exclude?: RegExp | string | Array<RegExp | string>,
): string[] {
	const includes = Array.isArray(include) ? include : [include];
	const excludes = exclude ? (Array.isArray(exclude) ? exclude : [exclude]) : [];

	const test = (pattern: RegExp | string, s: string) => {
		if (pattern instanceof RegExp) return pattern.test(s);
		return s.indexOf(pattern) !== -1;
	};

	return items.filter((item) => {
		const incOk = includes.length === 0 ? true : includes.some((p) => test(p, item));
		const excOk = excludes.some((p) => test(p, item));
		return incOk && !excOk;
	});
}

/**
 * 电源名称匹配正则（包含）
 *
 * 精确匹配（作为子串，允许前后任意字符）：
 * - "*.*v": 数字.数字v，例如 1.2v  -> \d+\.\d+v
 * - "*v*": 数字v数字或数字v，例如 1v2 或 5v -> \d+v\d*
 * - "vdd*"/"vcc*": vdd/vcc 后可跟字母或数字 -> vdd[a-z0-9]* / vcc[a-z0-9]*
 * - "vbus*": vbus 后可跟数字 -> vbus\d*
 */
export const POWER_INCLUDE_REGEX = /(?:(?:\d+\.\d+v)|(?:\d+v\d*)|vdd[a-z0-9]*|vcc[a-z0-9]*|vbus\d*)/i;

/**
 * 电源名称排除正则（任意位置匹配）
 * 包含 `en`、`fb`、`ctrl` 的字符串将被排除
 */
export const POWER_EXCLUDE_REGEX = /(en|fb|ctrl)/i;

/**
 * 专用：过滤电源网络名
 * - 保留匹配 `POWER_INCLUDE_REGEX` 的项
 * - 且排除包含 `en|fb|ctrl` 的项
 */
export function filterPowerNets(items: string[]): string[] {
	return filterStringsByRegex(items, POWER_INCLUDE_REGEX, POWER_EXCLUDE_REGEX);
}

/**
 * 电源网络分类：识别显式标注电压的网络（如 `1.2v`, `5v2` 等）和以电源轨命名的网络（如 `vdd*`, `vcc*`, `vbus*`）。
 *
 * 返回结构包含三类：
 * - `explicit`：网络名中包含具体电压字符串，返回匹配到的电压文本；
 * - `rails`：按电源轨命名但未写明数值的网络（如 vdd/vcc/vbus），返回轨名称；
 * - `others`：未识别为电源的其它网络名。
 *
 * @param nets - 要分类的网络名数组（建议先用 `filterPowerNets` 过滤出疑似电源名）
 */
export interface ClassifiedPowerNets {
	explicit: Array<{ net: string; voltage: number }>;
	rails: Array<{ net: string; rail: string }>;
	others: string[];
}

export function classifyPowerNets(nets: string[]): ClassifiedPowerNets {
	if (!nets || nets.length === 0) return { explicit: [], rails: [], others: [] };

	// 显式电压匹配：1.2v 或 1v2 / 5v 等形式（忽略大小写）
	const explicitRe = /(\d+\.\d+v|\d+v\d*|\d+v)/i;
	// 常见电源轨（不要求后面有数字），匹配 vdd*, vcc*, vbus*
	const railsRe = /(vdd[a-z0-9]*|vcc[a-z0-9]*|vbus\d*)/i;

	const result: ClassifiedPowerNets = { explicit: [], rails: [], others: [] };

	const unique = Array.from(new Set(nets)).filter(Boolean);
	const parseVoltage = (txt: string): number => {
		const u = txt.toLowerCase();
		// 1.2v
		const m1 = u.match(/^(\d+)\.(\d+)v$/);
		if (m1) return parseFloat(`${m1[1]}.${m1[2]}`);
		// 1v2 -> 1.2
		const m2 = u.match(/^(\d+)v(\d+)$/);
		if (m2) return parseFloat(`${m2[1]}.${m2[2]}`);
		// 5v -> 5
		const m3 = u.match(/^(\d+)v$/);
		if (m3) return Number(m3[1]);
		return NaN;
	};

	unique.forEach((n) => {
		const s = String(n);
		const explicitMatch = s.match(explicitRe);
		if (explicitMatch) {
			const raw = explicitMatch[0];
			const v = parseVoltage(raw);
			if (!Number.isNaN(v)) {
				result.explicit.push({ net: s, voltage: v });
			} else {
				result.others.push(s);
			}
			return;
		}

		const railMatch = s.match(railsRe);
		if (railMatch) {
			result.rails.push({ net: s, rail: railMatch[0].toUpperCase() });
			return;
		}

		result.others.push(s);
	});

	return result;
}

/**
 * 简化的差分对识别函数。
 *
 * 功能：从给定的网络名数组中识别配对的正/负差分网络，并返回建议的差分对名称及对应的正负网络。
 *
 * 匹配规则（简要）：
 * - 通过传入的正/负后缀列表识别正/负极（大小写不敏感），后缀可以出现在网络名的任意位置；
 * - 为避免误匹配（如在单词中间匹配到 P/N），要求后缀之后必须是字符串结尾或非字母数字字符；
 * - 识别时会将后缀移除以得到基名，并以基名（大写规范）分组以配对正/负网络；
 * - 当同一基名存在多组正或负网络时，仅保留首次出现的正/负网络；
 * - 返回数组元素类型为 `IPCB_DifferentialPairItem`，包含 `name`, `positiveNet`, `negativeNet`。
 *
 * 注意：该函数为简化版，不会检查已存在的差分对或与器件的连接，仅用于快速识别可能的差分对。
 *
 * @param netList - 网络名字符串数组
 * @param positiveSuffixes - 正极后缀数组（默认常见后缀），匹配时不区分大小写
 * @param negativeSuffixes - 负极后缀数组（默认常见后缀），匹配时不区分大小写
 * @returns 识别出的差分对数组，每项含 `name`, `positiveNet`, `negativeNet`
 */
export function identifyDiffPairsSimple(
	netList: string[],
	positiveSuffixes: string[] = ['P', '+', 'DP', 'H', 'DP'],
	negativeSuffixes: string[] = ['N', '-', 'DN', 'L', 'DM'],
): IPCB_DifferentialPairItem[] {
	if (!netList || netList.length === 0) return [];

	const normalizeAndSort = (arr: string[]) =>
		Array.from(new Set(arr.map((s) => (s || '').toUpperCase().trim()))).sort((a, b) => b.length - a.length);

	const posSuffixes = normalizeAndSort(positiveSuffixes);
	const negSuffixes = normalizeAndSort(negativeSuffixes);
	const allSuffixes = [...posSuffixes, ...negSuffixes];

	if (allSuffixes.length === 0) return [];

	// 支持后缀在任意位置出现，但要求后缀之后为字符串结尾或非字母数字
	const uniqueNets = Array.from(new Set(netList)).filter(Boolean);
	const groups = new Map<string, { origBase?: string; p?: string; n?: string }>();

	const findSuffixOccurrence = (netU: string, suffixes: string[]) => {
		for (const s of suffixes) {
			if (!s) continue;
			let start = 0;
			while (true) {
				const idx = netU.indexOf(s, start);
				if (idx === -1) break;
				const after = idx + s.length;
				const afterChar = after < netU.length ? netU.charAt(after) : '';
				const afterOk = after >= netU.length || !/[A-Z0-9]/i.test(afterChar);
				if (afterOk) return { suffix: s, index: idx, length: s.length };
				start = idx + 1;
			}
		}
		return null;
	};

	uniqueNets.forEach((net) => {
		const netStr = String(net);
		const netU = netStr.toUpperCase();

		const posFound = findSuffixOccurrence(netU, posSuffixes);
		const negFound = findSuffixOccurrence(netU, negSuffixes);

		if (posFound) {
			const { index, length } = posFound;
			const base = netStr.slice(0, index) + netStr.slice(index + length);
			const key = (base || '').trim().toUpperCase();
			if (!groups.has(key)) groups.set(key, { origBase: base });
			const entry = groups.get(key)!;
			if (!entry.p) entry.p = netStr;
		} else if (negFound) {
			const { index, length } = negFound;
			const base = netStr.slice(0, index) + netStr.slice(index + length);
			const key = (base || '').trim().toUpperCase();
			if (!groups.has(key)) groups.set(key, { origBase: base });
			const entry = groups.get(key)!;
			if (!entry.n) entry.n = netStr;
		}
	});

	const result: IPCB_DifferentialPairItem[] = [];
	const nameSet = new Set<string>();

	groups.forEach((v) => {
		if (v.p && v.n) {
			const display = v.origBase ?? '';
			let finalName = display || (v.p || '').replace(/[^a-z0-9_\-]/gi, '_');
			let tries = 0;
			while (nameSet.has(finalName)) {
				if (tries < 5) {
					finalName = finalName + '*';
				} else {
					finalName = `${display || finalName}-${tries - 4}`;
				}
				tries++;
			}
			nameSet.add(finalName);
			result.push({ name: finalName, positiveNet: v.p, negativeNet: v.n });
		}
	});

	return result;
}

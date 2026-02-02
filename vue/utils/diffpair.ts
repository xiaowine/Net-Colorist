// 差分对定义
interface IPCB_DifferentialPairItem {
	name: string;
	positiveNet: string;
	negativeNet: string;
}
/**
 * 差分对识别结果接口
 */
export interface DiffPairResult {
	duplicatedPairs: IPCB_DifferentialPairItem[]; // 重名差分对列表
	normalPairs: IPCB_DifferentialPairItem[]; // 正常差分对列表
	existingPairs: IPCB_DifferentialPairItem[]; // 已经存在的差分对
}

/**
 * 增强版差分对识别工具
 * @param netList - 所有的网络名称列表
 * @param existingPairs - 已经存在的差分对对象数组
 * @param positiveSuffixes - 正极后缀数组
 * @param negativeSuffixes - 负极后缀数组
 * @returns 包含重名差分对列表、正常差分对列表和已存在差分对的结果对象
 */
export function identifyNewDiffPairs(
	netList: string[],
	existingPairs: IPCB_DifferentialPairItem[] = [],
	positiveSuffixes: string[] = ['_P', '+', '_DP', 'P', '_H', '_DP', 'DP'],
	negativeSuffixes: string[] = ['_N', '-', '_DN', 'N', '_L', '_DM', 'DM'],
): DiffPairResult {
	// 动态构建正则表达式
	const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// 规范化并按长度降序排序，保证最长后缀优先匹配
	const normalizeAndSort = (arr: string[]) => Array.from(new Set(arr.map((s) => s.toUpperCase().trim()))).sort((a, b) => b.length - a.length);

	const posSuffixesUpper = normalizeAndSort(positiveSuffixes);
	const negSuffixesUpper = normalizeAndSort(negativeSuffixes);

	// 用于构建正则（最长在前）
	const allSuffixesSorted = [...posSuffixesUpper, ...negSuffixesUpper];
	const suffixPattern: string = allSuffixesSorted.map(escapeRegex).join('|');

	// 预建查找 Set，减少运行时 toUpperCase 调用
	const posSuffixSet = new Set(posSuffixesUpper);
	const negSuffixSet = new Set(negSuffixesUpper);

	// 正则说明：^(主体名)(后缀)$  使用 'i' 忽略大小写
	const regex = new RegExp(`^(.+?)(${suffixPattern})$`, 'i');

	// --- 2. 查重缓存准备 ---
	const existingPairNames: Set<string> = new Set(existingPairs.map((p) => p.name));
	const occupiedNets: Set<string> = new Set();

	existingPairs.forEach((p) => {
		occupiedNets.add(p.positiveNet);
		occupiedNets.add(p.negativeNet);
	});

	const uniqueNetList: string[] = Array.from(new Set(netList));
	const potentialMap: Map<string, { origBase?: string; p?: string; n?: string }> = new Map();
	const normalPairs: IPCB_DifferentialPairItem[] = [];
	const duplicatedPairs: IPCB_DifferentialPairItem[] = [];

	// --- 3. 遍历并识别 ---
	uniqueNetList.forEach((net) => {
		if (!net || occupiedNets.has(net)) return;

		const match = net.match(regex);
		if (match) {
			const baseName = match[1];
			const suffix = match[2].toUpperCase();

			// 规范化 key，避免大小写差异分组
			const key = baseName.trim().toUpperCase();

			if (!potentialMap.has(key)) {
				potentialMap.set(key, { origBase: baseName });
			}

			const entry = potentialMap.get(key)!;

			// 使用预建 Set 快速判断正负
			const isPos = posSuffixSet.has(suffix);
			const isNeg = negSuffixSet.has(suffix);

			if (isPos) entry.p = net;
			else if (isNeg) entry.n = net;
		}
	});

	// --- 4. 冲突处理与组装 ---
	potentialMap.forEach((pair, key) => {
		if (pair.p && pair.n) {
			// 显示用名称优先使用首个原始形式，否则使用规范化 key
			const displayBase = pair.origBase ?? key;
			let finalName = displayBase;
			let starCount = 0;
			let isDuplicated = false;

			// 检查是否与已存在的差分对重名
			if (existingPairNames.has(finalName)) {
				isDuplicated = true;
				// 差分对名称查重逻辑：最多加 5 个 *
				while (existingPairNames.has(finalName)) {
					if (starCount < 5) {
						finalName += '*';
						starCount++;
					} else {
						// 达到上限，仍然记录为重名差分对
						finalName = displayBase + '*'.repeat(5);
						break;
					}
				}
			}

			const diffPair: IPCB_DifferentialPairItem = {
				name: finalName,
				positiveNet: pair.p,
				negativeNet: pair.n,
			};

			// 根据是否重名分类存储
			if (isDuplicated) {
				duplicatedPairs.push(diffPair);
			} else {
				normalPairs.push(diffPair);
			}

			// 更新缓存，防止本次识别出的对之间产生重名
			existingPairNames.add(finalName);
		}
	});

	return {
		duplicatedPairs,
		normalPairs,
		existingPairs,
	};
}

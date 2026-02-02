<template>
	<div class="diffpair-calculator calculator-base">
		<header class="calc-header">
			<h3>差分对管理</h3>
		</header>

		<div class="columns">
			<div class="left">
				<div class="calc-form">
					<div class="calc-field">
						<label>总网络数量</label>
						<div>{{ totalNets }}</div>
					</div>

					<div class="calc-field">
						<label>可生成差分对</label>
						<div>{{ normalPairs.length }}</div>
					</div>

					<div class="calc-field">
						<label>疑似可生成差分对</label>
						<div>{{ passiveComponentPairs.length }}</div>
					</div>

					<div class="calc-field">
						<label>可生成重名差分对</label>
						<div>{{ duplicatedPairs.length }}</div>
					</div>

					<div class="calc-field">
						<label>已存在差分对</label>
						<div>{{ existingPairs.length }}</div>
					</div>

					<div class="calc-result-card" style="margin-top: 12px; padding: 10px 12px">
						<div class="calc-result-inner">
							<div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px">
								<div><strong>正常:</strong> {{ normalPairs.length }}</div>
								<div><strong>重名:</strong> {{ duplicatedPairs.length }}</div>
								<div><strong>已存在:</strong> {{ existingPairs.length }}</div>
							</div>
						</div>
					</div>

					<div class="button-group">
						<button class="refresh-btn" @click="refreshDiffPairs" :disabled="loading">
							<span v-if="loading">识别中...</span>
							<span v-else>重新识别</span>
						</button>
						<button class="apply-btn" @click="applyDiffPairs" :disabled="selectedCount === 0">
							<span>生成</span>
							<span>({{ selectedCount }})</span>
						</button>
					</div>
				</div>
			</div>

			<div class="right">
				<div class="calc-result" style="padding-left: 0">
					<DiffPairTable :title="`差分对 (${normalPairs.length})`" :data="normalPairs"
						:columns="normalTableColumns" :selected-map="selectedMap" :selectable="true"
						@update:selected-map="Object.assign(selectedMap, $event)" />

					<DiffPairTable :title="`疑似可生成差分对 (${passiveComponentPairs.length})`" :data="passiveComponentPairs"
						:columns="passiveTableColumns" :selectable="true" :selected-map="selectedMap"
						@update:selected-map="Object.assign(selectedMap, $event)" table-class="dp-table-passive">
						<template #cell-differentialPairName="{ item }">
							{{ item.differentialPairName }}
						</template>
						<template #cell-unpairedStatus="{ item }">
							<div style="display: flex; flex-direction: column; gap: 4px">
								<div v-if="item.unpairedPositiveDesignators?.length">正: {{
									item.unpairedPositiveDesignators.join(', ') }}</div>
								<div v-if="item.unpairedNegativeDesignators?.length">负: {{
									item.unpairedNegativeDesignators.join(', ') }}</div>
							</div>
						</template>
						<template #cell-unpairedNets="{ item }">
							<div style="display: flex; flex-direction: column; gap: 4px">
								<div v-if="item.unpairedPositiveNet">正: {{ item.unpairedPositiveNet }}</div>
								<div v-if="item.unpairedNegativeNet">负: {{ item.unpairedNegativeNet }}</div>
							</div>
						</template>
						<template #empty>未发现疑似可生成差分对</template>
					</DiffPairTable>

					<DiffPairTable :title="`重名差分对 (${duplicatedPairs.length})`" :data="duplicatedPairs"
						:columns="normalTableColumns" :selected-map="selectedMap" :selectable="true"
						@update:selected-map="Object.assign(selectedMap, $event)" />

					<DiffPairTable :title="`已存在差分对 (${existingPairs.length})`" :data="existingPairs"
						:columns="normalTableColumns" :actions="existingTableActions" table-class="dp-table-exist"
						@action="handleExistingAction" />
				</div>
				<div class="dup-note">
					说明：重名差分对表示名称与已有差分对或识别出的其他差分对冲突，但是网络不冲突，系统会在后面添加*号；检测到未配对器件表示在差分对网络上发现了连接到其他网络的器件，可生成新差分对。
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

import DiffPairTable from '../components/DiffPairTable.vue';
import type { TableAction, TableColumn } from '../components/DiffPairTable.vue';
import { EasyEDANetlist, PassiveComponentPair } from '../types/netlist';
import { findSingleNetPassivesByPairs, identifyNewDiffPairs, test } from '../utils/diffpair';
import { isEDA, isPCB } from '../utils/utils';

const loading = ref(false);
type IPCB_DifferentialPairItem = { name: string; positiveNet: string; negativeNet: string };

const duplicatedPairs = ref<IPCB_DifferentialPairItem[]>([]);
const normalPairs = ref<IPCB_DifferentialPairItem[]>([]);
const existingPairs = ref<IPCB_DifferentialPairItem[]>([]);
const totalNets = ref(0);
const selectedMap = reactive<Record<string, boolean>>({});

const idOf = (p: IPCB_DifferentialPairItem) => `${p.positiveNet}||${p.negativeNet}`;
const idOfPassive = (p: PassiveComponentPair) => `passive_${p.differentialPairName}`;

// 表格配置
const normalTableColumns: TableColumn[] = [
	{ key: 'name', label: '名称', width: '30%' },
	{ key: 'positiveNet', label: '正极', width: '35%' },
	{ key: 'negativeNet', label: '负极', width: '35%' },
];

const passiveTableColumns: TableColumn[] = [
	{ key: 'differentialPairName', label: '新建差分对名', width: '35%' },
	{ key: 'unpairedStatus', label: '参考器件位号', width: '25%' },
	{ key: 'unpairedNets', label: '未成对的网络', width: '40%' },
];


const existingTableActions: TableAction[] = [{ key: 'delete', text: '删除', class: 'delete-btn' }];

// 成对匹配：对于每个差分对，找出分别连接到正/负网的被动元件，并尝试配对（优先按 Value 匹配，其次按 FootprintName）
const passiveComponentPairs = ref<PassiveComponentPair[]>([]);

const handleExistingAction = async (item: IPCB_DifferentialPairItem, action: TableAction) => {
	if (action.key === 'delete') {
		if (!isEDA) {
			existingPairs.value = existingPairs.value.filter((p) => idOf(p) !== idOf(item));
			return;
		}
		loading.value = true;
		try {
			const succ = await eda.pcb_Drc.deleteDifferentialPair(item.name);
			if (!succ) {
				eda.sys_Message.showToastMessage(`删除差分对 ${item.name} 失败`, ESYS_ToastMessageType.ERROR, 5);
				console.log(`删除差分对 ${item.name} 失败`);
			} else {
				eda.sys_Message.showToastMessage(`删除差分对 ${item.name} 成功`, ESYS_ToastMessageType.SUCCESS, 5);
			}
		} catch (e: any) {
			eda.sys_Message.showToastMessage(`删除差分对 ${item.name} 失败`, ESYS_ToastMessageType.ERROR, 5);
			console.log('删除差分对出错:', e);
		} finally {
			loading.value = false;
		}
		await refreshDiffPairs();
	}
};

const selectedCount = computed(() => {
	const normalAndDup = [...normalPairs.value, ...duplicatedPairs.value].filter((p) => !!selectedMap[idOf(p)]).length;
	const passive = passiveComponentPairs.value.filter((p) => !!selectedMap[idOfPassive(p)]).length;
	return normalAndDup + passive;
});

watch(
	loading,
	(newVal) => {
		if (isEDA) {
			if (newVal) {
				eda.sys_LoadingAndProgressBar.showLoading();
			} else {
				eda.sys_LoadingAndProgressBar.destroyLoading();
			}
		}
	},
	{ flush: 'sync' },
);

onMounted(async () => {
	if (isEDA) {
		if (!(await isPCB())) {
			eda.sys_Message.showToastMessage('当前不在PCB编辑环境中，差分对管理不可用', ESYS_ToastMessageType.ERROR, 5);
			return;
		} else {
			refreshDiffPairs();
		}
	}
});
const applyDiffPairs = async () => {
	console.log('应用差分对:', normalPairs.value);
	if (!isEDA) return;

	// 收集普通差分对
	const allCandidates = [...normalPairs.value, ...duplicatedPairs.value];
	const selectedNormal = allCandidates.filter((p) => selectedMap[idOf(p)]);

	// 收集被动器件差分对
	const selectedPassive = passiveComponentPairs.value.filter((p) => selectedMap[idOfPassive(p)]);

	if (selectedNormal.length === 0 && selectedPassive.length === 0) {
		eda.sys_Message.showToastMessage('未选择任何差分对，请先勾选要应用的项', ESYS_ToastMessageType.WARNING, 5);
		return;
	}

	loading.value = true;
	try {
		// 生成普通差分对
		for (const pair of selectedNormal) {
			try {
				const succ = await eda.pcb_Drc.createDifferentialPair(pair.name, pair.positiveNet, pair.negativeNet);
				if (succ) {
					console.log(`创建差分对 ${pair.name} 成功`);
				} else {
					eda.sys_Message.showToastMessage(`创建差分对 ${pair.name} 失败`, ESYS_ToastMessageType.ERROR, 5);
					console.log(`创建差分对 ${pair.name} 失败`);
				}
			} catch (e) {
				eda.sys_Message.showToastMessage(`创建差分对 ${pair.name} 失败`, ESYS_ToastMessageType.ERROR, 5);
				console.log(`创建差分对 ${pair.name} 失败:`, e);
			}
		}

		// 生成被动器件差分对
		for (const item of selectedPassive) {
			try {
				const succ = await eda.pcb_Drc.createDifferentialPair(
					item.differentialPairName,
					item.unpairedPositiveNet!,
					item.unpairedNegativeNet!,
				);
				if (succ) {
					console.log(`创建差分对 ${item.differentialPairName} 成功`);
				} else {
					eda.sys_Message.showToastMessage(`创建差分对 ${item.differentialPairName} 失败`, ESYS_ToastMessageType.ERROR, 5);
					console.log(`创建差分对 ${item.differentialPairName} 失败`);
				}
			} catch (e) {
				eda.sys_Message.showToastMessage(`创建差分对 ${item.differentialPairName} 失败`, ESYS_ToastMessageType.ERROR, 5);
				console.log(`创建差分对 ${item.differentialPairName} 失败:`, e);
			}
		}

		eda.sys_Message.showToastMessage('差分对已应用完成！', ESYS_ToastMessageType.SUCCESS, 5);
	} finally {
		loading.value = false;
	}
	await refreshDiffPairs();
};

const refreshDiffPairs = async () => {
	loading.value = true;
	try {
		console.log('开始识别差分对...');
		let nowNets: string[] = test;
		let nowDiffPairsRaw: IPCB_DifferentialPairItem[] = [];
		let netJson: EasyEDANetlist | null = null;
		if (isEDA) {
			nowNets = await eda.pcb_Net.getAllNetsName();
			nowDiffPairsRaw = await eda.pcb_Drc.getAllDifferentialPairs();
			const netList = await eda.pcb_Net.getNetlist(ESYS_NetlistType.JLCEDA_PRO);
			netJson = JSON.parse(netList) as EasyEDANetlist;
		}
		// console.log(typeof nowNets, nowNets);
		// console.log('获取网络数量:', nowNets.length);
		// console.log('获取现有差分对:', nowDiffPairsRaw);
		totalNets.value = nowNets.length;
		const existingSimple = nowDiffPairsRaw || [];
		const res = identifyNewDiffPairs(nowNets, existingSimple as any);
		// console.log('识别结果 - 正常对:', res.normalPairs?.length, '重名对:', res.duplicatedPairs?.length);
		duplicatedPairs.value = res.duplicatedPairs || [];
		normalPairs.value = res.normalPairs || [];
		existingPairs.value = res.existingPairs || existingSimple || [];

		if (isEDA) {
			// 查找连接到已存在差分对网络的单端器件对
			try {
				passiveComponentPairs.value = findSingleNetPassivesByPairs(netJson!.components, existingPairs.value);
				console.log('检测到的单端器件对:', passiveComponentPairs.value);
			} catch (err) {
				console.log('查找单端器件时出错:', err);
			}
		}

		const currentIds = new Set([...normalPairs.value, ...duplicatedPairs.value].map(idOf));
		const currentPassiveIds = new Set(passiveComponentPairs.value.map(idOfPassive));
		Object.keys(selectedMap).forEach((k) => {
			if (!currentIds.has(k) && !currentPassiveIds.has(k)) delete selectedMap[k];
		});
		// console.log('差分对识别完成');
	} catch (e: any) {
		console.log('识别差分对时出错:', e);
	} finally {
		loading.value = false;
	}
};
</script>

<style scoped lang="scss">
@use '../styles/calculator-mixins.scss' as *;

.diffpair-calculator {
	@include calculator-base;
	padding: 16px;
	box-shadow: var(--calc-shadow);
	max-width: 700px;
	width: 100%;
	color: var(--calc-text);

	.calc-header {
		@include calc-header;
		margin-bottom: 8px;
	}

	.calc-form {
		@include calc-form;
		gap: 8px;
	}

	.calc-field {
		@include calc-field;

		label {
			width: 120px;
		}
	}

	.calc-result {
		@include calc-result;
	}

	.calc-result-card {
		@include calc-result-card;
		padding: 10px 12px;

		.calc-result-inner {
			min-height: auto;
		}

		strong {
			color: var(--calc-muted);
			font-weight: 500;
			font-size: 11px;
		}
	}

	.columns {
		display: flex;
		gap: 16px;
		height: 320px;
	}

	.left {
		width: 240px;
		flex: 0 0 240px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		background: var(--calc-card);
		border-radius: 8px;
		padding: 12px;
	}

	.left .calc-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.left .calc-field {
		font-size: 12px;
		padding: 4px 0;
	}

	.left label {
		width: 100px;
		font-size: 12px;
		color: var(--calc-muted);
		font-weight: 500;
	}

	.left .calc-field>div {
		font-weight: 600;
		color: var(--calc-text);
	}

	.right {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		min-width: 0;
		/* 防止表格撑开容器 */
	}

	/* 覆盖 calc-result mixin 的设置 */
	.right .calc-result {
		margin-top: 0;
		height: auto;
	}

	.button-group {
		margin-top: auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--calc-border);
	}

	.refresh-btn,
	.apply-btn {
		padding: 10px 12px;
		border: none;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;

		&:hover:not(:disabled) {
			transform: translateY(-1px);
		}

		&:active:not(:disabled) {
			transform: translateY(0);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&:focus-visible {
			outline: none;
			box-shadow: var(--calc-focus-ring);
		}
	}

	.refresh-btn {
		@include calc-button-secondary;
	}

	.apply-btn {
		@include calc-button-primary;
		color: white !important;

		&:hover:not(:disabled) {
			/* ensure stronger hover for apply */
			background: #3b82f6;
			box-shadow: var(--calc-btn-shadow);
		}

		&:disabled {
			background: var(--calc-muted);
		}
	}

	.dup-note {
		margin-top: 12px;
		font-size: 12px;
		color: var(--calc-muted);
		padding: 8px 12px 0 0;
	}
}
</style>

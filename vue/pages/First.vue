<template>
    <div class="page-root">
        <div class="grid">
            <section class="cell top-left">
                <h3>颜色</h3>
                <ColorPalette :colors="availableColors" />
            </section>

            <section class="cell top-right">
                <h3>自定义颜色</h3>
                <CustomColors :colors="userColors" :max="MAX_USER_COLORS" />
            </section>

            <section class="cell bottom-left">
                <h3>网络类</h3>
                <NetworkList :pairs="networkClasses" :userColors="userColors" @request-edit="onRequestEdit" />
            </section>

            <section class="cell bottom-right">
                <h3>等长对</h3>
                <EqualLengthList :pairs="equalLengthPairs" @request-edit="onRequestEditEqual" />
            </section>
        </div>

        <footer class="footer">
            <ButtonsPanel @refresh="onRefresh" @on-help="onHelp" @on-random="onRandom" @sync="onSync" @apply="onApply"
                @cancel="onCancel" />
        </footer>

        <ColorDialog v-model:modelValue="dialogVisible" :initialColor="dialogInitialColor"
            :availableColors="availableColors" :userColors="userColors" @confirm="onDialogConfirm"
            @close="onDialogClose" />

        <RandomAssignDialog v-model:modelValue="randomDialogVisible" :availableColors="availableColors"
            :userColors="userColors" :networkClasses="networkClasses" :equalLengthPairs="equalLengthPairs"
            @confirm="onRandomConfirm" />

        <SimpleDialog v-model:modelValue="helpDialogVisible" title="使用说明" :message="message" @confirm="onHelpConfirm" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import ColorPalette from '../components/ColorPalette.vue';
import CustomColors from '../components/CustomColors.vue';
import NetworkList from '../components/NetworkList.vue';
import EqualLengthList from '../components/EqualLengthList.vue';
import ButtonsPanel from '../components/ButtonsPanel.vue';
import { isEDA } from '../utils/utils';
import ColorDialog from '../components/ColorDialog.vue';
import RandomAssignDialog from '../components/RandomAssignDialog.vue';
import SimpleDialog from '../components/SimpleDialog.vue';
import { ColorRGBA, hexToColor, rgbToHex, UserColorMap } from '../utils/color';

const loading = ref(false);

// 固定预设颜色（不可改）
const availableColors = computed<ColorRGBA[]>(() => {
    const hexes = [
        '#1f2937', '#374151', '#6b7280', '#9ca3af', '#ffffff',
        '#ef4444', '#f97316', '#f59e0b', '#facc15', '#84cc16',
        '#22c55e', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#ec4899', '#db2777', '#d946ef', '#000000',
    ];
    return hexes.map((h) => hexToColor(h));
});

const MAX_USER_COLORS = computed(() => availableColors.value.length);
const userColors = ref<UserColorMap>({});
// 差分对与等长对仍为空（按需实现）
const networkClasses = ref<IPCB_NetClassItem[]>([]);

const equalLengthPairs = ref<IPCB_EqualLengthNetGroupItem[]>([]);

// Dialog state
const dialogVisible = ref(false);
const dialogTarget = ref<any | null>(null);
const dialogTargetIndex = ref<number | null>(null);
const dialogTargetType = ref<'network' | 'equal' | null>(null);
const dialogInitialColor = ref<ColorRGBA | null>(null);

const randomDialogVisible = ref(false);
const helpDialogVisible = ref(false);

const message = ref(`### 按钮说明：
- 随机分配颜色：根据当前颜色池随机为网络/等长对分配颜色。 
- 将差分对同步到等长对：由于目前差分对无法使用插件分配颜色，退而求其次可以将其转换成等长对设置颜色。
- 应用到PCB：将当前颜色写回 EDA PCB（会覆盖对应类/组的颜色，请谨慎操作）。
---
**注意**：由于嘉立创EDA的BUG，设置的颜色会有偏差，以及应用到PCB后显示颜色会变成白的，需要重启EDA。
`);


function onUpdateNetworkClassColor(p: IPCB_NetClassItem, color: any) {
    const idx = networkClasses.value.findIndex(x => x && x.name === p.name);
    if (idx >= 0) {
        networkClasses.value[idx] = { ...networkClasses.value[idx], color } as IPCB_NetClassItem;
    }
}

function onRequestEdit(p: IPCB_NetClassItem, idx: number) {
    dialogTarget.value = p;
    dialogTargetIndex.value = idx;
    dialogInitialColor.value = p.color as ColorRGBA;
    dialogTargetType.value = 'network';
    dialogVisible.value = true;
}

function onRequestEditEqual(p: IPCB_EqualLengthNetGroupItem, idx: number) {
    dialogTarget.value = p;
    dialogTargetIndex.value = idx;
    dialogInitialColor.value = p.color as ColorRGBA;
    dialogTargetType.value = 'equal';
    dialogVisible.value = true;
}

function onDialogClose() {
    dialogVisible.value = false;
    dialogTarget.value = null;
    dialogTargetIndex.value = null;
    dialogInitialColor.value = null;
    dialogTargetType.value = null;
}

function onDialogConfirm(selected: ColorRGBA) {
    if (!dialogTarget.value) return;
    if (dialogTargetType.value === 'network') {
        onUpdateNetworkClassColor(dialogTarget.value, selected);
    } else if (dialogTargetType.value === 'equal') {
        // update equalLengthPairs array
        const idx = dialogTargetIndex.value;
        if (idx !== null && idx >= 0 && idx < equalLengthPairs.value.length) {
            equalLengthPairs.value[idx] = { ...equalLengthPairs.value[idx], color: selected } as IPCB_EqualLengthNetGroupItem;
        } else {
            // fallback: find by name
            const i = equalLengthPairs.value.findIndex(x => x && x.name === dialogTarget.value.name);
            if (i >= 0) equalLengthPairs.value[i] = { ...equalLengthPairs.value[i], color: selected } as IPCB_EqualLengthNetGroupItem;
        }
    }
    onDialogClose();
}

async function onRefresh() {
    networkClasses.value = [];
    equalLengthPairs.value = [];
    userColors.value = {};

    if (isEDA) {
        loading.value = true;
        networkClasses.value = await eda.pcb_Drc.getAllNetClasses();
        equalLengthPairs.value = await eda.pcb_Drc.getAllEqualLengthNetGroups();
        console.log(equalLengthPairs.value);
        // console.log('Loaded network classes and equal length pairs from EDA:', networkClasses.value, equalLengthPairs.value);
        // console.log('length', networkClasses.value.length, equalLengthPairs.value.length);

        const allConfigs = eda.sys_Storage.getExtensionAllUserConfigs();
        console.log('Loaded all extension user configs from EDA storage:', allConfigs);
        if (allConfigs['userColors']) {
            try {
                userColors.value = JSON.parse(allConfigs['userColors']) as UserColorMap;
            } catch (e) {
                console.error('Failed to parse user colors from EDA storage:', e);
            }
        }
        loading.value = false;
    } else {
        // inject mock data for local testing when not running inside EDA
        const mockNetworkClasses = [
            { name: '334_3', nets: ['334_3_DP', '334_3_DM'], color: hexToColor('#fa0000') },
            { name: '334_2', nets: ['334_2_DP', '334_2_DM'], color: hexToColor('#6be0ff') },
            { name: '334_UP', nets: ['334_UP_DP', '334_UP_DM'], color: hexToColor('#6bff8e') },
            { name: '334_1', nets: ['334_1_DP', '334_1_DM'], color: hexToColor('#ffd76b') },
            { name: 'F', nets: ['F_DP', 'F_DM'], color: hexToColor('#ff6b6b') },
        ];

        const mockEqualLength: IPCB_EqualLengthNetGroupItem[] = [
            { name: '334_3_DIFP', nets: ['334_3_DP', '334_3_DM'], color: hexToColor('#fa0000') },
            { name: '334_2_DIFP', nets: ['334_2_DP', '334_2_DM'], color: hexToColor('#6be0ff') },
            { name: '334_UP_DIFP', nets: ['334_UP_DP', '334_UP_DM'], color: hexToColor('#6bff8e') },
            { name: '334_1_DIFP', nets: ['334_1_DP', '334_1_DM'], color: hexToColor('#ffd76b') },
            { name: 'F_DIFP', nets: ['F_DP', 'F_DM'], color: hexToColor('#ff6b6b') },
        ];

        networkClasses.value = mockNetworkClasses as IPCB_NetClassItem[];
        equalLengthPairs.value = mockEqualLength as IPCB_EqualLengthNetGroupItem[];

        const data = localStorage.getItem('userColors');
        if (data) {
            try {
                userColors.value = JSON.parse(data) as UserColorMap;
            } catch (e) {
                console.error('Failed to parse user colors from localStorage:', e);
            }
        }
    }
}

function onRandom() {
    // 打开随机分配对话框
    randomDialogVisible.value = true;
}

function onHelp() {
    helpDialogVisible.value = true;
}

function onHelpConfirm() {
    helpDialogVisible.value = false;
}

function onRandomConfirm(assignments: Array<{ type: 'network' | 'equal'; name: string; color: ColorRGBA }>) {
    // apply assignments to networkClasses and equalLengthPairs
    for (const a of assignments) {
        if (a.type === 'network') {
            const idx = networkClasses.value.findIndex(x => x && x.name === a.name);
            if (idx >= 0) networkClasses.value[idx] = { ...networkClasses.value[idx], color: a.color } as IPCB_NetClassItem;
        } else if (a.type === 'equal') {
            const idx = equalLengthPairs.value.findIndex(x => x && x.name === a.name);
            if (idx >= 0) equalLengthPairs.value[idx] = { ...equalLengthPairs.value[idx], color: a.color } as IPCB_EqualLengthNetGroupItem;
        }
    }
    randomDialogVisible.value = false
}


async function onSync() {
    if (isEDA) {
        loading.value = true
        const equalGroups = await eda.pcb_Drc.getAllEqualLengthNetGroups();
        // iterate over a shallow copy to avoid mutating the array while iterating
        for (const group of [...equalGroups]) {
            if (group.name.endsWith('_DIFP')) {
                const idx = equalGroups.findIndex(g => g && g.name === group.name);
                if (idx >= 0) equalGroups.splice(idx, 1);
                eda.pcb_Drc.deleteEqualLengthNetGroup(group.name);
            }
        }

        const differentialPairs = await eda.pcb_Drc.getAllDifferentialPairs();
        differentialPairs.forEach((pair) => {
            if (equalGroups.some(g => g && g.nets && (
                (pair.positiveNet && g.nets.includes(pair.positiveNet)) ||
                (pair.negativeNet && g.nets.includes(pair.negativeNet))
            ))) {
                return;
            }
            if (pair.negativeNet)
                eda.pcb_Drc.createEqualLengthNetGroup(`${pair.name}_DIFP`, [pair.positiveNet, pair.negativeNet], null);
        });
        loading.value = false;
        onRefresh();
    }
}

async function onApply() {
    if (isEDA) {
        loading.value = true;
        try {
            // apply network class colors — ensure we pass plain JS values (not Vue proxies)
            for (const nc of networkClasses.value) {
                const name = String(nc.name);
                const nets = Array.isArray(nc.nets) ? nc.nets.map((n: any) => String(n)) : [];
                const color = nc.color ? { r: nc.color.r, g: nc.color.g, b: nc.color.b, alpha: nc.color.alpha } : null;
                const safeNets = JSON.parse(JSON.stringify(nets));
                const safeColor = color ? JSON.parse(JSON.stringify(color)) : null;
                await eda.pcb_Drc.deleteNetClass(name);
                console.log('rgb:', safeColor, " hex:", rgbToHex(safeColor));
                await eda.pcb_Drc.createNetClass(name, safeNets, safeColor);
            }

            // apply equal length group colors
            for (const elg of equalLengthPairs.value) {
                const name = String(elg.name);
                const nets = Array.isArray(elg.nets) ? elg.nets.map((n: any) => String(n)) : [];
                const color = elg.color ? { r: elg.color.r, g: elg.color.g, b: elg.color.b, alpha: elg.color.alpha } : null;
                const safeNets = JSON.parse(JSON.stringify(nets));
                const safeColor = color ? JSON.parse(JSON.stringify(color)) : null;
                await eda.pcb_Drc.deleteEqualLengthNetGroup(name);
                console.log('rgb:', safeColor, " hex:", rgbToHex(safeColor));
                await eda.pcb_Drc.createEqualLengthNetGroup(name, safeNets, safeColor);
            }

            await onRefresh();
        } catch (e) {
            console.error('Failed to apply classes/groups to EDA:', e);
        } finally {
            loading.value = false;
        }
    }
}

function onCancel() {
    if (isEDA) eda.sys_IFrame.closeIFrame(undefined);
}


onMounted(async () => {
    await onRefresh();
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

const DEBOUNCE_MS = 100;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

watch(userColors, (newVal) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        const data = JSON.stringify(newVal);
        if (isEDA) {
            await eda.sys_Storage.setExtensionAllUserConfigs({ ...eda.sys_Storage.getExtensionAllUserConfigs(), userColors: data });
        } else {
            localStorage.setItem('userColors', data);
        }
        saveTimer = null;
    }, DEBOUNCE_MS);
}, { deep: true });

</script>

<style scoped lang="scss">
@use '../styles/calculator-mixins.scss' as *;

.page-root {
    @include calculator-base;
    padding: 12px;
    box-shadow: var(--calc-shadow);
    max-width: 700px;
    width: 100%;
    box-sizing: border-box;
    background: var(--calc-card, #fff);
    color: var(--calc-text, #111);
}

.grid {
    display: grid;
    grid-template-rows: auto auto;
    grid-auto-rows: min-content;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    align-items: start;
}

.cell {
    padding: 8px;
    border: 1px solid var(--calc-border, #eee);
    border-radius: 6px;
    overflow: visible;
    background: transparent;
    display: flex;
    flex-direction: column;
}

.cell h3 {
    font-size: 13px;
    margin: 0 0 6px 0;
}

.footer {
    padding-top: 8px;
}

.bottom-left,
.bottom-right {
    height: 180px;
}

/* allow the inner component to stretch and enable its internal scrolling */
.cell>*:last-child {
    flex: 1 1 auto;
    min-height: 0;
}
</style>

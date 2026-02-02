<template>
    <div class="page-root">
        <div class="grid">
            <section class="cell top-left">
                <h3>固定颜色</h3>
                <ColorPalette :colors="availableColors" />
            </section>

            <section class="cell top-right">
                <h3>自定义颜色</h3>
                <CustomColors :colors="userColors" :max="MAX_USER_COLORS" @add="onAddUserColor" @edit="onEditUserColor"
                    @delete="onDeleteUserColor" />
            </section>

            <section class="cell bottom-left">
                <h3>网络类</h3>
                <NetworkList :pairs="networkClasses" :availableColors="availableColors" :userColors="userColors"
                    @request-edit="onRequestEdit" />
            </section>

            <section class="cell bottom-right">
                <h3>等长对</h3>
                <EqualLengthList :pairs="equalLengthPairs" @request-edit="onRequestEditEqual" />
            </section>
        </div>

        <footer class="footer">
            <ButtonsPanel @refresh="onRefresh" @on-random-assign="onRandomAssign"
                @on-random-assign-equal-length="onRandomAssignEqualLength" @sync="onSync" @apply="onApply"
                @cancel="onCancel" />
        </footer>

        <ColorDialog v-model:modelValue="dialogVisible" :initialColor="dialogInitialColor"
            :availableColors="availableColors" :userColors="userColors" @confirm="onDialogConfirm"
            @close="onDialogClose" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import ColorPalette from '../components/ColorPalette.vue';
import CustomColors from '../components/CustomColors.vue';
import NetworkList from '../components/NetworkList.vue';
import EqualLengthList from '../components/EqualLengthList.vue';
import ButtonsPanel from '../components/ButtonsPanel.vue';
import { hexToColor, isEDA } from '../utils/utils';
import ColorDialog from '../components/ColorDialog.vue';
import normalizeColor, { toEdaColor, ColorItem } from '../utils/color';

const loading = ref(false);

// 固定预设颜色（不可改）
const availableColors = computed<ColorItem[]>(() => {
    const hexes = [
        '#2d2d2d', '#6b6b6b', '#bfbfbf', '#ffffff', '#ff6b6b', '#ff8c66', '#ffb86b',
        '#ffd76b', '#d9ff6b', '#aaff6b', '#6bff8e', '#6be0ff', '#6bafff', '#9a6bff',
        '#ff6bff', '#ffc0cb', '#000000', '#444444', '#888888', '#007fff',
    ];
    return hexes.map((h, i) => ({ id: `preset-${i}`, hex: h }));
});

// 用户自定义颜色（可增删，受限数量）——上限与固定预设颜色数量相同
const MAX_USER_COLORS = computed(() => availableColors.value.length);
const userColors = ref<Array<ColorItem | undefined>>(Array.from({ length: MAX_USER_COLORS.value }).map(() => undefined));
// 差分对与等长对仍为空（按需实现）
const networkClasses = ref<IPCB_NetClassItem[]>([]);

const equalLengthPairs = ref<IPCB_EqualLengthNetGroupItem[]>([]);

// Dialog state
const dialogVisible = ref(false);
const dialogTarget = ref<any | null>(null);
const dialogTargetIndex = ref<number | null>(null);
const dialogTargetType = ref<'network' | 'equal' | null>(null);
const dialogInitialColor = ref<ColorItem | null>(null);

function onAddUserColor(c: ColorItem, idx: number) {
    if (idx < 0 || idx >= MAX_USER_COLORS.value) return;
    // place color at the given slot index
    userColors.value[idx] = c;
}

function onEditUserColor(c: ColorItem, idx: number) {
    if (idx < 0 || idx >= MAX_USER_COLORS.value) return;
    userColors.value[idx] = c;
}

function onDeleteUserColor(id: string) {
    const idx = userColors.value.findIndex(x => x && x.id === id);
    if (idx >= 0) {
        // clear the slot (keep array length and indices)
        userColors.value[idx] = undefined;
    }
}

function onUpdateNetworkClassColor(p: IPCB_NetClassItem, color: any) {
    const idx = networkClasses.value.findIndex(x => x && x.name === p.name);
    if (idx >= 0) {
        networkClasses.value[idx] = { ...networkClasses.value[idx], color } as IPCB_NetClassItem;
    }
}

function onRequestEdit(p: IPCB_NetClassItem, idx: number) {
    dialogTarget.value = p;
    dialogTargetIndex.value = idx;
    dialogInitialColor.value = normalizeColor(p.color);
    dialogTargetType.value = 'network';
    dialogVisible.value = true;
}

function onRequestEditEqual(p: IPCB_EqualLengthNetGroupItem, idx: number) {
    dialogTarget.value = p;
    dialogTargetIndex.value = idx;
    dialogInitialColor.value = normalizeColor(p.color);
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

function onDialogConfirm(selected: ColorItem) {
    if (!dialogTarget.value) return;
    const edaColor = toEdaColor(selected.hex);
    if (dialogTargetType.value === 'network') {
        onUpdateNetworkClassColor(dialogTarget.value, edaColor);
    } else if (dialogTargetType.value === 'equal') {
        // update equalLengthPairs array
        const idx = dialogTargetIndex.value;
        if (idx !== null && idx >= 0 && idx < equalLengthPairs.value.length) {
            equalLengthPairs.value[idx] = { ...equalLengthPairs.value[idx], color: edaColor } as IPCB_EqualLengthNetGroupItem;
        } else {
            // fallback: find by name
            const i = equalLengthPairs.value.findIndex(x => x && x.name === dialogTarget.value.name);
            if (i >= 0) equalLengthPairs.value[i] = { ...equalLengthPairs.value[i], color: edaColor } as IPCB_EqualLengthNetGroupItem;
        }
    }
    onDialogClose();
}

async function onRefresh() {
    if (isEDA) {
        networkClasses.value = await eda.pcb_Drc.getAllNetClasses();
        equalLengthPairs.value = await eda.pcb_Drc.getAllEqualLengthNetGroups();
        console.log('Loaded network classes and equal length pairs from EDA:', networkClasses.value, equalLengthPairs.value);
        console.log('length', networkClasses.value.length, equalLengthPairs.value.length);
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
    }
}

function onRandomAssign() {
}

function onRandomAssignEqualLength() {
}

function onSync() {
    // 同步
}

function onApply() {
    // 应用
}

function onCancel() {
    // 取消
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

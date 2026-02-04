<template>
    <div v-if="modelValue" class="picker-overlay" @click.self="onClose">
        <div class="picker-dialog" role="dialog" aria-modal="true">
            <div class="picker-section">
                <div class="picker-title">为哪些分配颜色</div>
                <div class="targets">
                    <div class="target-group">
                        <label><input type="checkbox" v-model="selectAllNetworks" /> 全选 网络类</label>
                        <div class="target-list">
                            <label v-for="(item, idx) in networkClasses" :key="item.name" class="target-item">
                                <input type="checkbox" :value="item.name" v-model="selectedNetworks" />
                                <span class="target-name">{{ item.name }}</span>
                            </label>
                        </div>
                    </div>

                    <div class="target-group">
                        <label><input type="checkbox" v-model="selectAllEquals" /> 全选 等长对</label>
                        <div class="target-list">
                            <label v-for="(item, idx) in equalLengthPairs" :key="item.name" class="target-item">
                                <input type="checkbox" :value="item.name" v-model="selectedEquals" />
                                <span class="target-name">{{ item.name }}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="picker-section">
                <div class="picker-title">从哪些颜色中分配</div>
                <div class="source-options">
                    <label><input type="checkbox" value="available" v-model="selectedSources" /> 固定颜色</label>
                    <label><input type="checkbox" value="user" v-model="selectedSources" /> 自定义颜色</label>
                </div>
            </div>

            <div class="picker-section">
                <div class="picker-title">预览与操作</div>
                <div class="preview-assignments">
                    <div v-for="a in previewAssignments" :key="a.key" class="preview-item">
                        <div class="preview-name">{{ a.display }}</div>
                        <div class="preview-color" :style="{ background: colorToCssRGBA(a.color) }"></div>
                    </div>
                    <div v-if="previewAssignments.length === 0" class="muted">尚未生成分配</div>
                </div>

                <div class="actions">
                    <button class="secondary" @click="onClose">取消</button>
                    <button class="secondary" @click="generateRandom" :disabled="!hasSelection">随机分配</button>
                    <button class="primary" @click="onConfirm" :disabled="previewAssignments.length === 0">确认应用</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ColorRGBA, colorToCssRGBA } from '../utils/color';

const props = defineProps<{
    modelValue: boolean;
    availableColors?: ColorRGBA[];
    userColors?: Record<number, ColorRGBA> | undefined;
    networkClasses?: Array<{ name: string, color?: any }>;
    equalLengthPairs?: Array<{ name: string, color?: any }>;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
    (e: 'confirm', assignments: Array<{ type: 'network' | 'equal', name: string, color: ColorRGBA }>): void;
    (e: 'close'): void;
}>();

const selectedNetworks = ref<string[]>([]);
const selectedEquals = ref<string[]>([]);
const selectAllNetworks = ref(false);
const selectAllEquals = ref(false);
const selectedSources = ref<string[]>(['user']);

watch(selectAllNetworks, (v) => {
    if (v && props.networkClasses) selectedNetworks.value = props.networkClasses.map(x => x.name);
    if (!v) selectedNetworks.value = [];
});
watch(selectAllEquals, (v) => {
    if (v && props.equalLengthPairs) selectedEquals.value = props.equalLengthPairs.map(x => x.name);
    if (!v) selectedEquals.value = [];
});

const availableColors = computed(() => props.availableColors ?? [] as ColorRGBA[]);
const userColors = computed(() => props.userColors ?? {} as Record<number, ColorRGBA>);
const userSwatches = computed(() => Object.entries(userColors.value).map(([k, v]) => ({ idx: Number(k), color: v })));

const previewAssignments = ref<Array<{ key: string, display: string, color: ColorRGBA, type: 'network' | 'equal', name: string }>>([]);

const hasSelection = computed(() => selectedNetworks.value.length > 0 || selectedEquals.value.length > 0);

function onClose() {
    emit('update:modelValue', false);
    emit('close');
}

function shuffleArray<T>(arr: T[]) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateRandom() {
    const pool: ColorRGBA[] = [];
    if (selectedSources.value.includes('available')) pool.push(...availableColors.value.slice());
    if (selectedSources.value.includes('user')) pool.push(...userSwatches.value.map(s => s.color));
    if (pool.length === 0) {
        previewAssignments.value = [];
        return;
    }
    const items: Array<{ type: 'network' | 'equal', name: string }> = [];
    selectedNetworks.value.forEach(n => items.push({ type: 'network', name: n }));
    selectedEquals.value.forEach(n => items.push({ type: 'equal', name: n }));
    // allow repetition: sample with replacement
    const assigns: Array<{ key: string, display: string, color: ColorRGBA, type: 'network' | 'equal', name: string }> = [];
    for (let i = 0; i < items.length; i++) {
        const randIdx = Math.floor(Math.random() * pool.length);
        const c = pool[randIdx];
        const it = items[i];
        assigns.push({ key: it.type + '|' + it.name, display: it.name, color: c as ColorRGBA, type: it.type, name: it.name });
    }
    previewAssignments.value = assigns;
}

function onConfirm() {
    const assignments = previewAssignments.value.map(a => ({ type: a.type, name: a.name, color: a.color }));
    emit('confirm', assignments);
    emit('update:modelValue', false);
}

const poolSize = computed(() => {
    let n = 0;
    if (selectedSources.value.includes('available')) n += availableColors.value.length;
    if (selectedSources.value.includes('user')) n += userSwatches.value.length;
    return n;
});

</script>

<style scoped lang="scss">
@use '../styles/calculator-mixins.scss' as *;

.picker-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.36);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200
}

.picker-dialog {
    width: 560px;
    max-width: calc(100% - 32px);
    overflow: auto;
    background: color-mix(in srgb, var(--calc-card) 92%, white 8%);
    border: 1px solid var(--calc-border);
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 8px 24px rgba(16, 24, 40, 0.12);
    transition: transform 150ms ease, box-shadow 150ms ease;
    @include calc-scrollbar;
}

.picker-section {
    margin-bottom: 8px
}

.picker-title {
    font-size: 11px;
    color: var(--calc-muted);
    margin-bottom: 6px;
}

.targets {
    display: flex;
    gap: 12px;
}

.target-group {
    flex: 1
}

.target-list {
    max-height: 80px;
    overflow: auto;
    border: 1px dashed transparent;
    padding: 4px;
    @include calc-scrollbar;
}

.target-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    transition: background-color 160ms ease, transform 120ms ease;
    cursor: pointer;
}

.target-item:hover {
    background: color-mix(in srgb, var(--calc-primary) 6%, transparent 94%);
}

.target-item:focus-within {
    outline: 2px solid color-mix(in srgb, var(--calc-primary) 30%, transparent 70%);
    outline-offset: 2px;
}

.target-preview {
    width: 20px;
    height: 16px;
    border: 1px solid var(--calc-border);
    border-radius: 3px
}

.swatches {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 6px
}

.swatch {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 1px solid var(--calc-border)
}

.muted {
    color: var(--calc-muted);
    font-size: 13px
}

.preview-assignments {
    max-height: 72px;
    overflow: auto;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    @include calc-scrollbar;
}

.preview-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--calc-border) 80%, transparent 20%);
    background: color-mix(in srgb, var(--calc-card) 98%, white 2%);
    transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
    cursor: default;
}

.preview-color {
    width: 20px;
    height: 16px;
    border: 1px solid var(--calc-border);
    border-radius: 3px
}

.preview-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--calc-border) 80%, transparent 20%);
    background: color-mix(in srgb, var(--calc-card) 98%, white 2%);
    transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
    cursor: default;
}


.actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 8px
}

.secondary {
    @include calc-button-secondary
}

.primary {
    @include calc-button-primary
}
</style>

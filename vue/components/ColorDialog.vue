<template>
    <div v-if="modelValue" class="picker-overlay" @click.self="onClose">
        <div class="picker-dialog" role="dialog" aria-modal="true">
            <div class="picker-section">
                <div class="picker-title">{{ title || '选择颜色' }}</div>
                <ColorPalette :colors="availableColors" @select="onPick" />
            </div>

            <div class="picker-section" v-if="userSwatches.length > 0">
                <div class="picker-title">自定义颜色</div>
                <div class="user-swatches">
                    <div v-for="uc in userSwatches" :key="uc.idx" class="color-item user-swatch"
                        :class="{ selected: selectedColor && rgbToHex(selectedColor) === rgbToHex(uc.color) }"
                        :style="{ background: colorToCssRGBA(uc.color) }" @click="() => onPick(uc.color)"></div>
                </div>
            </div>

            <div class="picker-section">
                <div class="picker-title">其它</div>
                <input type="color" class="native-input" :value="selectedColor ? rgbToHex(selectedColor) : undefined"
                    @input="onNative" />
            </div>


            <div style="font-size: 14px;">颜色预览</div>
            <div class="actions">
                <div class="preview" v-if="selectedColor" :style="{ background: colorToCssRGBA(selectedColor) }">
                </div>
                <button class="secondary" @click="onClose">取消</button>
                <button class="primary" @click="onConfirm" :disabled="!selectedColor">确认</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ColorPalette from './ColorPalette.vue';
import { ColorRGBA, rgbToHex, colorToCssRGBA, hexToColor } from '../utils/color';

const props = defineProps<{
    modelValue: boolean;
    initialColor: ColorRGBA | null;
    availableColors?: ColorRGBA[];
    userColors?: Record<number, ColorRGBA> | undefined;
    title?: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
    (e: 'close'): void;
    (e: 'confirm', selected: ColorRGBA): void;
    (e: 'preview', selected: ColorRGBA): void;
}>();

const selectedColor = ref<ColorRGBA | null>(props.initialColor);

watch(
    () => props.initialColor,
    (v) => {
        selectedColor.value = v;
    },
);

const availableColors = computed(() => props.availableColors ?? [] as ColorRGBA[]);
const userColors = computed(() => props.userColors ?? {} as Record<number, ColorRGBA>);
const userSwatches = computed(() => Object.entries(userColors.value).map(([k, v]) => ({ idx: Number(k), color: v })));

function onPick(c: ColorRGBA) {
    selectedColor.value = c;
    emit('preview', selectedColor.value as ColorRGBA);
}

function onNative(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    if (!v) return;
    selectedColor.value = hexToColor(v);
    emit('preview', selectedColor.value as ColorRGBA);
}

function onClose() {
    emit('update:modelValue', false);
    emit('close');
}

function onConfirm() {
    if (!selectedColor.value) return;
    emit('confirm', selectedColor.value);
    emit('update:modelValue', false);
}
</script>

<style scoped lang="scss">
@use '../styles/calculator-mixins.scss' as *;

.picker-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.36);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
}

.picker-dialog {
    width: 420px;
    max-width: calc(100% - 32px);
    background: var(--calc-card);
    border: 1px solid var(--calc-border);
    border-radius: 8px;
    padding: 12px;
    box-shadow: var(--calc-shadow);
}

.picker-section {
    margin-bottom: 8px;
}

.picker-title {
    font-size: 12px;
    color: var(--calc-muted);
    margin-bottom: 6px;
}

.user-swatches {
    display: flex;
    gap: 6px;
    flex-wrap: wrap
}

.color-item {
    width: 24px;
    height: 24px;
    border-radius: 3px;
    border: 1px solid var(--calc-border);
    cursor: pointer
}

.user-swatch.selected {
    outline: 2px solid var(--calc-primary);
    outline-offset: 1px
}

.native-input {
    width: 36px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent
}

.actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    align-items: center
}

.preview {
    width: 24px;
    height: 24px;
    border-radius: 3px;
    border: 1px solid var(--calc-border);
    margin-right: auto
}

.secondary {
    @include calc-button-secondary;
}

.primary {
    @include calc-button-primary;
}
</style>

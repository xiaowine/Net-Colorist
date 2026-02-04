<template>
    <div v-if="modelValue" class="picker-overlay" @click.self="onClose">
        <div class="picker-dialog" role="dialog" aria-modal="true">
            <div class="title">{{ title }}</div>
            <div class="message" v-html="htmlMessage"></div>
            <div class="actions">
                <button class="btn btn-primary" @click="onConfirm">确定</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import mdToHtml from '../utils/markdown';

const props = defineProps<{
    modelValue: boolean;
    title?: string;
    message?: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
    (e: 'confirm'): void;
}>();

const title = computed(() => props.title ?? '提示');
const message = computed(() => props.message ?? '这是一个简单的对话，用于显示说明文字。');
const htmlMessage = computed(() => mdToHtml(message.value));

function onClose() {
    emit('update:modelValue', false);
}

function onConfirm() {
    emit('confirm');
    emit('update:modelValue', false);
}
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
    z-index: 1200;
}

.picker-dialog {
    width: 420px;
    max-width: calc(100% - 32px);
    overflow: auto;
    background: color-mix(in srgb, var(--calc-card) 92%, white 8%);
    border: 1px solid var(--calc-border);
    border-radius: 10px;
    padding: 12px 16px;
    box-shadow: 0 8px 24px rgba(16, 24, 40, 0.12);
    transition: transform 150ms ease, box-shadow 150ms ease;
}

.title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--calc-text);
}

.message {
    font-size: 13px;
    color: var(--calc-muted);
    margin-bottom: 12px;
}

.actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.btn {
    @include calc-button-secondary;
}

.btn-primary {
    @include calc-button-primary;
}
</style>

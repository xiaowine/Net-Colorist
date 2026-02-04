<template>
    <div class="buttons-panel">
        <button class="primary" @click="onRefresh">🗘刷新</button>
        <button class="secondary" @click="onHelp">使用说明</button>
        <button class="primary" @click="onRandom">随机分配颜色</button>
        <button class="secondary" @click="onSync">将差分对同步到等长对</button>
        <button class="primary" @click="onApply">应用到PCB</button>
        <button class="secondary" @click="onCancel">关闭窗口</button>
    </div>
</template>

<script setup lang="ts">


const emit = defineEmits<{
    (e: 'refresh'): void
    (e: 'onHelp'): void
    (e: 'onRandom'): void
    (e: 'sync'): void
    (e: 'apply'): void
    (e: 'cancel'): void
}>();

function onRefresh() {
    emit('refresh');
}
function onHelp() {
    emit('onHelp');
}

function onRandom() {
    emit('onRandom');
}


function onSync() {
    emit('sync');
}

function onApply() {
    emit('apply');
}

function onCancel() {
    emit('cancel');
}
</script>

<style scoped lang="scss">
@use '../styles/calculator-mixins.scss' as *;

.buttons-panel {
    display: flex;
    gap: 8px;
    padding: 8px 0;

    button {
        padding: 6px 8px;
        border-radius: 5px;
        border: 1px solid var(--calc-border, #ccc);
        background: var(--calc-card, #fff);
        color: var(--calc-text, #111);
        cursor: pointer;
        transition: background 120ms ease, box-shadow 120ms ease, transform 120ms ease;

        &:hover:not(:disabled) {
            background: var(--calc-refresh-hover-bg, rgba(96, 165, 250, 0.08));
        }

        &:active {
            transform: translateY(1px);
        }
    }

    // 次要按钮
    .secondary {
        @include calc-button-secondary;
        padding: 6px 10px;
    }

    // 主操作按钮
    .primary {
        @include calc-button-primary;
        padding: 6px 12px;
    }
}
</style>

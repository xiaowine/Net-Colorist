<template>
  <div class="network-list">
    <div v-if="pairs.length === 0" class="empty">无网络类</div>
    <div class="list-body">
      <ul>
        <li v-for="(p, idx) in pairs" :key="p.name" tabindex="0">
          <div class="row">
            <button class="color-item color-swatch" :title="rgbToHex(p.color as ColorRGBA).toUpperCase()"
              :style="{ background: colorToCssRGBA((p.color as ColorRGBA) ?? transparentRgba) }"
              @click.stop="() => emit('request-edit', p, idx)"></button>
            <div class="content" @click="select(p)">
              <div class="name">{{ p.name }}</div>
              <div class="nets">共有{{ p.nets.length }}个网络</div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ColorRGBA, colorToCssRGBA, rgbToHex, transparentRgba } from '../utils/color';

const props = defineProps<{ pairs?: IPCB_NetClassItem[]; userColors?: Record<number, import('../utils/color').ColorRGBA> | undefined }>();
const emit = defineEmits<{
  (e: 'select', p: IPCB_NetClassItem): void;
  (e: 'request-edit', p: IPCB_NetClassItem, idx: number): void;
}>();

const pairs = computed(() => props.pairs ?? [] as IPCB_NetClassItem[]);

function select(p: IPCB_NetClassItem) {
  emit('select', p);
}
</script>

<style scoped lang="scss">
@use '../styles/calculator-mixins.scss' as *;

.network-list {
  display: flex;
  flex-direction: column;
  height: 100%;

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    padding: 6px;
    border-bottom: 1px solid var(--calc-border, #eee);
    cursor: pointer;
  }

  .name {
    font-weight: 600;
    font-size: 13px;
    color: var(--calc-text, #111);
  }

  .nets {
    font-size: 11px;
    color: var(--calc-muted, #666);
  }
}

.empty {
  color: var(--calc-muted, #888);
  padding: 8px;
}

/* 可滚动容器 */
.list-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  border-radius: 4px;
}

.list-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  border-radius: 4px;
  @include calc-scrollbar;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px
}

.color-swatch {
  border-radius: 3px;
  border: 1px solid var(--calc-border, #ccc);
  cursor: pointer
}

.content {
  flex: 1 1 auto
}

.color-item {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid var(--calc-border);
  cursor: pointer
}
</style>

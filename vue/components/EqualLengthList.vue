<template>
  <div class="equal-length-list">
    <div v-if="pairs.length === 0" class="empty">无等长对</div>
    <div class="list-body">
      <ul>
        <li v-for="(p, idx) in pairs" :key="p.name" tabindex="0">
          <div class="row">
            <button class="color-item color-swatch" :style="{ background: normalizeColor(p.color).hex }"
              @click.stop="() => emit('request-edit', p, idx)"></button>
            <div class="content" @click="select(p)">
              <div class="name">{{ p.name }}</div>
              <div class="nets">{{ p.nets ? p.nets.join(', ') : '' }}</div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import normalizeColor from '../utils/color';

type Pair = { id: string; name: string; nets: string[] };

const props = defineProps<{ pairs?: IPCB_EqualLengthNetGroupItem[] }>();
const emit = defineEmits<{
  (e: 'select', p: IPCB_EqualLengthNetGroupItem): void;
  (e: 'request-edit', p: IPCB_EqualLengthNetGroupItem, idx: number): void;
}>();

const pairs = computed(() => props.pairs ?? [] as IPCB_EqualLengthNetGroupItem[]);

function select(p: IPCB_EqualLengthNetGroupItem) {
  emit('select', p);
}
</script>

<style scoped lang="scss">
@use '../styles/calculator-mixins.scss' as *;

.equal-length-list {
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

.list-body::-webkit-scrollbar {
  width: 8px;
}

.list-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 4px
}

@media (prefers-color-scheme: dark) {
  .list-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.06);
  }
}

.list-body::-webkit-scrollbar-track {
  background: transparent;
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

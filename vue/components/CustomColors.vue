<template>
  <div class="custom-colors">
    <div class="preset-list">
      <div v-for="i in max" :key="i" class="color-item slot" :class="{ empty: !slotColor(i - 1) }"
        :style="slotStyle(i - 1)" @click.stop="onSlotClick(i - 1)" role="button" tabindex="0">
        <button v-if="slotColor(i - 1)" class="delete" @click.stop="onDelete(i - 1)">✕</button>
        <input class="color-input" type="color" :ref="el => setInputRef(el, i - 1)"
          @input="onSlotInput($event, i - 1)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ColorItem } from '../utils/color';

const props = defineProps<{ colors?: (ColorItem | undefined)[]; max?: number }>();
const emit = defineEmits<{
  (e: 'add', color: ColorItem, idx: number): void
  (e: 'edit', color: ColorItem, idx: number): void
  (e: 'delete', id: string): void
}>();

// handle props.colors which may be an array or a ref to an array
const rawColors: any = props.colors;
const colorsArr = computed<ColorItem[]>(() => {
  if (!rawColors) return [];
  if (Array.isArray(rawColors)) return rawColors as ColorItem[];
  return rawColors.value ?? [];
});

const max = props.max && props.max > 0 ? props.max : 16;

// refs to hidden color inputs per slot
const inputRefs = ref<Array<HTMLInputElement | null>>(Array.from({ length: max }).map(() => null));

function setInputRef(el: any, idx: number) {
  inputRefs.value[idx] = el as HTMLInputElement | null;
}

function slotColor(idx: number) {
  return colorsArr.value[idx] ?? null;
}

function slotStyle(idx: number) {
  const c = slotColor(idx);
  if (c) return { background: c.hex };
  return { background: 'transparent', border: '1px dashed #ccc' };
}

function onSlotClick(idx: number) {
  const input = inputRefs.value[idx];
  if (!input) return;
  const c = slotColor(idx);
  input.value = c ? c.hex : '#ffffff';
  input.click();
}

function onSlotInput(e: Event, idx: number) {
  const v = (e.target as HTMLInputElement).value;
  if (!v) return;
  const existing = slotColor(idx);
  if (existing) {
    emit('edit', { ...existing, hex: v }, idx);
  } else {
    const item: ColorItem = { id: Date.now().toString(), hex: v };
    emit('add', item, idx);
  }
}

function onDelete(idx: number) {
  const c = slotColor(idx);
  if (!c) return;
  emit('delete', c.id);
}
</script>

<style scoped lang="scss">
.custom-colors {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swatch {
  width: 28px;
  height: 20px;
  border: 1px solid #ccc;
}

.hex {
  font-size: 12px;
}

.picker {
  margin-top: 8px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-item {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid #ccc;
  cursor: pointer;
  position: relative;
}

.color-item .color-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  z-index: 2;
}

.color-item.empty {
  background-image: linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee);
  background-size: 8px 8px;
  background-position: 0 0, 4px 4px;
}

.color-item .delete {
  position: absolute;
  top: -6px;
  right: -6px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  border-radius: 10px;
  width: 16px;
  height: 16px;
  line-height: 14px;
  font-size: 10px;
  cursor: pointer;
  z-index: 3;
}

.meta {
  font-size: 12px;
  color: #666;
}
</style>

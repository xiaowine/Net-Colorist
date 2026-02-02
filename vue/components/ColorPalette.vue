<template>
  <div class="color-palette">
    <div class="preset-list">
      <div v-for="c in colors" :key="c.id" class="color-item" :style="{ background: c.hex }" @click="selectColor(c)"
        role="button" tabindex="0"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ColorItem } from '../utils/color';

const props = defineProps<{ colors?: ColorItem[] }>();
const emit = defineEmits<{
  (e: 'select', color: ColorItem): void
}>();

const colors = props.colors || [];

function selectColor(c: ColorItem) {
  emit('select', c);
}
</script>

<style scoped lang="scss">
.color-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
}

.picker {
  max-width: 220px;
}
</style>

<template>
  <div class="color-palette">
    <div class="preset-list">
      <div v-for="(c, i) in colors" :title="rgbToHex(c).toUpperCase()" :key="i" class="color-item"
        :style="{ background: colorToCssRGBA(c) }" @click="selectColor(c)" role="button" tabindex="0"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { colorToCssRGBA, rgbToHex } from '../utils/color';

const props = defineProps<{ colors?: import('../utils/color').ColorRGBA[] }>();
const emit = defineEmits<{
  (e: 'select', color: import('../utils/color').ColorRGBA): void
}>();

const colors = props.colors || [] as import('../utils/color').ColorRGBA[];

function selectColor(c: import('../utils/color').ColorRGBA) {
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

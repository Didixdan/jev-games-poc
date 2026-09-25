<template>
  <div
    class="grid-wrap"
    :style="`display:grid; grid-template-columns: repeat(${cols}, ${cellSize}px)`"
  >
    <div
      v-for="(_, idx) in rows * cols"
      :key="idx"
      :class="cellClass(Math.floor(idx / cols), idx % cols)"
      :style="`width:${cellSize}px; height:${cellSize}px`"
    />
  </div>
</template>

<script setup>
defineProps({
  rows: { type: Number, required: true },
  cols: { type: Number, required: true },
  cellSize: { type: Number, default: 22 },
  cellClass: { type: Function, required: true },
})
</script>

<style scoped>
@reference "tailwindcss";
.grid-wrap {
  @apply border border-gray-800 rounded-lg overflow-hidden;
}
</style>

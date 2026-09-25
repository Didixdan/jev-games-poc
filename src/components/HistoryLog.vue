<template>
  <div class="history">
    <div v-for="(entry, i) in entries" :key="i" class="entry">
      <span class="ts">{{ entry.ts }}</span>
      <span class="label" :class="entry.labelClass">{{ entry.label }}</span>
      <span class="conf">{{ (entry.confidence * 100).toFixed(0) }}%</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  entries: { type: Array, default: () => [] },
})
</script>

<style scoped>
@reference "tailwindcss";
.history {
  @apply flex flex-col gap-1 overflow-y-auto;
  max-height: 200px;
  scrollbar-width: thin;
  scrollbar-color: #374151 transparent;
}
.entry { @apply flex items-center justify-between text-xs font-mono py-0.5 border-b border-gray-800; }
.ts    { @apply text-gray-500; }
.label { @apply px-2 py-0.5 rounded; }
.conf  { @apply text-gray-500; }
</style>

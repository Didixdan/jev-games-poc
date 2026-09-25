<template>
  <div class="panel">
    <div class="card">
      <div class="card-header">
        <span class="section-label">JEV Answer</span>
        <span class="latency">{{ answer ? answer.latency + 'ms' : '—' }}</span>
      </div>

      <div class="choice-row">
        <span class="choice-prefix">Choice:</span>
        <span v-if="answer" class="badge">{{ answer.choice }}</span>
        <span v-else class="empty">—</span>
      </div>

      <div class="probs">
        <template v-if="answer">
          <div v-for="[label, pct] in sortedProbs" :key="label" class="prob-row">
            <span class="prob-label" :class="label === answer.choice ? 'active' : ''">{{ label }}</span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :class="label === answer.choice ? 'chosen' : 'unchosen'"
                :style="{ width: (pct * 100).toFixed(1) + '%' }"
              />
            </div>
            <span class="prob-pct" :class="label === answer.choice ? 'active' : ''">
              {{ (pct * 100).toFixed(1) }}%
            </span>
          </div>
        </template>
        <p v-else class="waiting">Waiting for first move…</p>
      </div>

      <div class="confidence">
        <div class="conf-header">
          <span>Confidence</span>
          <span class="conf-value">{{ answer ? (answer.confidence * 100).toFixed(1) + '%' : '—' }}</span>
        </div>
        <div class="bar-track">
          <div
            class="bar-fill"
            :class="confBarClass"
            :style="{ width: answer ? (answer.confidence * 100) + '%' : '0%' }"
          />
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="section-label">State sent to JEV</span>
        <button @click="copyPrompt" class="copy-btn" :class="{ copied }">
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
      <pre class="state-preview">{{ answer ? answer.gridPreview : '—' }}</pre>
    </div>

    <div class="card">
      <span class="section-label mb-3 block">History</span>
      <HistoryLog :entries="history" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import HistoryLog from './HistoryLog.vue'

const props = defineProps({
  answer: { type: Object, default: null },
  history: { type: Array, default: () => [] },
})

const copied = ref(false)

const sortedProbs = computed(() =>
  props.answer?.probabilities
    ? Object.entries(props.answer.probabilities).sort((a, b) => b[1] - a[1])
    : []
)

const confBarClass = computed(() => {
  if (!props.answer) return 'bg-gray-700'
  const c = props.answer.confidence
  return c > 0.7 ? 'chosen' : c > 0.4 ? 'warn' : 'danger'
})

function copyPrompt() {
  if (!props.answer?.fullPrompt) return
  navigator.clipboard.writeText(props.answer.fullPrompt).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}
</script>

<style scoped>
@reference "tailwindcss";
.panel        { @apply w-72 flex flex-col gap-4 text-sm; }
.card         { @apply bg-gray-900 rounded-xl border border-gray-800 p-4; }
.card-header  { @apply flex items-center justify-between mb-3; }
.section-label { @apply text-gray-400 text-xs uppercase tracking-widest font-medium; }
.latency      { @apply text-xs text-gray-500 font-mono; }
.choice-row   { @apply flex items-center gap-2 mb-4; }
.choice-prefix { @apply text-gray-400 text-xs; }
.badge        { @apply px-3 py-0.5 rounded-full font-mono font-bold text-sm bg-indigo-900 text-indigo-200; }
.empty        { @apply text-gray-600 font-mono; }
.probs        { @apply flex flex-col gap-2 mb-4; }
.prob-row     { @apply flex items-center gap-2; }
.prob-label   { @apply w-16 font-mono text-xs truncate text-gray-400; }
.prob-label.active { @apply text-green-400 font-bold; }
.bar-track    { @apply flex-1 h-2 bg-gray-800 rounded-full overflow-hidden; }
.bar-fill     { @apply h-full rounded-full; transition: width 0.3s ease; }
.bar-fill.chosen   { @apply bg-green-500; }
.bar-fill.unchosen { @apply bg-gray-600; }
.bar-fill.warn     { @apply bg-yellow-500; }
.bar-fill.danger   { @apply bg-red-500; }
.prob-pct     { @apply w-10 text-right font-mono text-xs text-gray-500; }
.prob-pct.active { @apply text-green-400; }
.confidence   { @apply flex flex-col gap-1; }
.conf-header  { @apply flex justify-between text-xs text-gray-400; }
.conf-value   { @apply font-mono text-white; }
.waiting      { @apply text-gray-600 text-xs; }
.copy-btn     { @apply px-2 py-0.5 text-xs rounded transition-colors font-mono bg-gray-700 hover:bg-gray-600; }
.copy-btn.copied { @apply bg-green-800 text-green-200; }
.state-preview { @apply text-xs text-gray-500 font-mono whitespace-pre overflow-hidden; max-height: 120px; }
</style>

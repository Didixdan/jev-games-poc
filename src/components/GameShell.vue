<template>
  <div class="shell">
    <div class="left">
      <div class="header">
        <h1 class="title">{{ title }}</h1>
        <div class="score-row">
          <span class="score-label">Score:</span>
          <span class="score-value">{{ score }}</span>
        </div>
      </div>

      <div class="grid-area">
        <slot />
        <div v-if="gameOver" class="overlay">
          <p class="overlay-title">{{ gameOverTitle }}</p>
          <p v-if="finalScore != null" class="overlay-score">Score: {{ finalScore }}</p>
          <div class="overlay-actions">
            <button @click="$emit('reset')" class="btn-primary">{{ resetLabel }}</button>
            <slot name="gameover-actions" />
          </div>
        </div>
      </div>

      <div class="controls">
        <div v-if="showSpeed" class="speed-row">
          <label class="speed-label">Speed</label>
          <input
            type="range" min="100" max="2000" step="100"
            :value="speed"
            @input="$emit('speedChange', parseInt($event.target.value))"
            class="speed-slider"
          />
          <span class="speed-value">{{ speed }}ms</span>
        </div>
        <div class="btn-row">
          <button @click="$emit('start')" class="btn-start" :class="{ paused: running }">
            {{ running ? 'Pause' : 'Start' }}
          </button>
          <button @click="$emit('reset')" class="btn-reset">Reset</button>
          <slot name="controls" />
        </div>
      </div>
    </div>

    <JevPanel :answer="jevAnswer" :history="jevHistory" />
  </div>
</template>

<script setup>
import JevPanel from './JevPanel.vue'

defineProps({
  title: { type: String, default: 'Game' },
  score: { type: [Number, String], default: 0 },
  gameOver: { type: Boolean, default: false },
  gameOverTitle: { type: String, default: 'Game Over' },
  finalScore: { type: Number, default: null },
  resetLabel: { type: String, default: 'Play Again' },
  running: { type: Boolean, default: false },
  speed: { type: Number, default: 800 },
  showSpeed: { type: Boolean, default: true },
  jevAnswer: { type: Object, default: null },
  jevHistory: { type: Array, default: () => [] },
})

defineEmits(['start', 'reset', 'speedChange'])
</script>

<style scoped>
@reference "tailwindcss";
.shell        { @apply flex gap-6 items-start; }
.left         { @apply flex flex-col gap-4; }
.header       { @apply flex items-center justify-between; }
.title        { @apply text-xl font-bold tracking-tight; }
.score-row    { @apply flex items-center gap-3 text-sm; }
.score-label  { @apply text-gray-400; }
.score-value  { @apply font-mono font-bold text-green-400; }
.grid-area    { @apply relative; }
.overlay      { @apply absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-4 rounded-lg z-10; }
.overlay-title  { @apply text-3xl font-bold text-red-400; }
.overlay-score  { @apply text-gray-300 text-lg; }
.overlay-actions { @apply flex gap-3; }
.btn-primary  { @apply px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-medium transition-colors; }
.controls     { @apply flex flex-col gap-2 text-sm; }
.speed-row    { @apply flex items-center gap-3; }
.speed-label  { @apply text-gray-400 w-16; }
.speed-slider { @apply flex-1 accent-green-400; }
.speed-value  { @apply font-mono text-green-400 w-16 text-right; }
.btn-row      { @apply flex gap-2; }
.btn-start    { @apply px-4 py-1.5 rounded text-sm font-medium transition-colors bg-green-600 hover:bg-green-500; }
.btn-start.paused { @apply bg-yellow-700 hover:bg-yellow-600; }
.btn-reset    { @apply px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors; }
</style>

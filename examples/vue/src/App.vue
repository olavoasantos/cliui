<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';

const props = defineProps<{terminal: {exit: () => void}; doc: any}>();

const count = ref(0);

function handler(event: KeyboardEvent) {
  const key = event.key;

  if (key === 'c' && event.ctrlKey) {
    props.terminal.exit();
    process.exit(0);
  }

  count.value++;
}

onMounted(() => props.doc.body.addEventListener('keydown', handler));
onUnmounted(() => props.doc.body.removeEventListener('keydown', handler));
</script>

<template>
  <div class="app">
    <div class="title">Vue</div>
    <div class="counter">{{ `Count: ${count}` }}</div>
    <div class="hint">Press any key to increment. Ctrl+C to quit.</div>
  </div>
</template>

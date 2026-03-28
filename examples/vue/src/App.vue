<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';

const props = defineProps<{terminal: {exit: () => void}; doc: any}>();

const count = ref(0);

function handler(event: Event) {
  const key = (event as KeyboardEvent).key;

  if (key === 'c' && (event as KeyboardEvent).ctrlKey) {
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

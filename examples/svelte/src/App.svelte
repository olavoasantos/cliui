<script lang="ts">
  let count = $state(0);

  interface Props {
    terminal: {exit: () => void};
    doc: any;
  }

  let {terminal, doc}: Props = $props();

  $effect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key;

      if (key === 'c' && event.ctrlKey) {
        terminal.exit();
        process.exit(0);
      }

      count++;
    };

    doc.body.addEventListener('keydown', handler);

    return () => doc.body.removeEventListener('keydown', handler);
  });
</script>

<div class="app">
  <div class="title">Svelte</div>
  <div class="counter">{`Count: ${count}`}</div>
  <div class="hint">Press any key to increment. Ctrl+C to quit.</div>
</div>

declare module '*.css?inline' {
  const css: string;
  export default css;
}

declare module '*.svelte' {
  import type {SvelteComponent} from 'svelte';
  const component: typeof SvelteComponent;
  export default component;
}

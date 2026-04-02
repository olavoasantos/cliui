/// <reference types="@cliui/dom/register" />

declare module '*.css?inline' {
  const content: string;
  export default content;
}

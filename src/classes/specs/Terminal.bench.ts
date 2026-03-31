import {bench, describe} from 'vitest';

import {Terminal} from '../Terminal';

import type {Element} from '../../dom';
import type {TerminalReadableInput} from '../../terminal/types';

type TerminalBenchInternals = {
  renderFrame(): void;
  styleEngine: {
    markAllDirty(): void;
  };
  layoutEngine: {
    clearCache(): void;
  };
  renderer: {
    cols: number;
    rows: number;
    resize(cols: number, rows: number): void;
  };
};

type BenchScenario = {
  terminal: Terminal;
  mutate(): void;
};

function createOutput() {
  return {
    columns: 120,
    rows: 32,
    write(_chunk: string) {
      return true;
    },
  };
}

function createInput(): TerminalReadableInput {
  return {
    setRawMode() {},
    on() {
      return this;
    },
    off() {
      return this;
    },
    resume() {},
    pause() {},
  };
}

function populateDocument(terminal: Terminal): Element[] {
  const style = terminal.document.createElement('style');

  style.textContent = `
    .app {
      display: flex;
      flex-direction: column;
      padding: 1;
      gap: 1;
    }

    .row {
      display: flex;
      gap: 1;
    }

    .card {
      display: flex;
      flex-direction: column;
      width: 28;
      padding: 1;
      border-style: rounded;
      border-color: #7c3aed;
      background-color: #111827;
      color: #e5e7eb;
    }

    .title {
      font-weight: bold;
      color: #c4b5fd;
    }

    .meta {
      color: #93c5fd;
    }
  `;

  terminal.document.head.appendChild(style);

  const app = terminal.document.createElement('div');
  app.className = 'app';
  const titles: Element[] = [];

  for (let rowIndex = 0; rowIndex < 4; rowIndex += 1) {
    const row = terminal.document.createElement('div');
    row.className = 'row';

    for (let cardIndex = 0; cardIndex < 4; cardIndex += 1) {
      const card = terminal.document.createElement('div');
      card.className = 'card';

      const title = terminal.document.createElement('div');
      title.className = 'title';
      title.textContent = `Panel ${rowIndex}-${cardIndex}`;
      titles.push(title);

      const meta = terminal.document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `CPU ${(rowIndex + 1) * (cardIndex + 2)}%`;

      const body = terminal.document.createElement('div');
      body.textContent =
        'Tracing style, layout, and renderer coordination through the public terminal pipeline.';

      card.append(title, meta, body);
      row.appendChild(card);
    }

    app.appendChild(row);
  }

  terminal.document.body.appendChild(app);

  return titles;
}

function createInitialRenderScenario(): BenchScenario {
  const output = createOutput();
  const terminal = new Terminal({
    output,
    input: createInput(),
    altScreen: false,
    mouse: false,
    fps: 60,
  });
  const internals = terminal as unknown as TerminalBenchInternals;

  populateDocument(terminal);

  return {
    terminal,
    mutate() {
      internals.styleEngine.markAllDirty();
      internals.layoutEngine.clearCache();
      internals.renderer.resize(output.columns, output.rows);
    },
  };
}

function createIncrementalRenderScenario(): BenchScenario {
  const terminal = new Terminal({
    output: createOutput(),
    input: createInput(),
    altScreen: false,
    mouse: false,
    fps: 60,
  });
  const titles = populateDocument(terminal);
  const internals = terminal as unknown as TerminalBenchInternals;
  let revision = 0;

  internals.renderFrame();

  return {
    terminal,
    mutate() {
      revision += 1;

      for (let index = 0; index < titles.length; index += 3) {
        titles[index]!.textContent = `Panel ${index} rev ${revision}`;
      }
    },
  };
}

function createSettledRenderScenario(): BenchScenario {
  const terminal = new Terminal({
    output: createOutput(),
    input: createInput(),
    altScreen: false,
    mouse: false,
    fps: 60,
  });
  const internals = terminal as unknown as TerminalBenchInternals;

  populateDocument(terminal);
  internals.renderFrame();

  return {
    terminal,
    mutate() {},
  };
}

const INITIAL_RENDER_SCENARIOS = Array.from({length: 8}, () => createInitialRenderScenario());
const INCREMENTAL_RENDER_SCENARIOS = Array.from({length: 8}, () =>
  createIncrementalRenderScenario(),
);
const SETTLED_RENDER_SCENARIOS = Array.from({length: 8}, () => createSettledRenderScenario());
let initialScenarioIndex = 0;
let incrementalScenarioIndex = 0;
let settledScenarioIndex = 0;

describe('Terminal', () => {
  bench('renders a fully invalidated styled dashboard frame', () => {
    const scenario = INITIAL_RENDER_SCENARIOS[initialScenarioIndex]!;
    const terminal = scenario.terminal as unknown as TerminalBenchInternals;

    initialScenarioIndex = (initialScenarioIndex + 1) % INITIAL_RENDER_SCENARIOS.length;
    scenario.mutate();
    terminal.renderFrame();
  });

  bench('rerenders a styled dashboard document after targeted text mutations', () => {
    const scenario = INCREMENTAL_RENDER_SCENARIOS[incrementalScenarioIndex]!;
    const terminal = scenario.terminal as unknown as TerminalBenchInternals;

    incrementalScenarioIndex = (incrementalScenarioIndex + 1) % INCREMENTAL_RENDER_SCENARIOS.length;
    scenario.mutate();
    terminal.renderFrame();
  });

  bench('rerenders an unchanged styled dashboard frame after settling', () => {
    const scenario = SETTLED_RENDER_SCENARIOS[settledScenarioIndex]!;
    const terminal = scenario.terminal as unknown as TerminalBenchInternals;

    settledScenarioIndex = (settledScenarioIndex + 1) % SETTLED_RENDER_SCENARIOS.length;
    scenario.mutate();
    terminal.renderFrame();
  });
});

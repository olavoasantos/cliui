import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('fireEvent', () => {
  it.todo('does nothing when the target has no listeners');
  it.todo('does nothing when there are no listeners for the event type');
  it.todo('calls function listeners with currentTarget as this');
  it.todo('calls object listeners via handleEvent method');
  it.todo('sets eventPhase to AT_TARGET when target equals currentTarget');
  it.todo('sets eventPhase to the provided phase when target differs');
  it.todo('sets currentTarget on the event for each listener invocation');
  it.todo('invokes capture-phase listeners with the capture marker');
  it.todo('stops invoking further listeners when stopImmediatePropagation is called');
  it.todo('rethrows listener errors asynchronously without stopping other listeners');
});

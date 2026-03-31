import {describe, expect, it} from 'vitest';

import {UiMeter} from '../component';
import {UI_METER_EMPTY_CHAR, UI_METER_FILL_CHAR} from '../constants';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiMeter.tagName, UiMeter);

  return {window, document};
}

describe('UiMeter', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-meter')).toBe(UiMeter);
  });

  it('renders a full bar at max value', () => {
    const {document} = createEnv();
    const meter = document.createElement('ui-meter') as UiMeter;
    meter.setAttribute('value', '1');
    meter.setAttribute('width', '10');
    document.body.appendChild(meter);

    expect(meter.textContent).toBe(UI_METER_FILL_CHAR.repeat(10));
  });

  it('renders an empty bar at min value', () => {
    const {document} = createEnv();
    const meter = document.createElement('ui-meter') as UiMeter;
    meter.setAttribute('value', '0');
    meter.setAttribute('width', '10');
    document.body.appendChild(meter);

    expect(meter.textContent).toBe(UI_METER_EMPTY_CHAR.repeat(10));
  });

  it('renders a half-filled bar at midpoint', () => {
    const {document} = createEnv();
    const meter = document.createElement('ui-meter') as UiMeter;
    meter.setAttribute('value', '0.5');
    meter.setAttribute('width', '10');
    document.body.appendChild(meter);

    expect(meter.textContent).toBe(UI_METER_FILL_CHAR.repeat(5) + UI_METER_EMPTY_CHAR.repeat(5));
  });

  it('clamps value to min/max range', () => {
    const {document} = createEnv();
    const meter = document.createElement('ui-meter') as UiMeter;
    meter.setAttribute('min', '0');
    meter.setAttribute('max', '100');
    meter.setAttribute('value', '150');
    meter.setAttribute('width', '10');
    document.body.appendChild(meter);

    expect(meter.getValue()).toBe(100);
    expect(meter.textContent).toBe(UI_METER_FILL_CHAR.repeat(10));
  });

  it('updates bar when value attribute changes', () => {
    const {document} = createEnv();
    const meter = document.createElement('ui-meter') as UiMeter;
    meter.setAttribute('value', '0');
    meter.setAttribute('width', '10');
    document.body.appendChild(meter);

    expect(meter.textContent).toBe(UI_METER_EMPTY_CHAR.repeat(10));

    meter.setAttribute('value', '1');

    expect(meter.textContent).toBe(UI_METER_FILL_CHAR.repeat(10));
  });
});

import {describe, it, expect} from 'vitest';
import {parseKeyframeBlocks} from '../parseKeyframeBlocks';

describe('parseKeyframeBlocks', () => {
  it('parses from/to blocks', () => {
    const blocks = parseKeyframeBlocks(`
      from { color: red; }
      to { color: blue; }
    `);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.offsets).toEqual([0]);
    expect(blocks[0]!.declarations[0]!.property).toBe('color');
    expect(blocks[0]!.declarations[0]!.value).toBe('red');
    expect(blocks[1]!.offsets).toEqual([100]);
    expect(blocks[1]!.declarations[0]!.value).toBe('blue');
  });

  it('parses percentage stops', () => {
    const blocks = parseKeyframeBlocks(`
      0% { opacity: 0; }
      50% { opacity: 1; }
      100% { opacity: 0; }
    `);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.offsets).toEqual([0]);
    expect(blocks[1]!.offsets).toEqual([50]);
    expect(blocks[2]!.offsets).toEqual([100]);
  });

  it('parses multiple stops per block', () => {
    const blocks = parseKeyframeBlocks(`
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    `);
    expect(blocks).toHaveLength(2);
    // The 0%,100% block comes first (sorted by first offset)
    expect(blocks[0]!.offsets).toEqual([0, 100]);
    expect(blocks[1]!.offsets).toEqual([50]);
  });

  it('parses multiple properties per keyframe', () => {
    const blocks = parseKeyframeBlocks(`
      from { color: red; background-color: #000; }
      to { color: blue; background-color: #fff; }
    `);
    expect(blocks[0]!.declarations).toHaveLength(2);
    expect(blocks[1]!.declarations).toHaveLength(2);
  });

  it('sorts blocks by first offset', () => {
    const blocks = parseKeyframeBlocks(`
      to { opacity: 1; }
      from { opacity: 0; }
    `);
    expect(blocks[0]!.offsets).toEqual([0]);
    expect(blocks[1]!.offsets).toEqual([100]);
  });

  it('skips blocks with no declarations', () => {
    const blocks = parseKeyframeBlocks(`
      from { }
      to { opacity: 1; }
    `);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.offsets).toEqual([100]);
  });

  it('handles empty body', () => {
    expect(parseKeyframeBlocks('')).toEqual([]);
  });
});

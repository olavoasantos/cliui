import {describe, expect, it} from 'vitest';
import {parseCliArgs} from '../parseCliArgs';

describe('parseCliArgs', () => {
  describe('file argument', () => {
    it('parses a file path', () => {
      const options = parseCliArgs(['index.html']);
      expect(options.file).toBe('index.html');
    });

    it('defaults file to empty string', () => {
      const options = parseCliArgs([]);
      expect(options.file).toBe('');
    });

    it('throws for unexpected extra arguments', () => {
      expect(() => parseCliArgs(['index.html', 'extra.html'])).toThrow('Unexpected argument');
    });
  });

  describe('--help', () => {
    it('sets help flag', () => {
      expect(parseCliArgs(['--help']).help).toBe(true);
    });

    it('supports -h shorthand', () => {
      expect(parseCliArgs(['-h']).help).toBe(true);
    });

    it('defaults help to false', () => {
      expect(parseCliArgs([]).help).toBe(false);
    });
  });

  describe('--no-alt-screen', () => {
    it('disables alt screen', () => {
      const options = parseCliArgs(['index.html', '--no-alt-screen']);
      expect(options.altScreen).toBe(false);
    });

    it('defaults altScreen to true', () => {
      expect(parseCliArgs(['index.html']).altScreen).toBe(true);
    });
  });

  describe('--fps', () => {
    it('sets fps', () => {
      const options = parseCliArgs(['index.html', '--fps', '30']);
      expect(options.fps).toBe(30);
    });

    it('defaults fps to 60', () => {
      expect(parseCliArgs(['index.html']).fps).toBe(60);
    });

    it('throws for non-numeric fps', () => {
      expect(() => parseCliArgs(['--fps', 'abc'])).toThrow('positive number');
    });

    it('throws for zero fps', () => {
      expect(() => parseCliArgs(['--fps', '0'])).toThrow('positive number');
    });

    it('throws for negative fps', () => {
      expect(() => parseCliArgs(['--fps', '-10'])).toThrow('positive number');
    });
  });

  describe('unknown options', () => {
    it('throws for unknown flags', () => {
      expect(() => parseCliArgs(['--unknown'])).toThrow('Unknown option');
    });
  });

  describe('combined options', () => {
    it('parses file with all options', () => {
      const options = parseCliArgs(['index.html', '--no-alt-screen', '--fps', '30']);
      expect(options.file).toBe('index.html');
      expect(options.altScreen).toBe(false);
      expect(options.fps).toBe(30);
    });

    it('options can appear before the file', () => {
      const options = parseCliArgs(['--fps', '30', 'index.html']);
      expect(options.file).toBe('index.html');
      expect(options.fps).toBe(30);
    });
  });
});

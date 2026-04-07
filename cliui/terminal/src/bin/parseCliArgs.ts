/** Parsed CLI options. */
export interface CLIOptions {
  /** Path to the HTML file. */
  file: string;
  /** Whether to use alternate screen mode. */
  altScreen: boolean;
  /** Target frame rate. */
  fps: number;
  /** Whether to show help. */
  help: boolean;
}

/**
 * Parses CLI arguments into structured options.
 *
 * @param args - The argument array (typically `process.argv.slice(2)`).
 * @returns The parsed options.
 * @throws Error if an invalid argument is encountered.
 */
export function parseCliArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    file: '',
    altScreen: true,
    fps: 60,
    help: false,
  };

  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--no-alt-screen') {
      options.altScreen = false;
    } else if (arg === '--fps') {
      i++;
      const value = Number(args[i]);

      if (Number.isNaN(value) || value <= 0) {
        throw new Error('--fps requires a positive number');
      }

      options.fps = value;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!options.file) {
      options.file = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    i++;
  }

  return options;
}

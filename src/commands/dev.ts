import convict from 'convict';

const configSchema = convict({
  output: {
    dir: {
      doc: 'Generator の出力先ディレクトリ',
      format: String,
      default: './docs',
      env: 'STDG_OUTPUT_DIR',
    },
  },
});

export type Config = {
  output: {
    dir: string;
  };
};

export function loadConfig(): Config {
  configSchema.validate({ allowed: 'strict' });
  return configSchema.getProperties() as Config;
}

export async function devCommand(): Promise<void> {
  console.log('Starting development server...');
  console.log('');

  const config = loadConfig();

  console.log('Configuration:');
  console.log(`  Output directory: ${config.output.dir}`);
  console.log('');

  console.log('Development server is ready.');
  console.log('Press Ctrl+C to stop.');

  // Keep the process running
  await new Promise(() => {});
}

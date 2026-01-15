import convict from 'convict';
import { resolve } from 'path';
import { startRenderServer } from '../render.js';

const configSchema = convict({
  output: {
    doc: {
      dir: {
        doc: 'Generator の出力先ディレクトリ',
        format: String,
        default: './output/docs',
        env: 'STDG_OUTPUT_DOC_DIR',
      },
    },
    rendered: {
      dir: {
        doc: 'レンダリング結果の出力先ディレクトリ',
        format: String,
        default: './output/rendered',
        env: 'STDG_OUTPUT_RENDERED_DIR',
      },
    },
  },
});

export type Config = {
  output: {
    doc: {
      dir: string;
    };
    rendered: {
      dir: string;
    };
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
  const sourceDir = resolve(process.cwd(), config.output.doc.dir);
  const destinationDir = resolve(process.cwd(), config.output.rendered.dir);

  console.log('Configuration:');
  console.log(`  Document output directory: ${sourceDir}`);
  console.log(`  Rendered output directory: ${destinationDir}`);
  console.log('');

  const hugo = startRenderServer({ sourceDir, destinationDir });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    hugo.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    hugo.kill();
    process.exit(0);
  });

  // Keep the process running
  await new Promise(() => {});
}

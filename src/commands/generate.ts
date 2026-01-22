import { resolve } from 'path';
import convict from 'convict';
import { loadDataDir } from '../lib/data-loader.js';
import { expandTemplateDir } from '../lib/template-expander.js';

const configSchema = convict({
  data: {
    dir: {
      doc: 'データディレクトリ',
      format: String,
      default: './data',
      env: 'STDG_DATA_DIR',
    },
  },
  templates: {
    dir: {
      doc: 'テンプレートディレクトリ',
      format: String,
      default: './templates',
      env: 'STDG_TEMPLATES_DIR',
    },
  },
  output: {
    doc: {
      dir: {
        doc: 'Generator の出力先ディレクトリ',
        format: String,
        default: './output/docs',
        env: 'STDG_OUTPUT_DOC_DIR',
      },
    },
  },
});

export interface GenerateConfig {
  data: { dir: string };
  templates: { dir: string };
  output: { doc: { dir: string } };
}

function loadConfig(): GenerateConfig {
  configSchema.validate({ allowed: 'strict' });
  return configSchema.getProperties() as GenerateConfig;
}

export function generateCommand(): void {
  const config = loadConfig();

  const dataDir = resolve(process.cwd(), config.data.dir);
  const templateDir = resolve(process.cwd(), config.templates.dir);
  const outputDir = resolve(process.cwd(), config.output.doc.dir);

  console.log('Generating documents...');
  console.log(`  Data directory: ${dataDir}`);
  console.log(`  Template directory: ${templateDir}`);
  console.log(`  Output directory: ${outputDir}`);
  console.log('');

  const data = loadDataDir(dataDir);
  expandTemplateDir(templateDir, data, outputDir);

  console.log('Done.');
}

import { resolve } from 'path';
import { Config } from '../config.js';
import { loadDataDir } from '../core/data-loader.js';
import { expandTemplateDir } from '../core/template-expander.js';

export async function generateCommand(config: Config): Promise<void> {
  const dataDir = resolve(process.cwd(), config.data.dir);
  const templateDir = resolve(process.cwd(), config.templates.dir);
  const outputDir = resolve(process.cwd(), config.output.doc.dir);

  console.log('Generating documents...');
  console.log(`  Data directory: ${dataDir}`);
  console.log(`  Template directory: ${templateDir}`);
  console.log(`  Output directory: ${outputDir}`);
  console.log('');

  const data = loadDataDir(dataDir);
  await expandTemplateDir(templateDir, data, outputDir);

  console.log('Done.');
}

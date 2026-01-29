import { resolve } from 'path';
import { Config } from '../config.js';
import { buildSource } from '../core/data-loader.js';
import { expandTemplateDir } from '../core/template-expander.js';

export async function generateCommand(config: Config): Promise<void> {
  const sourceDir = resolve(process.cwd(), config.source.dir);
  const templateDir = resolve(process.cwd(), config.templates.dir);
  const outputDir = resolve(process.cwd(), config.output.doc.dir);

  console.log('Generating documents...');
  console.log(`  Source directory: ${sourceDir}`);
  console.log(`  Template directory: ${templateDir}`);
  console.log(`  Output directory: ${outputDir}`);
  console.log('');

  const source = buildSource(sourceDir);
  await expandTemplateDir(templateDir, { source }, outputDir);

  console.log('Done.');
}

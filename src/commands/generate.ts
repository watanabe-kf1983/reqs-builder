import { resolve } from 'path';
import { Config } from '../config.js';
import { buildSource } from '../core/source.js';
import { buildToc } from '../core/toc.js';
import { expandTemplateDir } from '../core/template-expander.js';

export async function generateCommand(config: Config): Promise<void> {
  const sourceDir = resolve(process.cwd(), config.source.dir);
  const tocDir = resolve(process.cwd(), config.toc.dir);
  const templateDir = resolve(process.cwd(), config.templates.dir);
  const outputDir = resolve(process.cwd(), config.output.doc.dir);
  const tocOutputDir = resolve(process.cwd(), config.output.toc.dir);

  console.log('Generating documents...');
  console.log(`  Source directory: ${sourceDir}`);
  console.log(`  ToC directory: ${tocDir}`);
  console.log(`  Template directory: ${templateDir}`);
  console.log(`  Output directory: ${outputDir}`);
  console.log('');

  const source = buildSource(sourceDir);
  const toc = buildToc(tocDir, source, tocOutputDir);
  await expandTemplateDir(templateDir, { source, toc }, outputDir);

  console.log('Done.');
}

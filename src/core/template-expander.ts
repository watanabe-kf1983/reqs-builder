import fs from 'fs';
import path from 'path';
import Eleventy from '@11ty/eleventy';

/**
 * Expand all template files in a directory and write to output directory.
 * Uses 11ty (Eleventy) for template processing with Nunjucks.
 *
 * @param templateDir - Directory containing template files (*.j2, *.jinja2)
 * @param data - Data to pass to all templates
 * @param outputDir - Directory to write expanded files (*.md)
 * @throws Error if template directory doesn't exist or isn't a directory
 */
export async function expandTemplateDir(
  templateDir: string,
  data: Record<string, unknown>,
  outputDir: string
): Promise<void> {
  const resolvedTemplateDir = path.resolve(templateDir);
  const resolvedOutputDir = path.resolve(outputDir);

  // Validate input directory
  if (!fs.existsSync(resolvedTemplateDir)) {
    throw new Error(`Template directory not found: ${resolvedTemplateDir}`);
  }
  if (!fs.statSync(resolvedTemplateDir).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedTemplateDir}`);
  }

  const elev = new Eleventy(resolvedTemplateDir, resolvedOutputDir, {
    quietMode: true,
    configPath: false,
    config: (eleventyConfig) => {
      // Pass data to templates as global data
      for (const [key, value] of Object.entries(data)) {
        eleventyConfig.addGlobalData(key, value);
      }

      // Register .j2 and .jinja2 as valid template formats
      eleventyConfig.addTemplateFormats(['j2', 'jinja2']);

      // Register .j2 and .jinja2 extensions as Nunjucks with .md output
      // Use getData to set permalink dynamically (strip .md from stem)
      eleventyConfig.addExtension('j2', {
        key: 'njk',
        outputFileExtension: 'md',
        getData: (inputPath: string) => {
          // inputPath: /path/to/entity.md.j2
          // filePathStem would be: /entity.md
          // We want output: /entity.md (not /entity.md.md)
          const basename = path.basename(inputPath, '.j2');
          // basename: entity.md
          return { permalink: `/${basename}` };
        },
      });
      eleventyConfig.addExtension('jinja2', {
        key: 'njk',
        outputFileExtension: 'md',
        getData: (inputPath: string) => {
          const basename = path.basename(inputPath, '.jinja2');
          return { permalink: `/${basename}` };
        },
      });
    },
  });

  await elev.write();
}

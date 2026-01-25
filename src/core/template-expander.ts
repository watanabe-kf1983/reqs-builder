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
  const extensions = ['j2', 'jinja2'];
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
      Object.entries(data).forEach(([key, value]) => {
        eleventyConfig.addGlobalData(key, value);
      });

      eleventyConfig.addTemplateFormats(extensions);

      extensions.forEach((ext) => {
        eleventyConfig.addExtension(ext, {
          key: 'njk',
          outputFileExtension: 'md',
          getData: (inputPath: string) => ({
            permalink: `/${path.basename(inputPath, `.${ext}`)}`,
          }),
        });
      });
    },
  });

  await elev.write();
}

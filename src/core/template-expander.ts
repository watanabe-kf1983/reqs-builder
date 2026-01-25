import fs from 'fs';
import path from 'path';
import Eleventy from '@11ty/eleventy';
import nunjucks from 'nunjucks';

/**
 * Expand all template files in a directory and write to output directory.
 * Uses 11ty (Eleventy) for template processing with Nunjucks.
 *
 * @param templateDir - Directory containing template files (all files processed as Nunjucks)
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

  // Collect all unique extensions from files in templateDir
  const extensions = [
    ...new Set(
      fs
        .readdirSync(resolvedTemplateDir)
        .filter((f) => fs.statSync(path.join(resolvedTemplateDir, f)).isFile())
        .map((f) => path.extname(f).slice(1))
        .filter((ext) => ext.length > 0)
    ),
  ];

  type ConfigFn = (config: {
    addGlobalData: (k: string, v: unknown) => void;
    setTemplateFormats: (f: string[]) => void;
    addExtension: (e: string, o: typeof nunjucksExtension) => void;
  }) => void;

  const configFn: ConfigFn = (config) => {
    Object.entries(data).forEach(([key, value]) => {
      config.addGlobalData(key, value);
    });
    config.setTemplateFormats(extensions);
    extensions.forEach((ext) => {
      config.addExtension(ext, nunjucksExtension);
    });
  };

  const elev = new Eleventy(resolvedTemplateDir, resolvedOutputDir, {
    quietMode: true,
    configPath: false,
    config: configFn as (eleventyConfig: unknown) => void,
  });

  await elev.write();
}

const nunjucksExtension = {
  compile: (inputContent: string) => {
    const template = nunjucks.compile(inputContent);
    return (templateData: Record<string, unknown>) => template.render(templateData);
  },
  compileOptions: {
    permalink: (_contents: string, inputPath: string) => {
      return (data: Record<string, unknown>) => {
        if (typeof data.permalink === 'string') {
          return nunjucks.renderString(data.permalink, data);
        }
        return `/${path.basename(inputPath)}`;
      };
    },
  },
};

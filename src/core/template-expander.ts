import fs from 'fs';
import path from 'path';
import Eleventy from '@11ty/eleventy';
import { Liquid } from 'liquidjs';

// Create a shared Liquid instance for permalink rendering
const liquid = new Liquid();

/**
 * Expand all template files in a directory and write to output directory.
 * Uses 11ty (Eleventy) for template processing with LiquidJS.
 *
 * @param templateDir - Directory containing template files (all files processed as Liquid)
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
    addExtension: (e: string, o: typeof liquidExtension) => void;
  }) => void;

  const configFn: ConfigFn = (config) => {
    Object.entries(data).forEach(([key, value]) => {
      config.addGlobalData(key, value);
    });
    config.setTemplateFormats(extensions);
    extensions.forEach((ext) => {
      config.addExtension(ext, liquidExtension);
    });
  };

  const elev = new Eleventy(resolvedTemplateDir, resolvedOutputDir, {
    quietMode: true,
    configPath: false,
    config: configFn as (eleventyConfig: unknown) => void,
  });

  await elev.write();
}

const liquidExtension = {
  compile: (inputContent: string) => {
    return (templateData: Record<string, unknown>): string => {
      return liquid.parseAndRenderSync(inputContent, templateData) as string;
    };
  },
  compileOptions: {
    permalink: (_contents: string, inputPath: string) => {
      return (data: Record<string, unknown>): string => {
        if (typeof data.permalink === 'string') {
          return liquid.parseAndRenderSync(data.permalink, data) as string;
        }
        return `/${path.basename(inputPath)}`;
      };
    },
  },
};

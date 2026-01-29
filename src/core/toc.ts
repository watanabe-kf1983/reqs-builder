import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import nunjucks from 'nunjucks';
import deepmerge from 'deepmerge';

type DataObject = Record<string, unknown>;

// Configure Nunjucks with custom filters (similar to 11ty built-ins)
const nunjucksEnv = new nunjucks.Environment();

nunjucksEnv.addFilter('unique', (arr: unknown[]) => [...new Set(arr)]);

// Nunjucks passes keyword args as { attribute: 'value', __keywords: true }
nunjucksEnv.addFilter('map', (arr: unknown[], kwargs: { attribute: string }) =>
  arr.map((item) => (item as Record<string, unknown>)[kwargs.attribute])
);

/**
 * Build ToC (Table of Contents) from .yaml.njk template files.
 * Renders each template with source data, parses as YAML, and merges results.
 *
 * @param dirPath - Path to the toc directory
 * @param source - Source data to pass to Nunjucks templates
 * @param outputDir - Optional directory to write rendered YAML files (for debugging)
 * @returns Merged toc object, or empty object if directory doesn't exist
 */
export function buildToc(dirPath: string, source: DataObject, outputDir?: string): DataObject {
  const resolvedPath = path.resolve(dirPath);

  // Return empty object if directory doesn't exist (toc is optional)
  if (!fs.existsSync(resolvedPath)) {
    return {};
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  const tocFiles = getFiles(resolvedPath).filter(isTocFile);

  // Phase 1: Render all files and optionally save to outputDir
  const renderedFiles = tocFiles.map((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    const rendered = nunjucksEnv.renderString(content, { source });
    const baseName = path.basename(file, '.njk'); // e.g., "entities.yaml"
    return { file, baseName, rendered };
  });

  // Write rendered files to outputDir if specified
  if (outputDir) {
    const resolvedOutputDir = path.resolve(outputDir);
    if (!fs.existsSync(resolvedOutputDir)) {
      fs.mkdirSync(resolvedOutputDir, { recursive: true });
    }
    for (const { baseName, rendered } of renderedFiles) {
      fs.writeFileSync(path.join(resolvedOutputDir, baseName), rendered);
    }
  }

  // Phase 2: Parse all rendered YAML and merge
  return renderedFiles
    .map(({ file, rendered }) => parseTocYaml(file, rendered))
    .reduce((acc, data) => deepmerge(acc, data, { arrayMerge: arrayMergeWithError }), {});
}

/**
 * Get all files from a directory, sorted alphabetically.
 */
function getFiles(dirPath: string): string[] {
  return fs
    .readdirSync(dirPath)
    .sort()
    .map((file) => path.join(dirPath, file));
}

const isTocFile = (file: string): boolean => file.endsWith('.yaml.njk');

/**
 * Parse rendered YAML content into an object.
 */
function parseTocYaml(filePath: string, rendered: string): DataObject {
  const parsed = yaml.load(rendered);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Invalid YAML in toc file ${filePath}: expected object`);
  }

  return parsed as DataObject;
}

/**
 * Custom array merge that throws an error on array collision.
 */
function arrayMergeWithError(target: unknown[], source: unknown[]): unknown[] {
  if (target.length === 0) {
    return source;
  }
  throw new Error('Array merge conflict: arrays cannot be merged. Use different keys.');
}

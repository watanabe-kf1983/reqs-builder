import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import nunjucks from 'nunjucks';
import deepmerge from 'deepmerge';

type DataObject = Record<string, unknown>;

/**
 * Build ToC (Table of Contents) from .yaml.njk template files.
 * Renders each template with source data, parses as YAML, and merges results.
 *
 * @param dirPath - Path to the toc directory
 * @param source - Source data to pass to Nunjucks templates
 * @returns Merged toc object, or empty object if directory doesn't exist
 */
export function buildToc(dirPath: string, source: DataObject): DataObject {
  const resolvedPath = path.resolve(dirPath);

  // Return empty object if directory doesn't exist (toc is optional)
  if (!fs.existsSync(resolvedPath)) {
    return {};
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  return getFiles(resolvedPath)
    .filter(isTocFile)
    .map((file) => renderTocFile(file, source))
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
 * Render a toc template file with source data and parse as YAML.
 */
function renderTocFile(filePath: string, source: DataObject): DataObject {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rendered = nunjucks.renderString(content, { source });
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

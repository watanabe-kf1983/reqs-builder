import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import deepmerge from 'deepmerge';

type DataObject = Record<string, unknown>;

/**
 * Load all YAML files from a directory and deep merge them.
 * @param dirPath - Path to the data directory
 * @returns Merged data object
 * @throws Error if directory doesn't exist, YAML is invalid, or keys conflict
 */
export function loadDataDir(dirPath: string): DataObject {
  return getFiles(dirPath)
    .filter(isDataFile)
    .map(loadDataFile)
    .reduce((acc, data) => deepmerge(acc, data, { arrayMerge: arrayMergeWithError }), {});
}

/**
 * Get all files from a directory, sorted alphabetically.
 */
function getFiles(dirPath: string): string[] {
  const resolvedPath = path.resolve(dirPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Data directory not found: ${resolvedPath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  return fs
    .readdirSync(resolvedPath)
    .sort()
    .map((file) => path.join(resolvedPath, file));
}

const isDataFile = (file: string): boolean => file.endsWith('.yaml') || file.endsWith('.yml');

/**
 * Load and parse a data file (YAML).
 */
function loadDataFile(filePath: string): DataObject {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(content);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Invalid YAML: expected object, got ${typeof parsed}`);
  }

  return parsed as DataObject;
}

/**
 * Custom array merge that throws an error on array collision.
 * If target is empty, just use source (no collision).
 */
function arrayMergeWithError(target: unknown[], source: unknown[]): unknown[] {
  if (target.length === 0) {
    return source;
  }
  throw new Error('Array merge conflict: arrays cannot be merged. Use different keys.');
}

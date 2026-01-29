import { describe, it, expect } from 'vitest';
import { buildToc } from './toc.js';
import path from 'path';

const fixturesDir = path.join(__dirname, 'toc.fixtures');

const sampleSource = {
  entities: [
    { id: 'user', name: 'User', category: 'user-management' },
    { id: 'role', name: 'Role', category: 'user-management' },
    { id: 'order', name: 'Order', category: 'order-management' },
  ],
};

describe('buildToc', () => {
  it('should render and merge toc files with source data', () => {
    const result = buildToc(path.join(fixturesDir, 'valid'), sampleSource);

    // erds.yaml.njk produces erds array grouped by category
    expect(result).toHaveProperty('erds');
    expect(result.erds).toHaveLength(2); // user-management, order-management

    // entities.yaml.njk produces entities array
    expect(result).toHaveProperty('entities');
    expect(result.entities).toHaveLength(3);
  });

  it('should return empty object when directory does not exist', () => {
    const result = buildToc('/non/existent/dir', sampleSource);

    expect(result).toEqual({});
  });

  it('should return empty object when directory is empty', () => {
    const result = buildToc(path.join(fixturesDir, 'empty-dir'), sampleSource);

    expect(result).toEqual({});
  });

  it('should throw an error for invalid YAML after rendering', () => {
    expect(() => buildToc(path.join(fixturesDir, 'invalid-yaml'), sampleSource)).toThrow();
  });

  it('should throw an error when path is not a directory', () => {
    const filePath = path.join(fixturesDir, 'valid', 'erds.yaml.njk');
    expect(() => buildToc(filePath, sampleSource)).toThrow('Path is not a directory');
  });

  it('should only process .yaml.njk files', () => {
    const result = buildToc(path.join(fixturesDir, 'valid'), sampleSource);

    // Should not include any unexpected keys from non-.yaml.njk files
    const keys = Object.keys(result);
    expect(keys).toContain('erds');
    expect(keys).toContain('entities');
    expect(keys).toHaveLength(2);
  });
});

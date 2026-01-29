import { describe, it, expect, afterEach } from 'vitest';
import { buildToc } from './toc.js';
import path from 'path';
import fs from 'fs';

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

    // erds.yaml.liquid produces erds array grouped by category
    expect(result).toHaveProperty('erds');
    expect(result.erds).toHaveLength(2); // user-management, order-management

    // entities.yaml.liquid produces entities array
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
    const filePath = path.join(fixturesDir, 'valid', 'erds.yaml.liquid');
    expect(() => buildToc(filePath, sampleSource)).toThrow('Path is not a directory');
  });

  it('should only process .yaml.liquid files', () => {
    const result = buildToc(path.join(fixturesDir, 'valid'), sampleSource);

    // Should not include any unexpected keys from non-.yaml.liquid files
    const keys = Object.keys(result);
    expect(keys).toContain('erds');
    expect(keys).toContain('entities');
    expect(keys).toHaveLength(2);
  });

  describe('outputDir parameter', () => {
    const testOutputDir = path.join(fixturesDir, 'test-output');

    afterEach(() => {
      // Clean up test output directory
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true });
      }
    });

    it('should write rendered YAML files to outputDir when specified', () => {
      buildToc(path.join(fixturesDir, 'valid'), sampleSource, testOutputDir);

      // Verify output directory was created
      expect(fs.existsSync(testOutputDir)).toBe(true);

      // Verify rendered files were written (without .njk extension)
      const files = fs.readdirSync(testOutputDir).sort();
      expect(files).toEqual(['entities.yaml', 'erds.yaml']);

      // Verify content is rendered (not raw template)
      const erdsContent = fs.readFileSync(path.join(testOutputDir, 'erds.yaml'), 'utf-8');
      expect(erdsContent).toContain('user-management');
      expect(erdsContent).toContain('order-management');
      expect(erdsContent).not.toContain('{{'); // No unrendered template syntax
    });
  });
});

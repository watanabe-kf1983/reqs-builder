import { describe, it, expect } from 'vitest';
import { expandTemplateDir } from './template-expander.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const fixturesDir = path.join(__dirname, 'template-expander.fixtures');

describe('expandTemplateDir', () => {
  it('should expand all templates in a directory', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-output-'));

    try {
      const data = {
        entity: {
          id: 'user',
          name: 'ユーザー',
          fields: [
            { name: 'id', type: 'string', pk: true },
            { name: 'email', type: 'string' },
          ],
        },
        relations: [
          { from: 'user', to: 'order', cardinality: '1:N' },
          { from: 'order', to: 'product', cardinality: 'N:M' },
        ],
      };

      expandTemplateDir(fixturesDir, data, outputDir);

      // Check entity.md
      const entityPath = path.join(outputDir, 'entity.md');
      expect(fs.existsSync(entityPath)).toBe(true);
      const entityContent = fs.readFileSync(entityPath, 'utf-8');
      expect(entityContent).toContain('# ユーザー');
      expect(entityContent).toContain('- id: string (PK)');

      // Check relations.md
      const relationsPath = path.join(outputDir, 'relations.md');
      expect(fs.existsSync(relationsPath)).toBe(true);
      const relationsContent = fs.readFileSync(relationsPath, 'utf-8');
      expect(relationsContent).toContain('# リレーション一覧');
      expect(relationsContent).toContain('user → order (1:N)');
      expect(relationsContent).toContain('order → product (N:M)');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('should create output directory if it does not exist', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-test-'));
    const outputDir = path.join(baseDir, 'nested', 'output');

    try {
      expandTemplateDir(
        fixturesDir,
        { entity: { name: 'Test', id: 'test', fields: [] }, relations: [] },
        outputDir
      );

      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'entity.md'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'relations.md'))).toBe(true);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  it('should throw an error for non-existent template directory', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-output-'));

    try {
      expect(() => {
        expandTemplateDir('/non/existent/dir', {}, outputDir);
      }).toThrow('Template directory not found');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('should throw an error when path is not a directory', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-output-'));

    try {
      expect(() => {
        expandTemplateDir(path.join(fixturesDir, 'entity.md.j2'), {}, outputDir);
      }).toThrow('Path is not a directory');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

import { describe, it, expect } from 'vitest';
import { buildSource } from './source.js';
import path from 'path';

const fixturesDir = path.join(__dirname, 'source.fixtures');

describe('buildSource', () => {
  it('should load and merge YAML files from a directory', () => {
    const result = buildSource(path.join(fixturesDir, 'valid'));

    expect(result).toHaveProperty('entities');
    expect(result).toHaveProperty('relations');
    expect(result.entities).toHaveLength(2);
    expect(result.relations).toHaveLength(1);
  });

  it('should parse nested structures correctly', () => {
    const result = buildSource(path.join(fixturesDir, 'valid'));
    const entities = result.entities as { id: string; fields: unknown[] }[];

    expect(entities[0].id).toBe('user');
    expect(entities[0].fields).toHaveLength(3);
    expect(entities[0].fields[0]).toEqual({
      name: 'id',
      type: 'string',
      pk: true,
    });
  });

  it('should throw an error for non-existent directory', () => {
    expect(() => buildSource('/non/existent/dir')).toThrow('Source directory not found');
  });

  it('should throw an error when path is not a directory', () => {
    expect(() => buildSource(path.join(fixturesDir, 'valid', 'entities.yaml'))).toThrow(
      'Path is not a directory'
    );
  });

  it('should throw an error for invalid YAML (not an object)', () => {
    expect(() => buildSource(path.join(fixturesDir, 'invalid'))).toThrow(
      'Invalid YAML: expected object'
    );
  });

  it('should throw an error on array merge conflict', () => {
    expect(() => buildSource(path.join(fixturesDir, 'array-conflict'))).toThrow(
      'Array merge conflict'
    );
  });

  it('should deep merge nested objects', () => {
    const result = buildSource(path.join(fixturesDir, 'deep-merge'));
    const config = result.config as {
      database: Record<string, unknown>;
      cache: Record<string, unknown>;
    };

    expect(config.database.host).toBe('localhost');
    expect(config.database.port).toBe(5432);
    expect(config.database.name).toBe('mydb');
    expect(config.cache.enabled).toBe(true);
  });

  it('should overwrite scalar values in deep merge (last file wins)', () => {
    const result = buildSource(path.join(fixturesDir, 'deep-conflict'));
    const config = result.config as { database: Record<string, unknown> };

    // file2.yaml comes after file1.yaml alphabetically, so its value wins
    expect(config.database.host).toBe('production-server');
  });
});

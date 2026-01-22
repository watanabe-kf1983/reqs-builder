import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { unlink } from 'fs/promises';
import hugoPath from 'hugo-bin';
import { packageDirectory } from 'pkg-dir';

async function getDefaultPaths() {
  const pkgRoot = await packageDirectory();
  if (!pkgRoot) {
    throw new Error('Could not find package root directory');
  }
  return {
    hugoConfig: join(pkgRoot, 'dist', 'resources', 'hugo', 'hugo.toml'),
    layoutDir: join(pkgRoot, 'dist', 'resources', 'hugo', 'layouts'),
  };
}

export interface RenderServerOptions {
  sourceDir: string;
  destinationDir: string;
  port?: number;
}

export interface RenderServer {
  start: () => Promise<void>;
  stop: () => void;
}

export function createRenderServer(options: RenderServerOptions): RenderServer {
  const { sourceDir, destinationDir, port = 1313 } = options;

  let hugo: ChildProcess | null = null;

  const start = async () => {
    if (hugo) return;

    const { hugoConfig, layoutDir } = await getDefaultPaths();

    const args = [
      'server',
      '--config',
      hugoConfig,
      '--layoutDir',
      layoutDir,
      '--contentDir',
      '.',
      '--source',
      sourceDir,
      '--destination',
      destinationDir,
      '--port',
      String(port),
      '--bind',
      '0.0.0.0',
      '--disableFastRender',
    ];

    hugo = spawn(hugoPath, args, {
      stdio: 'inherit',
    });

    hugo.on('error', (err) => {
      console.error('Failed to start Hugo server:', err.message);
    });

    hugo.on('exit', () => {
      const lockFile = join(sourceDir, '.hugo_build.lock');
      unlink(lockFile).catch(() => {
        // Ignore errors (file may not exist)
      });
      hugo = null;
    });
  };

  const stop = () => {
    if (hugo) {
      hugo.kill();
      hugo = null;
    }
  };

  return { start, stop };
}

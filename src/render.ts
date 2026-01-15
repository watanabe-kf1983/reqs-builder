import { spawn, ChildProcess } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { unlink } from 'fs/promises';
import hugoPath from 'hugo-bin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultHugoConfig = join(__dirname, 'templates', 'hugo.toml');
const defaultLayoutDir = join(__dirname, 'templates', 'layouts');

export interface RenderServerOptions {
  sourceDir: string;
  destinationDir: string;
  port?: number;
}

export function startRenderServer(options: RenderServerOptions): ChildProcess {
  const { sourceDir, destinationDir, port = 1313 } = options;

  const args = [
    'server',
    '--config', defaultHugoConfig,
    '--layoutDir', defaultLayoutDir,
    '--source', sourceDir,
    '--destination', destinationDir,
    '--port', String(port),
    '--bind', '0.0.0.0',
    '--disableFastRender',
  ];

  const hugo = spawn(hugoPath, args, {
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
  });

  return hugo;
}

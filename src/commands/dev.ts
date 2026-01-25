import { resolve } from 'path';
import { Config } from '../config.js';
import { createRenderServer } from '../infra/renderer.js';
import { createWatcher } from '../infra/watcher.js';
import { generateCommand } from './generate.js';

export async function devCommand(config: Config): Promise<void> {
  console.log('Starting development server...');
  console.log('');

  const dataDir = resolve(process.cwd(), config.data.dir);
  const templateDir = resolve(process.cwd(), config.templates.dir);
  const outputDir = resolve(process.cwd(), config.output.doc.dir);
  const renderedDir = resolve(process.cwd(), config.output.rendered.dir);

  // Initial generate
  await generateCommand(config);
  console.log('');

  // Start file watcher
  const watcher = createWatcher({
    paths: [dataDir, templateDir],
    onChange: () => {
      void generateCommand(config);
    },
  });
  watcher.start();
  console.log('Watching for changes...');
  console.log('');

  // Start Hugo server
  const renderServer = createRenderServer({
    sourceDir: outputDir,
    destinationDir: renderedDir,
  });
  await renderServer.start();

  const shutdown = async () => {
    console.log('\nShutting down...');
    await watcher.stop();
    renderServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Keep the process running indefinitely
  await new Promise<never>(() => {
    // Intentionally never resolves - process exits via signal handlers
  });
}

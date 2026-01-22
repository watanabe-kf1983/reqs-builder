import chokidar, { FSWatcher } from 'chokidar';
import debounce from 'debounce';

export interface WatcherOptions {
  paths: string[];
  onChange: () => void | Promise<void>;
  ignored?: (string | RegExp)[];
  debounceMs?: number;
  awaitWriteFinish?: boolean | { stabilityThreshold?: number; pollInterval?: number };
}

export interface Watcher {
  start: () => void;
  stop: () => Promise<void>;
}

export function createWatcher(options: WatcherOptions): Watcher {
  const {
    paths,
    onChange,
    ignored = [],
    debounceMs = 300,
    awaitWriteFinish = { stabilityThreshold: 200, pollInterval: 100 },
  } = options;

  let watcher: FSWatcher | null = null;

  const start = () => {
    if (watcher) return;

    const debouncedOnChange = debounce(onChange, debounceMs);

    watcher = chokidar.watch(paths, {
      ignored,
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish,
    });

    watcher.on('all', (event, path) => {
      console.log(`[watch] ${event}: ${path}`);
      void debouncedOnChange();
    });

    watcher.on('error', (err) => {
      console.error('[watch] Watcher error:', err.message);
    });
  };

  const stop = async () => {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
  };

  return { start, stop };
}

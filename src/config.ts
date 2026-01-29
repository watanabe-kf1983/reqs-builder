import convict from 'convict';

const configSchema = convict({
  source: {
    dir: {
      doc: 'Source directory',
      format: String,
      default: './source',
      env: 'STDG_SOURCE_DIR',
    },
  },
  toc: {
    dir: {
      doc: 'ToC definitions directory',
      format: String,
      default: './toc',
      env: 'STDG_TOC_DIR',
    },
  },
  templates: {
    dir: {
      doc: 'Templates directory',
      format: String,
      default: './templates',
      env: 'STDG_TEMPLATES_DIR',
    },
  },
  output: {
    doc: {
      dir: {
        doc: 'Generator output directory',
        format: String,
        default: './output/docs',
        env: 'STDG_OUTPUT_DOC_DIR',
      },
    },
    toc: {
      dir: {
        doc: 'Rendered ToC output directory (for debugging)',
        format: String,
        default: './output/tocs',
        env: 'STDG_OUTPUT_TOC_DIR',
      },
    },
    rendered: {
      dir: {
        doc: 'Rendered output directory',
        format: String,
        default: './output/rendered',
        env: 'STDG_OUTPUT_RENDERED_DIR',
      },
    },
  },
});

export interface Config {
  source: { dir: string };
  toc: { dir: string };
  templates: { dir: string };
  output: {
    doc: { dir: string };
    toc: { dir: string };
    rendered: { dir: string };
  };
}

export function loadConfig(): Config {
  configSchema.validate({ allowed: 'strict' });
  return configSchema.getProperties() as Config;
}

export function withConfig<T>(fn: (config: Config) => T): () => T {
  return () => fn(loadConfig());
}

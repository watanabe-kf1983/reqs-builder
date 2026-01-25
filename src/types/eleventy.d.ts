declare module '@11ty/eleventy' {
  interface EleventyConfig {
    addGlobalData(key: string, value: unknown): void;
    addExtension(
      ext: string | string[],
      options: {
        key?: string;
        outputFileExtension?: string;
        compile?: (
          inputContent: string,
          inputPath: string
        ) => (data: Record<string, unknown>) => string | Promise<string>;
        getData?: (inputPath: string) => Record<string, unknown> | Promise<Record<string, unknown>>;
      }
    ): void;
    addTemplateFormats(formats: string | string[]): void;
    setTemplateFormats(formats: string[]): void;
  }

  interface EleventyOptions {
    quietMode?: boolean;
    configPath?: string | false;
    config?: (eleventyConfig: EleventyConfig) => void;
  }

  class Eleventy {
    constructor(input?: string, output?: string, options?: EleventyOptions);
    write(): Promise<void>;
    toJSON(): Promise<unknown[]>;
    toNDJSON(): Promise<NodeJS.ReadableStream>;
  }

  export default Eleventy;
}

import fs from 'fs';
import path from 'path';
import nunjucks from 'nunjucks';

// Configure Nunjucks environment (autoescape off for Markdown output)
const env = nunjucks.configure({ autoescape: false });

/**
 * Expand all template files in a directory and write to output directory.
 * @param templateDir - Directory containing template files (*.j2)
 * @param data - Data to pass to all templates
 * @param outputDir - Directory to write expanded files (*.md)
 * @throws Error if template directory doesn't exist or isn't a directory
 */
export function expandTemplateDir(
  templateDir: string,
  data: Record<string, unknown>,
  outputDir: string
): void {
  getFiles(templateDir)
    .filter(isTemplateFile)
    .forEach((templatePath) => {
      const content = expandTemplateFile(templatePath, data);
      const outputPath = toOutputPath(templatePath, templateDir, outputDir);
      writeOutput(outputPath, content);
    });
}

/**
 * Get all files from a directory, sorted alphabetically.
 */
function getFiles(dirPath: string): string[] {
  const resolvedPath = path.resolve(dirPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Template directory not found: ${resolvedPath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  return fs
    .readdirSync(resolvedPath)
    .sort()
    .map((file) => path.join(resolvedPath, file));
}

const isTemplateFile = (file: string): boolean => file.endsWith('.j2') || file.endsWith('.jinja2');

/**
 * Expand a template file with the given data.
 */
function expandTemplateFile(templatePath: string, data: Record<string, unknown>): string {
  const template = fs.readFileSync(templatePath, 'utf-8');
  return env.renderString(template, data);
}

/**
 * Convert template path to output path.
 * e.g., templates/entity.md.j2 → output/entity.md
 */
function toOutputPath(templatePath: string, templateDir: string, outputDir: string): string {
  const relativePath = path.relative(templateDir, templatePath);
  const outputName = relativePath.replace(/\.j2$|\.jinja2$/, '');
  return path.join(outputDir, outputName);
}

/**
 * Write content to file, creating directories as needed.
 */
function writeOutput(outputPath: string, content: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, content, 'utf-8');
}

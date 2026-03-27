import * as fs from 'node:fs';
import * as path from 'node:path';
import { codeBlock } from '../../utils/markdown.js';

const MAX_FILE_CHARS = 3000;

// Patterns that identify model/schema files
const MODEL_FILENAME_PATTERNS: Array<RegExp> = [
  /\.prisma$/i,
  /\.entity\.ts$/i,
  /\.entity\.js$/i,
  /\.model\.ts$/i,
  /\.model\.js$/i,
  /\.schema\.ts$/i,
  /\.schema\.js$/i,
  /\.sql$/i,
  /\.graphql$/i,
  /\.gql$/i,
];

const MIGRATION_DIR_PATTERNS = ['migrations', 'migration', 'db/migrate', 'database/migrations'];

function isModelFile(filePath: string): boolean {
  const base = path.basename(filePath);
  return MODEL_FILENAME_PATTERNS.some((pattern) => pattern.test(base));
}

function isMigrationFile(filePath: string, repoDir: string): boolean {
  const relative = path.relative(repoDir, filePath);
  return MIGRATION_DIR_PATTERNS.some((dir) => relative.startsWith(dir + path.sep) || relative.startsWith(dir + '/'));
}

function getLang(filePath: string): string {
  const ext = path.extname(filePath);
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
      return 'javascript';
    case '.sql':
      return 'sql';
    case '.prisma':
      return 'prisma';
    case '.graphql':
    case '.gql':
      return 'graphql';
    default:
      return '';
  }
}

function getAllFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

export function extractModels(repoDir: string): string {
  const files = getAllFiles(repoDir);

  const modelFiles: string[] = [];
  const migrationFiles: string[] = [];

  for (const file of files) {
    if (isMigrationFile(file, repoDir)) {
      migrationFiles.push(file);
    } else if (isModelFile(file)) {
      modelFiles.push(file);
    }
  }

  const sections: string[] = ['# Data Models & Schemas', ''];

  if (modelFiles.length === 0 && migrationFiles.length === 0) {
    sections.push('_No model, schema, or migration files detected._');
    return sections.join('\n');
  }

  if (modelFiles.length > 0) {
    sections.push('## Schema & Model Files', '');

    for (const file of modelFiles) {
      const relative = path.relative(repoDir, file);
      sections.push(`### \`${relative}\``, '');

      let content: string;
      try {
        content = fs.readFileSync(file, 'utf-8');
      } catch {
        sections.push('_Could not read file._', '');
        continue;
      }

      const truncated = content.length > MAX_FILE_CHARS ? content.slice(0, MAX_FILE_CHARS) + '\n... (truncated)' : content;

      sections.push(codeBlock(truncated, getLang(file)));
      sections.push('');
    }
  }

  if (migrationFiles.length > 0) {
    sections.push(`## Migration Files (${migrationFiles.length} total)`, '');

    // Show first 5 migrations as preview
    const preview = migrationFiles.slice(0, 5);
    for (const file of preview) {
      const relative = path.relative(repoDir, file);
      sections.push(`### \`${relative}\``, '');

      let content: string;
      try {
        content = fs.readFileSync(file, 'utf-8');
      } catch {
        sections.push('_Could not read file._', '');
        continue;
      }

      const truncated = content.length > MAX_FILE_CHARS ? content.slice(0, MAX_FILE_CHARS) + '\n... (truncated)' : content;

      sections.push(codeBlock(truncated, getLang(file)));
      sections.push('');
    }

    if (migrationFiles.length > 5) {
      sections.push(`_... and ${migrationFiles.length - 5} more migration file(s)._`, '');
    }
  }

  return sections.join('\n');
}

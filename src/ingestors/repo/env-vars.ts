import * as fs from 'node:fs';
import * as path from 'node:path';
import { table } from '../../utils/markdown.js';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.mjs', '.cjs', '.mts', '.cts']);

// Patterns for env var access
const ENV_PATTERNS: Array<{ regex: RegExp; nameGroup: number; lang: string }> = [
  // process.env.VAR_NAME
  {
    regex: /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    nameGroup: 1,
    lang: 'Node.js',
  },
  // process.env['VAR_NAME'] or process.env["VAR_NAME"]
  {
    regex: /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]]/g,
    nameGroup: 1,
    lang: 'Node.js',
  },
  // os.environ['VAR_NAME'] or os.environ["VAR_NAME"]
  {
    regex: /os\.environ\[['"]([A-Z_a-z][A-Z0-9_a-z]*)['"]]/g,
    nameGroup: 1,
    lang: 'Python',
  },
  // os.environ.get('VAR_NAME') or os.environ.get("VAR_NAME")
  {
    regex: /os\.environ\.get\s*\(\s*['"]([A-Z_a-z][A-Z0-9_a-z]*)['"]]/g,
    nameGroup: 1,
    lang: 'Python',
  },
  // os.getenv('VAR_NAME')
  {
    regex: /os\.getenv\s*\(\s*['"]([A-Z_a-z][A-Z0-9_a-z]*)['"]]/g,
    nameGroup: 1,
    lang: 'Python',
  },
  // Deno.env.get('VAR_NAME')
  {
    regex: /Deno\.env\.get\s*\(\s*['"`]([A-Z_][A-Z0-9_]*)['"`]\s*\)/g,
    nameGroup: 1,
    lang: 'Deno',
  },
  // import.meta.env.VAR_NAME (Vite)
  {
    regex: /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
    nameGroup: 1,
    lang: 'Vite',
  },
];

interface EnvVarEntry {
  name: string;
  lang: string;
  files: Set<string>;
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
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

export function scanEnvVars(repoDir: string): string {
  const files = getAllFiles(repoDir);
  const envMap = new Map<string, EnvVarEntry>();

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const relative = path.relative(repoDir, file);

    for (const pattern of ENV_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.regex.exec(content)) !== null) {
        const varName = match[pattern.nameGroup];
        if (!varName) continue;

        if (!envMap.has(varName)) {
          envMap.set(varName, { name: varName, lang: pattern.lang, files: new Set() });
        }

        envMap.get(varName)!.files.add(relative);
      }
    }
  }

  const sections: string[] = ['# Environment Variables', ''];

  if (envMap.size === 0) {
    sections.push('_No environment variable usages detected._');
    return sections.join('\n');
  }

  sections.push(`**Total unique variables:** ${envMap.size}`, '');

  const sorted = Array.from(envMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const rows = sorted.map((entry) => [
    entry.name,
    entry.lang,
    Array.from(entry.files)
      .slice(0, 3)
      .join(', ') + (entry.files.size > 3 ? ` (+${entry.files.size - 3} more)` : ''),
  ]);

  sections.push(table(['Variable', 'Runtime', 'Used In'], rows));

  return sections.join('\n');
}

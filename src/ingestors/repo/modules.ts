import * as fs from 'node:fs';
import * as path from 'node:path';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);

// Common source root directories to look for
const SOURCE_ROOTS = ['src', 'lib', 'app', 'packages'];

interface ModuleInfo {
  name: string;
  fileCount: number;
  exports: string[];
  externalImports: Set<string>;
}

function isNodeModule(importPath: string): boolean {
  // Not relative and not absolute — it's a package
  return !importPath.startsWith('.') && !importPath.startsWith('/');
}

function extractExports(content: string): string[] {
  const exports: string[] = [];

  // export function foo, export class Foo, export const foo, export async function foo
  const namedExportRegex = /^export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/gm;
  let match: RegExpExecArray | null;

  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  // export default function/class
  const defaultExportRegex = /^export\s+default\s+(?:function|class)\s+(\w+)/gm;
  while ((match = defaultExportRegex.exec(content)) !== null) {
    exports.push(`default:${match[1]}`);
  }

  // export { foo, bar }
  const reExportRegex = /^export\s*\{([^}]+)\}/gm;
  while ((match = reExportRegex.exec(content)) !== null) {
    const items = match[1]
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/).pop()!.trim())
      .filter(Boolean);
    exports.push(...items);
  }

  return [...new Set(exports)];
}

function extractExternalImports(content: string): string[] {
  const external: string[] = [];

  // import ... from 'package'
  const importFromRegex = /^import\s+(?:(?:type\s+)?(?:\*\s+as\s+\w+|\{[^}]*\}|\w+)\s*,?\s*)*from\s+['"]([^'"]+)['"]/gm;
  let match: RegExpExecArray | null;

  while ((match = importFromRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (isNodeModule(importPath)) {
      // Extract package name (handle scoped packages like @org/pkg)
      const parts = importPath.split('/');
      const pkgName = importPath.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      if (pkgName) external.push(pkgName);
    }
  }

  // require('package')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm;
  while ((match = requireRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (isNodeModule(importPath)) {
      const parts = importPath.split('/');
      const pkgName = importPath.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      if (pkgName) external.push(pkgName);
    }
  }

  return external;
}

function analyzeModule(moduleDir: string): ModuleInfo {
  const name = path.basename(moduleDir);
  let fileCount = 0;
  const exports: string[] = [];
  const externalImports = new Set<string>();

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
        if (['node_modules', 'dist', 'build', '__tests__', 'tests', 'test'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          fileCount++;

          let content: string;
          try {
            content = fs.readFileSync(fullPath, 'utf-8');
          } catch {
            continue;
          }

          exports.push(...extractExports(content));

          for (const pkg of extractExternalImports(content)) {
            externalImports.add(pkg);
          }
        }
      }
    }
  }

  walk(moduleDir);

  return {
    name,
    fileCount,
    exports: [...new Set(exports)],
    externalImports,
  };
}

function findSourceRoot(repoDir: string): string | null {
  for (const root of SOURCE_ROOTS) {
    const candidate = path.join(repoDir, root);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return null;
}

export function summarizeModules(repoDir: string): Map<string, string> {
  const result = new Map<string, string>();

  const sourceRoot = findSourceRoot(repoDir);
  if (!sourceRoot) {
    return result;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(sourceRoot, { withFileTypes: true });
  } catch {
    return result;
  }

  const subdirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

  for (const subdir of subdirs) {
    const modulePath = path.join(sourceRoot, subdir.name);
    const info = analyzeModule(modulePath);

    const lines: string[] = [
      `# Module: ${info.name}`,
      '',
      `**Files:** ${info.fileCount}`,
      `**Path:** \`${path.relative(repoDir, modulePath)}\``,
      '',
    ];

    if (info.exports.length > 0) {
      lines.push('## Exports', '');
      const preview = info.exports.slice(0, 20);
      for (const exp of preview) {
        lines.push(`- \`${exp}\``);
      }
      if (info.exports.length > 20) {
        lines.push(`- _... and ${info.exports.length - 20} more_`);
      }
      lines.push('');
    }

    if (info.externalImports.size > 0) {
      lines.push('## External Dependencies', '');
      const sorted = Array.from(info.externalImports).sort();
      for (const pkg of sorted) {
        lines.push(`- \`${pkg}\``);
      }
      lines.push('');
    }

    result.set(info.name, lines.join('\n'));
  }

  return result;
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import { minimatch } from 'minimatch';

export interface ScanStructureOptions {
  exclude?: string[];
  maxDepth?: number;
}

interface TreeEntry {
  name: string;
  type: 'file' | 'dir';
  size?: number;
  children?: TreeEntry[];
  depth: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isExcluded(filePath: string, repoDir: string, excludePatterns: string[]): boolean {
  const relative = path.relative(repoDir, filePath);
  return excludePatterns.some((pattern) => minimatch(relative, pattern, { dot: true }));
}

function walkDir(
  dir: string,
  repoDir: string,
  excludePatterns: string[],
  depth: number,
  maxDepth: number,
): TreeEntry[] {
  if (depth > maxDepth) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const result: TreeEntry[] = [];

  for (const entry of entries) {
    // Skip dotfiles/dotdirs
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);

    if (isExcluded(fullPath, repoDir, excludePatterns)) continue;

    if (entry.isDirectory()) {
      const children = walkDir(fullPath, repoDir, excludePatterns, depth + 1, maxDepth);
      result.push({ name: entry.name, type: 'dir', depth, children });
    } else if (entry.isFile()) {
      let size = 0;
      try {
        size = fs.statSync(fullPath).size;
      } catch {
        // ignore
      }
      result.push({ name: entry.name, type: 'file', size, depth });
    }
  }

  return result;
}

function renderTree(entries: TreeEntry[], prefix = ''): string[] {
  const lines: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    if (entry.type === 'dir') {
      lines.push(`${prefix}${connector}${entry.name}/`);
      if (entry.children && entry.children.length > 0) {
        lines.push(...renderTree(entry.children, childPrefix));
      }
    } else {
      const sizeStr = entry.size !== undefined ? ` (${formatSize(entry.size)})` : '';
      lines.push(`${prefix}${connector}${entry.name}${sizeStr}`);
    }
  }
  return lines;
}

function countFiles(entries: TreeEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.type === 'file') {
      count++;
    } else if (entry.children) {
      count += countFiles(entry.children);
    }
  }
  return count;
}

function countDirs(entries: TreeEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.type === 'dir') {
      count++;
      if (entry.children) {
        count += countDirs(entry.children);
      }
    }
  }
  return count;
}

export function scanStructure(repoDir: string, options: ScanStructureOptions = {}): string {
  const { exclude = [], maxDepth = 6 } = options;

  const entries = walkDir(repoDir, repoDir, exclude, 0, maxDepth);
  const treeLines = renderTree(entries);

  const repoName = path.basename(repoDir);
  const fileCount = countFiles(entries);
  const dirCount = countDirs(entries);

  const lines = [
    '# Repository Structure',
    '',
    `**Root:** \`${repoDir}\``,
    `**Stats:** ${fileCount} files, ${dirCount} directories`,
    '',
    '```',
    `${repoName}/`,
    ...treeLines,
    '```',
  ];

  return lines.join('\n');
}

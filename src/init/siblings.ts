import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

export interface SiblingRepo {
  name: string;
  path: string;
  role: string;
  manifest: string;
}

const MANIFESTS = ['package.json', 'go.mod', 'pyproject.toml', 'Cargo.toml', 'composer.json'];

const ROLE_PATTERNS: [RegExp, string][] = [
  [/backend|api|server/i, 'api_provider'],
  [/frontend|web|client|admin/i, 'frontend'],
  [/mobile|ios|android/i, 'mobile'],
  [/\bapp\b/i, 'mobile'],
  [/shared|common|types/i, 'shared_types'],
  [/infra|deploy|ops|devops/i, 'infra'],
  [/design|ui-kit|storybook/i, 'design_system'],
];

function inferRole(name: string): string {
  for (const [pattern, role] of ROLE_PATTERNS) {
    if (pattern.test(name)) return role;
  }
  return 'reference';
}

function findManifest(dir: string): string | null {
  for (const manifest of MANIFESTS) {
    if (existsSync(join(dir, manifest))) return manifest;
  }
  return null;
}

function extractName(dir: string, manifest: string): string {
  const dirName = basename(dir);
  try {
    if (manifest === 'package.json' || manifest === 'composer.json') {
      const pkg = JSON.parse(readFileSync(join(dir, manifest), 'utf-8'));
      const name = typeof pkg.name === 'string' ? pkg.name : '';
      if (manifest === 'composer.json' && name.includes('/')) return name.split('/').pop()!;
      return name || dirName;
    }
    if (manifest === 'go.mod') {
      const content = readFileSync(join(dir, manifest), 'utf-8');
      const match = content.match(/^module\s+(\S+)/m);
      return match ? match[1].split('/').pop()! : dirName;
    }
  } catch (err) {
    // Fall through to dirName if manifest is unreadable or unparseable
  }
  return dirName;
}

export function detectSiblings(projectDir: string): SiblingRepo[] {
  const parentDir = dirname(projectDir);
  const currentName = basename(projectDir);
  const siblings: SiblingRepo[] = [];

  let entries: string[];
  try {
    entries = readdirSync(parentDir);
  } catch (err) {
    return [];
  }

  for (const entry of entries) {
    if (entry === currentName || entry.startsWith('.')) continue;
    const fullPath = join(parentDir, entry);
    try {
      if (!statSync(fullPath).isDirectory()) continue;
    } catch {
      continue;
    }

    const manifest = findManifest(fullPath);
    if (!manifest) continue;

    siblings.push({
      name: extractName(fullPath, manifest),
      path: `../${entry}`,
      role: inferRole(entry),
      manifest,
    });
  }

  return siblings;
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import { table } from '../../utils/markdown.js';

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
}

function depsToRows(deps: Record<string, string>): string[][] {
  return Object.entries(deps).map(([name, version]) => [name, version]);
}

export function parseDependencies(repoDir: string): string {
  const packageJsonPath = path.join(repoDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return '# Dependencies\n\n_No package.json found in repository._\n';
  }

  let pkg: PackageJson;
  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf-8');
    pkg = JSON.parse(raw) as PackageJson;
  } catch {
    return '# Dependencies\n\n_Failed to parse package.json._\n';
  }

  const sections: string[] = ['# Dependencies', ''];

  if (pkg.name || pkg.version || pkg.description) {
    sections.push('## Package Info', '');
    if (pkg.name) sections.push(`**Name:** ${pkg.name}`);
    if (pkg.version) sections.push(`**Version:** ${pkg.version}`);
    if (pkg.description) sections.push(`**Description:** ${pkg.description}`);
    sections.push('');
  }

  if (pkg.engines && Object.keys(pkg.engines).length > 0) {
    sections.push('## Engine Requirements', '');
    sections.push(table(['Engine', 'Version'], Object.entries(pkg.engines)));
    sections.push('');
  }

  const prodDeps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};
  const peerDeps = pkg.peerDependencies ?? {};

  if (Object.keys(prodDeps).length > 0) {
    sections.push('## Production Dependencies', '');
    sections.push(table(['Package', 'Version'], depsToRows(prodDeps)));
    sections.push('');
  } else {
    sections.push('## Production Dependencies', '', '_None_', '');
  }

  if (Object.keys(devDeps).length > 0) {
    sections.push('## Dev Dependencies', '');
    sections.push(table(['Package', 'Version'], depsToRows(devDeps)));
    sections.push('');
  } else {
    sections.push('## Dev Dependencies', '', '_None_', '');
  }

  if (Object.keys(peerDeps).length > 0) {
    sections.push('## Peer Dependencies', '');
    sections.push(table(['Package', 'Version'], depsToRows(peerDeps)));
    sections.push('');
  }

  return sections.join('\n');
}

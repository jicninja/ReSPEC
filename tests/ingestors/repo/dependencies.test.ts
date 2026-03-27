import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDependencies } from '../../../src/ingestors/repo/dependencies.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'respec-deps-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('parseDependencies', () => {
  it('handles missing package.json gracefully', () => {
    const result = parseDependencies(tmpDir);
    expect(result).toContain('No package.json found');
  });

  it('includes production dependency names and versions', () => {
    const pkg = {
      name: 'my-app',
      version: '1.0.0',
      dependencies: {
        express: '^4.18.0',
        lodash: '^4.17.21',
      },
    };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2));

    const result = parseDependencies(tmpDir);

    expect(result).toContain('express');
    expect(result).toContain('^4.18.0');
    expect(result).toContain('lodash');
    expect(result).toContain('^4.17.21');
  });

  it('includes dev dependency names and versions', () => {
    const pkg = {
      name: 'my-app',
      devDependencies: {
        vitest: '^1.0.0',
        typescript: '^5.0.0',
      },
    };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2));

    const result = parseDependencies(tmpDir);

    expect(result).toContain('vitest');
    expect(result).toContain('^1.0.0');
    expect(result).toContain('typescript');
    expect(result).toContain('^5.0.0');
  });

  it('includes package name and version in info section', () => {
    const pkg = {
      name: 'cool-package',
      version: '2.3.4',
      description: 'A cool package',
    };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg));

    const result = parseDependencies(tmpDir);

    expect(result).toContain('cool-package');
    expect(result).toContain('2.3.4');
    expect(result).toContain('A cool package');
  });

  it('includes the Dependencies heading', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

    const result = parseDependencies(tmpDir);

    expect(result).toContain('# Dependencies');
  });

  it('handles package.json with no dependencies', () => {
    const pkg = { name: 'empty-pkg', version: '0.0.1' };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg));

    const result = parseDependencies(tmpDir);

    expect(result).toContain('# Dependencies');
    expect(result).toContain('None');
  });

  it('handles invalid JSON in package.json', () => {
    writeFileSync(join(tmpDir, 'package.json'), 'NOT VALID JSON {{{{');

    const result = parseDependencies(tmpDir);

    expect(result).toContain('Failed to parse');
  });

  it('includes engine requirements when present', () => {
    const pkg = {
      name: 'engine-test',
      engines: {
        node: '>=20',
      },
    };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg));

    const result = parseDependencies(tmpDir);

    expect(result).toContain('node');
    expect(result).toContain('>=20');
  });

  it('handles peer dependencies', () => {
    const pkg = {
      name: 'peer-test',
      peerDependencies: {
        react: '>=18',
      },
    };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg));

    const result = parseDependencies(tmpDir);

    expect(result).toContain('react');
    expect(result).toContain('>=18');
  });

  it('produces table format with headers', () => {
    const pkg = {
      dependencies: { axios: '^1.0.0' },
    };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg));

    const result = parseDependencies(tmpDir);

    // Table should have Package | Version headers
    expect(result).toContain('Package');
    expect(result).toContain('Version');
    // Table separator
    expect(result).toContain('---');
  });
});

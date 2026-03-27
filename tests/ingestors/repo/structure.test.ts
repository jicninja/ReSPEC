import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanStructure } from '../../../src/ingestors/repo/structure.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'respec-structure-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('scanStructure', () => {
  it('includes top-level files in output', () => {
    writeFileSync(join(tmpDir, 'index.ts'), 'export default {}');
    writeFileSync(join(tmpDir, 'package.json'), '{}');

    const result = scanStructure(tmpDir);

    expect(result).toContain('index.ts');
    expect(result).toContain('package.json');
  });

  it('includes nested directory and file names', () => {
    mkdirSync(join(tmpDir, 'src'));
    mkdirSync(join(tmpDir, 'src', 'controllers'));
    writeFileSync(join(tmpDir, 'src', 'controllers', 'user.ts'), '// user controller');
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'export {}');

    const result = scanStructure(tmpDir);

    expect(result).toContain('src');
    expect(result).toContain('controllers');
    expect(result).toContain('user.ts');
    expect(result).toContain('index.ts');
  });

  it('shows file sizes', () => {
    writeFileSync(join(tmpDir, 'large.ts'), 'a'.repeat(2048));

    const result = scanStructure(tmpDir);

    // Should contain some size indicator
    expect(result).toMatch(/\d+(\.\d+)?(B|KB|MB)/);
  });

  it('skips dotfiles and dotdirs', () => {
    writeFileSync(join(tmpDir, '.env'), 'SECRET=value');
    mkdirSync(join(tmpDir, '.git'));
    writeFileSync(join(join(tmpDir, '.git'), 'config'), 'git config');
    writeFileSync(join(tmpDir, 'visible.ts'), 'export {}');

    const result = scanStructure(tmpDir);

    expect(result).not.toContain('.env');
    expect(result).not.toContain('.git');
    expect(result).toContain('visible.ts');
  });

  it('respects exclude patterns', () => {
    mkdirSync(join(tmpDir, 'src'));
    writeFileSync(join(tmpDir, 'src', 'app.ts'), 'export {}');
    mkdirSync(join(tmpDir, 'tests'));
    writeFileSync(join(tmpDir, 'tests', 'app.test.ts'), 'test');

    const result = scanStructure(tmpDir, { exclude: ['tests/**'] });

    expect(result).toContain('src');
    expect(result).toContain('app.ts');
    // tests directory should be excluded
    expect(result).not.toContain('app.test.ts');
  });

  it('includes stats header with file and directory counts', () => {
    mkdirSync(join(tmpDir, 'src'));
    writeFileSync(join(tmpDir, 'src', 'index.ts'), '');
    writeFileSync(join(tmpDir, 'README.md'), '');

    const result = scanStructure(tmpDir);

    expect(result).toMatch(/\d+ files/);
    expect(result).toMatch(/\d+ directories/);
  });

  it('includes the repository structure heading', () => {
    const result = scanStructure(tmpDir);
    expect(result).toContain('# Repository Structure');
  });

  it('handles empty directory', () => {
    const result = scanStructure(tmpDir);
    expect(result).toContain('# Repository Structure');
    expect(result).toContain('0 files');
  });

  it('respects multiple exclude patterns', () => {
    writeFileSync(join(tmpDir, 'main.ts'), '');
    writeFileSync(join(tmpDir, 'main.test.ts'), '');
    writeFileSync(join(tmpDir, 'main.spec.ts'), '');

    const result = scanStructure(tmpDir, { exclude: ['**/*.test.ts', '**/*.spec.ts'] });

    expect(result).toContain('main.ts');
    expect(result).not.toContain('main.test.ts');
    expect(result).not.toContain('main.spec.ts');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KiroFormat } from '../../src/formats/kiro.js';
import type { FormatContext } from '../../src/formats/types.js';

let tmpDir: string;
let outputDir: string;
const adapter = new KiroFormat();

const context: FormatContext = {
  projectName: 'TestProject',
  projectDescription: 'A test project description',
  sddContent: '# System Design Document\n\nContent here.',
  analyzedDir: '',
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(join(tmpdir(), 'respec-kiro-test-'));
  outputDir = join(tmpDir, 'output');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('KiroFormat', () => {
  it('has the correct name', () => {
    expect(adapter.name).toBe('kiro');
  });

  it('creates .kiro/steering/product.md with project info', async () => {
    await adapter.package('', outputDir, context);
    const filePath = join(outputDir, '.kiro', 'steering', 'product.md');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('TestProject');
    expect(content).toContain('A test project description');
  });

  it('creates .kiro/steering/tech.md', async () => {
    await adapter.package('', outputDir, context);
    const filePath = join(outputDir, '.kiro', 'steering', 'tech.md');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('creates .kiro/steering/structure.md', async () => {
    await adapter.package('', outputDir, context);
    const filePath = join(outputDir, '.kiro', 'steering', 'structure.md');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('creates .kiro/specs/domain-model/requirements.md', async () => {
    await adapter.package('', outputDir, context);
    const filePath = join(outputDir, '.kiro', 'specs', 'domain-model', 'requirements.md');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('creates .kiro/specs/domain-model/design.md with SDD content', async () => {
    await adapter.package('', outputDir, context);
    const filePath = join(outputDir, '.kiro', 'specs', 'domain-model', 'design.md');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('System Design Document');
  });

  it('creates .kiro/specs/domain-model/tasks.md', async () => {
    await adapter.package('', outputDir, context);
    const filePath = join(outputDir, '.kiro', 'specs', 'domain-model', 'tasks.md');
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { updateConfig } from '../../src/config/loader.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(join(tmpdir(), 'respec-update-config-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('updateConfig', () => {
  it('adds intent to existing config', async () => {
    fs.writeFileSync(join(tmpDir, 'respec.config.yaml'), 'project:\n  name: TestProject\nsources:\n  repo:\n    path: .\n');
    await updateConfig(tmpDir, { 'project.intent': 'port to Fastify' });
    const content = fs.readFileSync(join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).toContain('intent: port to Fastify');
    expect(content).toContain('name: TestProject');
  });

  it('updates existing intent value', async () => {
    fs.writeFileSync(join(tmpDir, 'respec.config.yaml'), 'project:\n  name: Test\n  intent: old goal\nsources:\n  repo:\n    path: .\n');
    await updateConfig(tmpDir, { 'project.intent': 'new goal' });
    const content = fs.readFileSync(join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).toContain('intent: new goal');
    expect(content).not.toContain('old goal');
  });

  it('preserves comments', async () => {
    fs.writeFileSync(join(tmpDir, 'respec.config.yaml'), '# My project config\nproject:\n  name: Test # inline comment\nsources:\n  repo:\n    path: .\n');
    await updateConfig(tmpDir, { 'project.intent': 'refactor' });
    const content = fs.readFileSync(join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).toContain('# My project config');
    expect(content).toContain('# inline comment');
  });

  it('adds context_notes as multiline', async () => {
    fs.writeFileSync(join(tmpDir, 'respec.config.yaml'), 'project:\n  name: Test\nsources:\n  repo:\n    path: .\n');
    await updateConfig(tmpDir, { 'project.context_notes': 'Focus on backend\nSkip UI' });
    const content = fs.readFileSync(join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).toContain('context_notes');
    expect(content).toContain('Focus on backend');
  });
});

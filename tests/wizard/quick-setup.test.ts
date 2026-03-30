import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  text: vi.fn(),
  log: { info: vi.fn(), success: vi.fn(), step: vi.fn() },
  isCancel: vi.fn(() => false),
}));

import * as clack from '@clack/prompts';
import { runQuickSetup } from '../../src/wizard/quick-setup.js';

const mockSelect = vi.mocked(clack.select);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(join(tmpdir(), 'respec-quick-setup-'));
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('runQuickSetup', () => {
  it('creates config file with detected project name', async () => {
    fs.writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'my-app', description: 'Test app' }));
    mockSelect.mockResolvedValueOnce('openspec');
    mockSelect.mockResolvedValueOnce('full system specification');

    await runQuickSetup(tmpDir);

    const configPath = join(tmpDir, 'respec.config.yaml');
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('my-app');
  });

  it('includes intent when non-default project type selected', async () => {
    fs.writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'my-app' }));
    mockSelect.mockResolvedValueOnce('superpowers');
    mockSelect.mockResolvedValueOnce('refactor');

    await runQuickSetup(tmpDir);

    const content = fs.readFileSync(join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).toContain('intent: refactor');
  });

  it('omits intent for full system specification', async () => {
    fs.writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'my-app' }));
    mockSelect.mockResolvedValueOnce('openspec');
    mockSelect.mockResolvedValueOnce('full system specification');

    await runQuickSetup(tmpDir);

    const content = fs.readFileSync(join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).not.toContain('intent');
  });
});

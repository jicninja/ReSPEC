import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runInit } from '../../src/commands/init.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('init command', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'respec-init-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

  it('creates respec.config.yaml', async () => {
    await runInit(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'respec.config.yaml'))).toBe(true);
  });

  it('config is valid YAML with correct defaults', async () => {
    await runInit(tmpDir);
    const { loadConfig } = await import('../../src/config/loader.js');
    const config = await loadConfig(tmpDir);
    expect(config.output.format).toBe('openspec');
    expect(config.ai.engines).toBeDefined();
    expect(config.ai.engines.claude).toBeDefined();
    expect(config.ai.max_parallel).toBe(4);
  });

  it('does not overwrite existing config', async () => {
    fs.writeFileSync(path.join(tmpDir, 'respec.config.yaml'), 'existing: true');
    await runInit(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).toBe('existing: true');
  });

  it('detects project name from package.json', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'detected-app',
      description: 'Auto detected',
    }));
    await runInit(tmpDir);
    const { loadConfig } = await import('../../src/config/loader.js');
    const config = await loadConfig(tmpDir);
    expect(config.project.name).toBe('detected-app');
  });

  it('appends Jira/docs guide as comments in CLI mode', async () => {
    await runInit(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).toContain('# To add Jira');
    expect(content).toContain('JIRA_API_TOKEN');
  });
});

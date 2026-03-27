import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runStatus } from '../../src/commands/status.js';
import { StateManager } from '../../src/state/manager.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('status command', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'respec-status-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

  it('runs without error on empty project', async () => {
    await expect(runStatus(tmpDir, {})).resolves.not.toThrow();
  });

  it('shows ingest state after ingestion', async () => {
    const state = new StateManager(tmpDir);
    state.completeIngest({ sources: { repo: true, jira: false, docs: false }, stats: { files: 10, tickets: 0, pages: 0 } });
    // Should not throw
    await runStatus(tmpDir, { verbose: true });
  });
});

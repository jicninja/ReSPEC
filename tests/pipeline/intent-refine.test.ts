import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIntentRefinePrompt, parseIntentRefineResponse } from '../../src/pipeline/intent-refine.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(join(tmpdir(), 'respec-intent-refine-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('buildIntentRefinePrompt', () => {
  it('includes analysis report and intent', () => {
    const analyzedDir = join(tmpDir, 'analyzed');
    fs.mkdirSync(analyzedDir, { recursive: true });
    fs.writeFileSync(join(analyzedDir, '_analysis-report.md'), '# Report\n3 bounded contexts');

    const prompt = buildIntentRefinePrompt(analyzedDir, 'port to Fastify', 'Target: Fastify');
    expect(prompt).toContain('3 bounded contexts');
    expect(prompt).toContain('port to Fastify');
    expect(prompt).toContain('Target: Fastify');
  });
});

describe('parseIntentRefineResponse', () => {
  it('parses valid response', () => {
    const response = JSON.stringify({
      recommendations: ['Start with User module', 'Extract auth first'],
      suggested_focus: ['user-management', 'auth'],
    });
    const result = parseIntentRefineResponse(response);
    expect(result).not.toBeNull();
    expect(result!.recommendations).toHaveLength(2);
  });

  it('returns null for invalid response', () => {
    expect(parseIntentRefineResponse('invalid')).toBeNull();
  });
});

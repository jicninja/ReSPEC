import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIntentSuggestPrompt, parseIntentSuggestResponse } from '../../src/pipeline/intent-suggest.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(join(tmpdir(), 'respec-intent-suggest-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('buildIntentSuggestPrompt', () => {
  it('includes dependency and structure content', () => {
    const rawDir = join(tmpDir, 'raw');
    fs.mkdirSync(join(rawDir, 'repo'), { recursive: true });
    fs.writeFileSync(join(rawDir, 'repo', 'dependencies.md'), '# Deps\n- express: 4.18');
    fs.writeFileSync(join(rawDir, 'repo', 'structure.md'), '# Structure\nsrc/\n  routes/');

    const prompt = buildIntentSuggestPrompt(rawDir, 'port / migration');
    expect(prompt).toContain('express: 4.18');
    expect(prompt).toContain('routes/');
    expect(prompt).toContain('port / migration');
  });

  it('returns null when raw files missing', () => {
    const prompt = buildIntentSuggestPrompt(join(tmpDir, 'nonexistent'), 'refactor');
    expect(prompt).toBeNull();
  });
});

describe('parseIntentSuggestResponse', () => {
  it('parses valid JSON response with questions', () => {
    const response = JSON.stringify({
      questions: [
        { id: 'target', text: 'Target framework?', type: 'text' },
        { id: 'modules', text: 'Which modules?', type: 'multiselect', options: ['auth', 'users'] },
      ],
      summary: 'Express 4.18 monolith',
    });
    const result = parseIntentSuggestResponse(response);
    expect(result).not.toBeNull();
    expect(result!.questions).toHaveLength(2);
    expect(result!.summary).toBe('Express 4.18 monolith');
  });

  it('handles markdown-wrapped JSON', () => {
    const response = '```json\n{"questions":[],"summary":"test"}\n```';
    const result = parseIntentSuggestResponse(response);
    expect(result).not.toBeNull();
  });

  it('returns null for invalid response', () => {
    expect(parseIntentSuggestResponse('not json')).toBeNull();
  });
});

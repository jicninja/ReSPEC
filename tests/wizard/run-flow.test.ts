import { describe, it, expect } from 'vitest';
import { getRunSteps } from '../../src/wizard/run-flow.js';

describe('getRunSteps', () => {
  it('returns all steps from empty state without intent', () => {
    const steps = getRunSteps('empty', undefined);
    expect(steps[0].id).toBe('intent-type');
    expect(steps[1].id).toBe('ingest');
    expect(steps.map((s) => s.id)).toContain('analyze');
    expect(steps.map((s) => s.id)).toContain('generate');
    expect(steps.map((s) => s.id)).toContain('export');
  });

  it('skips intent-type when intent already set', () => {
    const steps = getRunSteps('empty', 'port to Fastify');
    expect(steps[0].id).toBe('ingest');
  });

  it('starts from analyze when state is ingested', () => {
    const steps = getRunSteps('ingested', undefined);
    expect(steps[0].id).toBe('intent-suggest');
  });

  it('starts from generate when state is analyzed', () => {
    const steps = getRunSteps('analyzed', undefined);
    expect(steps[0].id).toBe('intent-refine');
  });

  it('returns only export when state is generated', () => {
    const steps = getRunSteps('generated', undefined);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe('export');
  });
});

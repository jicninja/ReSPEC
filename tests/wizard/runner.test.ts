import { describe, it, expect } from 'vitest';
import { getAutopilotSteps } from '../../src/wizard/runner.js';

describe('getAutopilotSteps', () => {
  it('returns full pipeline from empty state', () => {
    const steps = getAutopilotSteps('empty');
    expect(steps).toEqual(['ingest', 'analyze', 'generate', 'export']);
  });

  it('returns remaining steps from ingested', () => {
    const steps = getAutopilotSteps('ingested');
    expect(steps).toEqual(['analyze', 'generate', 'export']);
  });

  it('returns remaining steps from analyzed', () => {
    const steps = getAutopilotSteps('analyzed');
    expect(steps).toEqual(['generate', 'export']);
  });

  it('returns empty from generated', () => {
    const steps = getAutopilotSteps('generated');
    expect(steps).toEqual([]);
  });
});

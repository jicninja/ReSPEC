import { describe, it, expect } from 'vitest';
import { buildMenuOptions } from '../../src/wizard/menu.js';

describe('buildMenuOptions', () => {
  it('offers init when no config exists', () => {
    const options = buildMenuOptions('no-config');
    const values = options.map(o => o.value);
    expect(values).toContain('init');
    expect(values).toContain('exit');
    expect(values).not.toContain('ingest');
  });

  it('offers ingest and autopilot when config exists but empty', () => {
    const options = buildMenuOptions('empty');
    const values = options.map(o => o.value);
    expect(values).toContain('ingest');
    expect(values).toContain('autopilot');
    expect(values).toContain('exit');
  });

  it('offers analyze after ingested', () => {
    const options = buildMenuOptions('ingested');
    const values = options.map(o => o.value);
    expect(values).toContain('analyze');
    expect(values).toContain('autopilot');
  });

  it('offers generate after analyzed', () => {
    const options = buildMenuOptions('analyzed');
    const values = options.map(o => o.value);
    expect(values).toContain('generate');
    expect(values).toContain('autopilot');
  });

  it('offers export after generated', () => {
    const options = buildMenuOptions('generated');
    const values = options.map(o => o.value);
    expect(values).toContain('export');
    expect(values).not.toContain('autopilot');
  });

  it('marks the first option as recommended', () => {
    const options = buildMenuOptions('ingested');
    expect(options[0].hint).toContain('recommended');
  });
});

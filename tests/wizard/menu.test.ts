import { describe, it, expect } from 'vitest';
import { buildMenuOptions } from '../../src/wizard/menu.js';

describe('buildMenuOptions', () => {
  it('offers quick-setup, init, and init-detailed when no config exists', () => {
    const options = buildMenuOptions('no-config');
    const values = options.map(o => o.value);
    expect(values).toContain('quick-setup');
    expect(values).toContain('init');
    expect(values).toContain('init-detailed');
    expect(values).toContain('exit');
    expect(values).not.toContain('ingest');
  });

  it('marks quick-setup as recommended when no config exists', () => {
    const options = buildMenuOptions('no-config');
    const recommended = options.find(o => o.hint?.includes('recommended'));
    expect(recommended?.value).toBe('quick-setup');
  });

  it('offers run and ingest when config exists but empty', () => {
    const options = buildMenuOptions('empty');
    const values = options.map(o => o.value);
    expect(values).toContain('run');
    expect(values).toContain('ingest');
    expect(values).toContain('exit');
    expect(values).not.toContain('autopilot');
  });

  it('marks run as recommended when empty', () => {
    const options = buildMenuOptions('empty');
    const recommended = options.find(o => o.hint?.includes('recommended'));
    expect(recommended?.value).toBe('run');
  });

  it('offers continue after ingested', () => {
    const options = buildMenuOptions('ingested');
    const values = options.map(o => o.value);
    expect(values).toContain('continue');
    expect(values).toContain('analyze');
    expect(values).not.toContain('autopilot');
  });

  it('marks continue as recommended after ingested', () => {
    const options = buildMenuOptions('ingested');
    const recommended = options.find(o => o.hint?.includes('recommended'));
    expect(recommended?.value).toBe('continue');
  });

  it('offers continue after analyzed', () => {
    const options = buildMenuOptions('analyzed');
    const values = options.map(o => o.value);
    expect(values).toContain('continue');
    expect(values).toContain('generate');
    expect(values).not.toContain('autopilot');
  });

  it('marks continue as recommended after analyzed', () => {
    const options = buildMenuOptions('analyzed');
    const recommended = options.find(o => o.hint?.includes('recommended'));
    expect(recommended?.value).toBe('continue');
  });

  it('offers export after generated', () => {
    const options = buildMenuOptions('generated');
    const values = options.map(o => o.value);
    expect(values).toContain('export');
    expect(values).not.toContain('autopilot');
  });

  it('marks export as recommended after generated', () => {
    const options = buildMenuOptions('generated');
    const recommended = options.find(o => o.hint?.includes('recommended'));
    expect(recommended?.value).toBe('export');
  });
});

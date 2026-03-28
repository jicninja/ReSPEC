import { describe, it, expect } from 'vitest';
import { buildSplashText } from '../../src/wizard/splash.js';

describe('buildSplashText', () => {
  it('includes ASCII art logo', () => {
    const text = buildSplashText('0.1.0');
    expect(text).toContain('╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗');
    expect(text).toContain('╠╦╝║╣ ╚═╗╠═╝║╣ ║');
    expect(text).toContain('╩╚═╚═╝╚═╝╩  ╚═╝╚═╝');
  });

  it('includes tagline', () => {
    const text = buildSplashText('0.1.0');
    expect(text).toContain('reverse engineering');
  });

  it('includes version', () => {
    const text = buildSplashText('1.2.3');
    expect(text).toContain('v1.2.3');
  });
});

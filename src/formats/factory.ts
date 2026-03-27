import type { FormatAdapter } from './types.js';
import { KiroFormat } from './kiro.js';
import { OpenSpecFormat } from './openspec.js';
import { AntigravityFormat } from './antigravity.js';
import { SuperpowersFormat } from './superpowers.js';

export function createFormatAdapter(format: string): FormatAdapter {
  switch (format) {
    case 'kiro':
      return new KiroFormat();
    case 'openspec':
      return new OpenSpecFormat();
    case 'antigravity':
      return new AntigravityFormat();
    case 'superpowers':
      return new SuperpowersFormat();
    default:
      throw new Error(`Unknown format: "${format}". Supported formats: kiro, openspec, antigravity, superpowers`);
  }
}

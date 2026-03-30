import * as fs from 'node:fs';

export function readFileOrEmpty(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

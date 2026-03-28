import chalk from 'chalk';
import { TUI_BRAND_COLOR } from '../constants.js';

const LOGO = `
  ╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗
  ╠╦╝║╣ ╚═╗╠═╝║╣ ║
  ╩╚═╚═╝╚═╝╩  ╚═╝╚═╝`;

const TAGLINE = '  reverse engineering → spec';

export function buildSplashText(version: string): string {
  return `${LOGO}\n${TAGLINE}\n\n  v${version}`;
}

export function showSplash(version: string): void {
  const brand = chalk.hex(TUI_BRAND_COLOR);
  console.log(brand(LOGO));
  console.log(chalk.dim(TAGLINE));
  console.log(chalk.dim(`\n  v${version}\n`));
}

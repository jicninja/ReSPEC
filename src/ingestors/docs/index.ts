import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureDir, writeMarkdown } from '../../utils/fs.js';
import type { Ingestor, IngestorResult } from '../types.js';

const SUPPORTED_EXTENSIONS = new Set(['.md', '.txt', '.rst']);

export interface ConfluenceConfig {
  host: string;
  space: string;
  auth: string;
}

export interface DocsConfig {
  confluence?: ConfluenceConfig;
  local?: string[];
}

export class DocsIngestor implements Ingestor {
  readonly name = 'docs';

  constructor(
    private readonly config: DocsConfig,
    private readonly outputDir: string,
    private readonly projectDir: string,
  ) {}

  async ingest(): Promise<IngestorResult> {
    const docsDir = path.join(this.outputDir, 'docs');
    ensureDir(docsDir);

    let fileCount = 0;
    const artifacts: string[] = [];

    // 1. Capture root README.md if it exists
    const readmeSrc = path.join(this.projectDir, 'README.md');
    if (fs.existsSync(readmeSrc)) {
      const readmeDest = path.join(docsDir, 'readme.md');
      const content = fs.readFileSync(readmeSrc, 'utf-8');
      writeMarkdown(readmeDest, content);
      fileCount++;
      artifacts.push(readmeDest);
    }

    // 2. Process local paths
    if (this.config.local && this.config.local.length > 0) {
      const localDir = path.join(docsDir, 'local');
      ensureDir(localDir);

      for (const localPath of this.config.local) {
        if (!fs.existsSync(localPath)) continue;

        const stat = fs.statSync(localPath);
        if (stat.isDirectory()) {
          const copied = this.copyDocDir(localPath, localDir);
          fileCount += copied.length;
          artifacts.push(...copied);
        } else if (stat.isFile()) {
          const ext = path.extname(localPath).toLowerCase();
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            const destFile = path.join(localDir, path.basename(localPath));
            const content = fs.readFileSync(localPath, 'utf-8');
            writeMarkdown(destFile, content);
            fileCount++;
            artifacts.push(destFile);
          }
        }
      }
    }

    // 3. Confluence placeholder
    if (this.config.confluence) {
      const placeholderPath = path.join(docsDir, '_confluence-pending.md');
      const content = [
        '# Confluence Import — Pending',
        '',
        `> This file is a placeholder. confluence ingestion has not been implemented yet.`,
        '',
        '## Configuration',
        '',
        `- **Host:** ${this.config.confluence.host}`,
        `- **Space:** ${this.config.confluence.space}`,
        `- **Auth:** ${this.config.confluence.auth}`,
        '',
        'Run `respec ingest --source docs` once confluence support is available.',
      ].join('\n');
      writeMarkdown(placeholderPath, content);
      artifacts.push(placeholderPath);
    }

    return { files: fileCount, artifacts };
  }

  private copyDocDir(srcDir: string, destDir: string): string[] {
    const copied: string[] = [];
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      if (entry.isDirectory()) {
        const subDestDir = path.join(destDir, entry.name);
        ensureDir(subDestDir);
        copied.push(...this.copyDocDir(srcPath, subDestDir));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          const destPath = path.join(destDir, entry.name);
          const content = fs.readFileSync(srcPath, 'utf-8');
          writeMarkdown(destPath, content);
          copied.push(destPath);
        }
      }
    }

    return copied;
  }
}

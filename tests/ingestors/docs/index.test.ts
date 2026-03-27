import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DocsIngestor } from '../../../src/ingestors/docs/index.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'respec-docs-test-'));
}

describe('DocsIngestor', () => {
  let tmpDir: string;
  let outputDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    outputDir = path.join(tmpDir, 'output');
    projectDir = path.join(tmpDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('ingests local doc files from a directory', async () => {
    // Create local docs directory with some files
    const docsSourceDir = path.join(tmpDir, 'my-docs');
    fs.mkdirSync(docsSourceDir, { recursive: true });
    fs.writeFileSync(path.join(docsSourceDir, 'guide.md'), '# Guide\nSome guide content');
    fs.writeFileSync(path.join(docsSourceDir, 'notes.txt'), 'Some notes');

    const ingestor = new DocsIngestor(
      { local: [docsSourceDir] },
      outputDir,
      projectDir,
    );

    const result = await ingestor.ingest();

    expect(result.files).toBeGreaterThan(0);
    expect(result.artifacts.length).toBeGreaterThan(0);

    const localOutputDir = path.join(outputDir, 'docs', 'local');
    const outputFiles = fs.readdirSync(localOutputDir, { recursive: true }) as string[];
    const fileNames = outputFiles.filter((f) => {
      const full = path.join(localOutputDir, f);
      return fs.statSync(full).isFile();
    });
    expect(fileNames.some((f) => f.includes('guide.md'))).toBe(true);
    expect(fileNames.some((f) => f.includes('notes.txt'))).toBe(true);
  });

  it('ingests a single local doc file', async () => {
    const singleFile = path.join(tmpDir, 'single.md');
    fs.writeFileSync(singleFile, '# Single\nContent');

    const ingestor = new DocsIngestor(
      { local: [singleFile] },
      outputDir,
      projectDir,
    );

    const result = await ingestor.ingest();

    expect(result.files).toBeGreaterThanOrEqual(1);
    const localOutputDir = path.join(outputDir, 'docs', 'local');
    const outputFiles = fs.readdirSync(localOutputDir) as string[];
    expect(outputFiles.some((f) => f === 'single.md')).toBe(true);
  });

  it('captures root README.md into docs/readme.md', async () => {
    fs.writeFileSync(path.join(projectDir, 'README.md'), '# My Project\nProject readme');

    const ingestor = new DocsIngestor({}, outputDir, projectDir);

    const result = await ingestor.ingest();

    const readmePath = path.join(outputDir, 'docs', 'readme.md');
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('My Project');
    expect(result.files).toBeGreaterThanOrEqual(1);
    expect(result.artifacts.some((a) => a.endsWith('readme.md'))).toBe(true);
  });

  it('handles missing README gracefully', async () => {
    // projectDir has no README.md
    const ingestor = new DocsIngestor({}, outputDir, projectDir);

    const result = await ingestor.ingest();

    expect(result.files).toBe(0);
    expect(result.artifacts).toHaveLength(0);
  });

  it('writes confluence placeholder when confluence config is set', async () => {
    const ingestor = new DocsIngestor(
      { confluence: { host: 'https://example.atlassian.net', space: 'PROJ', auth: 'env:CONFLUENCE_TOKEN' } },
      outputDir,
      projectDir,
    );

    const result = await ingestor.ingest();

    const placeholderPath = path.join(outputDir, 'docs', '_confluence-pending.md');
    expect(fs.existsSync(placeholderPath)).toBe(true);
    const content = fs.readFileSync(placeholderPath, 'utf-8');
    expect(content).toContain('confluence');
    expect(result.artifacts.some((a) => a.endsWith('_confluence-pending.md'))).toBe(true);
  });

  it('recursively copies nested doc files from a directory', async () => {
    const docsSourceDir = path.join(tmpDir, 'nested-docs');
    const subDir = path.join(docsSourceDir, 'subdir');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(docsSourceDir, 'top.md'), '# Top');
    fs.writeFileSync(path.join(subDir, 'nested.md'), '# Nested');
    fs.writeFileSync(path.join(subDir, 'data.json'), '{}'); // should be ignored

    const ingestor = new DocsIngestor(
      { local: [docsSourceDir] },
      outputDir,
      projectDir,
    );

    const result = await ingestor.ingest();

    expect(result.files).toBe(2); // only .md files
    const localOutputDir = path.join(outputDir, 'docs', 'local');
    const allFiles = fs.readdirSync(localOutputDir, { recursive: true }) as string[];
    const mdFiles = allFiles.filter((f) => {
      const full = path.join(localOutputDir, f);
      return fs.statSync(full).isFile();
    });
    expect(mdFiles.some((f) => f.includes('top.md'))).toBe(true);
    expect(mdFiles.some((f) => f.includes('nested.md'))).toBe(true);
  });

  it('has name "docs"', () => {
    const ingestor = new DocsIngestor({}, outputDir, projectDir);
    expect(ingestor.name).toBe('docs');
  });
});

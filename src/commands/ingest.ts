import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadConfig } from '../config/loader.js';
import { StateManager } from '../state/manager.js';
import { RepoIngestor } from '../ingestors/repo/index.js';
import { JiraIngestor } from '../ingestors/jira/index.js';
import { DocsIngestor } from '../ingestors/docs/index.js';
import { rawDir, writeMarkdown } from '../utils/fs.js';
import { timestamp } from '../utils/markdown.js';

export async function runIngest(
  dir: string,
  options: { source?: string; force?: boolean }
): Promise<void> {
  const config = await loadConfig(dir);
  const state = new StateManager(dir);
  const outputDir = rawDir(dir);

  const sourceFilter = options.source;

  let repoFiles = 0;
  let jiraTickets = 0;
  let docsPages = 0;
  let repoRan = false;
  let jiraRan = false;
  let docsRan = false;

  // Repo ingestor
  if (!sourceFilter || sourceFilter === 'repo') {
    console.log('Ingesting repo...');
    const repoIngestor = new RepoIngestor(config.sources.repo, outputDir);
    const result = await repoIngestor.ingest();
    repoFiles = result.files;
    repoRan = true;
    console.log(`  Repo: ${repoFiles} files written`);
  }

  // Jira ingestor
  if ((!sourceFilter || sourceFilter === 'jira') && config.sources.jira) {
    console.log('Ingesting Jira...');
    const jiraIngestor = new JiraIngestor(config.sources.jira, outputDir);
    const result = await jiraIngestor.ingest();
    jiraTickets = result.files;
    jiraRan = true;
    console.log(`  Jira: ${jiraTickets} artifacts written`);
  } else if (sourceFilter === 'jira' && !config.sources.jira) {
    console.warn('  Jira source not configured in respec.config.yaml — skipping');
  }

  // Docs ingestor
  if ((!sourceFilter || sourceFilter === 'docs') && config.sources.docs) {
    console.log('Ingesting docs...');
    const docsIngestor = new DocsIngestor(config.sources.docs, outputDir, dir);
    const result = await docsIngestor.ingest();
    docsPages = result.files;
    docsRan = true;
    console.log(`  Docs: ${docsPages} files written`);
  } else if (sourceFilter === 'docs' && !config.sources.docs) {
    console.warn('  Docs source not configured in respec.config.yaml — skipping');
  }

  // Write _manifest.md
  const manifestLines = [
    '# Raw Ingest Manifest',
    '',
    `**Generated:** ${timestamp()}`,
    `**Project:** ${config.project.name}`,
    '',
    '## Sources Ingested',
    '',
    `- **repo**: ${repoRan ? `yes (${repoFiles} files)` : 'skipped'}`,
    `- **jira**: ${jiraRan ? `yes (${jiraTickets} artifacts)` : config.sources.jira ? 'skipped' : 'not configured'}`,
    `- **docs**: ${docsRan ? `yes (${docsPages} files)` : config.sources.docs ? 'skipped' : 'not configured'}`,
  ];

  const manifestPath = path.join(outputDir, '_manifest.md');
  writeMarkdown(manifestPath, manifestLines.join('\n'));

  state.completeIngest({
    sources: {
      repo: repoRan,
      jira: jiraRan,
      docs: docsRan,
    },
    stats: {
      files: repoFiles,
      tickets: jiraTickets,
      pages: docsPages,
    },
  });

  console.log('Ingest complete. Pipeline phase: ingested');
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import { writeMarkdown, ensureDir } from '../../utils/fs.js';
import { cloneIfRemote } from '../../utils/git.js';
import { scanStructure } from './structure.js';
import { parseDependencies } from './dependencies.js';
import { detectEndpoints } from './endpoints.js';
import { extractModels } from './models.js';
import { scanEnvVars } from './env-vars.js';
import { summarizeModules } from './modules.js';
import { timestamp } from '../../utils/markdown.js';
import type { Ingestor, IngestorResult } from '../types.js';

export interface RepoIngestorConfig {
  path: string;
  branch?: string;
  include?: string[];
  exclude?: string[];
}

export class RepoIngestor implements Ingestor {
  readonly name = 'repo';

  private config: RepoIngestorConfig;
  private outputDir: string;

  constructor(config: RepoIngestorConfig, outputDir: string) {
    this.config = config;
    this.outputDir = outputDir;
  }

  async ingest(): Promise<IngestorResult> {
    const artifacts: string[] = [];

    // Clone if remote, otherwise use the local path
    const tmpCloneDir = path.join(this.outputDir, '_clone_tmp');
    const repoDir = await cloneIfRemote(this.config.path, tmpCloneDir);

    if (!fs.existsSync(repoDir)) {
      throw new Error(`Repository path does not exist: ${repoDir}`);
    }

    const repoOutputDir = path.join(this.outputDir, 'repo');
    ensureDir(repoOutputDir);

    const exclude = this.config.exclude ?? [];

    // 1. Structure
    const structureMd = scanStructure(repoDir, { exclude });
    const structurePath = path.join(repoOutputDir, 'structure.md');
    writeMarkdown(structurePath, structureMd);
    artifacts.push(structurePath);

    // 2. Dependencies
    const depsMd = parseDependencies(repoDir);
    const depsPath = path.join(repoOutputDir, 'dependencies.md');
    writeMarkdown(depsPath, depsMd);
    artifacts.push(depsPath);

    // 3. Endpoints
    const endpointsMd = detectEndpoints(repoDir, { exclude });
    const endpointsPath = path.join(repoOutputDir, 'endpoints.md');
    writeMarkdown(endpointsPath, endpointsMd);
    artifacts.push(endpointsPath);

    // 4. Models
    const modelsMd = extractModels(repoDir);
    const modelsPath = path.join(repoOutputDir, 'models.md');
    writeMarkdown(modelsPath, modelsMd);
    artifacts.push(modelsPath);

    // 5. Env vars
    const envMd = scanEnvVars(repoDir);
    const envPath = path.join(repoOutputDir, 'env-vars.md');
    writeMarkdown(envPath, envMd);
    artifacts.push(envPath);

    // 6. Modules
    const modulesMap = summarizeModules(repoDir);
    const modulesDir = path.join(repoOutputDir, 'modules');
    ensureDir(modulesDir);

    for (const [moduleName, moduleMd] of modulesMap) {
      const modulePath = path.join(modulesDir, `${moduleName}.md`);
      writeMarkdown(modulePath, moduleMd);
      artifacts.push(modulePath);
    }

    // 7. Manifest
    const manifestLines = [
      '# Raw Ingest Manifest — Repo',
      '',
      `**Ingested at:** ${timestamp()}`,
      `**Source path:** ${this.config.path}`,
      `**Resolved dir:** ${repoDir}`,
      `**Branch:** ${this.config.branch ?? 'main'}`,
      '',
      '## Artifacts Produced',
      '',
      ...artifacts.map((a) => `- \`${path.relative(this.outputDir, a)}\``),
      '',
      `**Total artifacts:** ${artifacts.length}`,
    ];

    const manifestPath = path.join(repoOutputDir, '_manifest.md');
    writeMarkdown(manifestPath, manifestLines.join('\n'));
    artifacts.push(manifestPath);

    return {
      files: artifacts.length,
      artifacts,
    };
  }
}

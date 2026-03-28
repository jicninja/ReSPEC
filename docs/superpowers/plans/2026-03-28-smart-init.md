# Smart Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `respec init` auto-detect project metadata, source patterns, and sibling repos from manifest files, and add an interactive wizard flow for guided config creation with Jira/docs integration.

**Architecture:** Two new detector modules (`src/init/detect.ts` and `src/init/siblings.ts`) provide pure functions that read the filesystem. `src/commands/init.ts` uses them for CLI mode. `src/wizard/index.ts` uses them as defaults for the interactive clack flow. Detection is best-effort — always produces valid config even if nothing is found.

**Tech Stack:** Node.js fs (sync reads), `@clack/prompts` (wizard), vitest (testing)

---

### Task 1: Project Detector

**Files:**
- Create: `src/init/detect.ts`
- Test: `tests/init/detect.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/init/detect.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectProject } from '../../src/init/detect.js';

describe('detectProject', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'respec-detect-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

  it('detects name and description from package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-app',
      description: 'A cool app',
      version: '2.0.0',
    }));
    const info = detectProject(tmpDir);
    expect(info.name).toBe('my-app');
    expect(info.description).toContain('A cool app');
    expect(info.version).toBe('2.0.0');
  });

  it('detects name from go.mod', () => {
    fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module github.com/user/my-service\n\ngo 1.21\n');
    const info = detectProject(tmpDir);
    expect(info.name).toBe('my-service');
  });

  it('detects name from pyproject.toml', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "my-python-app"\ndescription = "A Python app"\nversion = "1.0.0"\n');
    const info = detectProject(tmpDir);
    expect(info.name).toBe('my-python-app');
    expect(info.description).toContain('Python app');
  });

  it('detects name from Cargo.toml', () => {
    fs.writeFileSync(path.join(tmpDir, 'Cargo.toml'), '[package]\nname = "my-rust-app"\nversion = "0.1.0"\n');
    const info = detectProject(tmpDir);
    expect(info.name).toBe('my-rust-app');
  });

  it('detects name from composer.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'composer.json'), JSON.stringify({
      name: 'vendor/my-php-app',
      description: 'A PHP project',
    }));
    const info = detectProject(tmpDir);
    expect(info.name).toBe('my-php-app');
  });

  it('falls back to directory basename when no manifest', () => {
    const info = detectProject(tmpDir);
    expect(info.name).toBe(path.basename(tmpDir));
  });

  it('detects src/ as include pattern', () => {
    fs.mkdirSync(path.join(tmpDir, 'src'));
    const info = detectProject(tmpDir);
    expect(info.includes).toContain('src/**');
  });

  it('detects lib/ as include pattern', () => {
    fs.mkdirSync(path.join(tmpDir, 'lib'));
    const info = detectProject(tmpDir);
    expect(info.includes).toContain('lib/**');
  });

  it('reads .gitignore for exclude patterns', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules\ndist\n.env\n');
    const info = detectProject(tmpDir);
    expect(info.excludes).toContain('node_modules/**');
    expect(info.excludes).toContain('dist/**');
  });

  it('enriches description with framework detection', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-app',
      dependencies: { react: '^18.0.0' },
      devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' },
    }));
    const info = detectProject(tmpDir);
    expect(info.description).toMatch(/react/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/init/detect.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement detector**

```typescript
// src/init/detect.ts
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

export interface ProjectInfo {
  name: string;
  description: string;
  version?: string;
  includes: string[];
  excludes: string[];
}

const SOURCE_ROOTS = ['src', 'lib', 'app', 'packages'];
const DEFAULT_EXCLUDES = ['node_modules/**', 'dist/**', '.git/**'];

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function readTextFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function parseTomlValue(content: string, key: string): string | undefined {
  const match = content.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match?.[1];
}

function detectFrameworks(dir: string): string[] {
  const frameworks: string[] = [];
  const pkg = readJson(join(dir, 'package.json')) as Record<string, Record<string, string>> | null;
  if (!pkg) return frameworks;

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (allDeps.react || allDeps['react-dom']) frameworks.push('React');
  if (allDeps.next) frameworks.push('Next.js');
  if (allDeps.vue) frameworks.push('Vue');
  if (allDeps['@angular/core']) frameworks.push('Angular');
  if (allDeps.svelte) frameworks.push('Svelte');
  if (allDeps.express) frameworks.push('Express');
  if (allDeps['@nestjs/core']) frameworks.push('NestJS');
  if (allDeps.fastify) frameworks.push('Fastify');
  if (allDeps.vite) frameworks.push('Vite');
  if (allDeps.typescript) frameworks.push('TypeScript');
  return frameworks;
}

function detectIncludes(dir: string): string[] {
  const includes: string[] = [];
  for (const root of SOURCE_ROOTS) {
    if (existsSync(join(dir, root))) {
      includes.push(`${root}/**`);
    }
  }
  return includes.length > 0 ? includes : ['**'];
}

function detectExcludes(dir: string): string[] {
  const excludes = new Set(DEFAULT_EXCLUDES);
  const gitignore = readTextFile(join(dir, '.gitignore'));
  if (gitignore) {
    for (const line of gitignore.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const clean = trimmed.replace(/^\//, '').replace(/\/$/, '');
      if (clean && !clean.includes('*')) {
        excludes.add(`${clean}/**`);
      }
    }
  }
  return [...excludes];
}

export function detectProject(dir: string): ProjectInfo {
  const fallbackName = basename(dir);
  let name = fallbackName;
  let description = '';
  let version: string | undefined;

  // package.json
  const pkg = readJson(join(dir, 'package.json'));
  if (pkg) {
    if (typeof pkg.name === 'string') name = pkg.name;
    if (typeof pkg.description === 'string') description = pkg.description;
    if (typeof pkg.version === 'string') version = pkg.version;
  }

  // go.mod
  if (!pkg) {
    const gomod = readTextFile(join(dir, 'go.mod'));
    if (gomod) {
      const match = gomod.match(/^module\s+(\S+)/m);
      if (match) {
        name = match[1].split('/').pop() ?? fallbackName;
      }
    }
  }

  // pyproject.toml
  if (!pkg && !existsSync(join(dir, 'go.mod'))) {
    const pyproject = readTextFile(join(dir, 'pyproject.toml'));
    if (pyproject) {
      name = parseTomlValue(pyproject, 'name') ?? fallbackName;
      description = parseTomlValue(pyproject, 'description') ?? '';
      version = parseTomlValue(pyproject, 'version');
    }
  }

  // Cargo.toml
  if (!pkg && !existsSync(join(dir, 'go.mod')) && !existsSync(join(dir, 'pyproject.toml'))) {
    const cargo = readTextFile(join(dir, 'Cargo.toml'));
    if (cargo) {
      name = parseTomlValue(cargo, 'name') ?? fallbackName;
      description = parseTomlValue(cargo, 'description') ?? '';
      version = parseTomlValue(cargo, 'version');
    }
  }

  // composer.json
  if (!pkg && !existsSync(join(dir, 'go.mod')) && !existsSync(join(dir, 'pyproject.toml')) && !existsSync(join(dir, 'Cargo.toml'))) {
    const composer = readJson(join(dir, 'composer.json'));
    if (composer) {
      const composerName = typeof composer.name === 'string' ? composer.name : '';
      name = composerName.includes('/') ? composerName.split('/').pop()! : composerName || fallbackName;
      if (typeof composer.description === 'string') description = composer.description;
    }
  }

  // Enrich description with frameworks
  const frameworks = detectFrameworks(dir);
  if (frameworks.length > 0 && !description) {
    description = `${frameworks.join(' + ')} project`;
  } else if (frameworks.length > 0) {
    description = `${description} (${frameworks.join(', ')})`;
  }

  return {
    name,
    description: description || `Project: ${name}`,
    version,
    includes: detectIncludes(dir),
    excludes: detectExcludes(dir),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/init/detect.test.ts`
Expected: All PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/init/detect.ts tests/init/detect.test.ts
git commit -m "feat: project detector — reads manifests for smart init"
```

---

### Task 2: Sibling Repo Detector

**Files:**
- Create: `src/init/siblings.ts`
- Test: `tests/init/siblings.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/init/siblings.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectSiblings } from '../../src/init/siblings.js';

describe('detectSiblings', () => {
  let parentDir: string;
  let projectDir: string;

  beforeEach(() => {
    parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'respec-siblings-'));
    projectDir = path.join(parentDir, 'my-frontend');
    fs.mkdirSync(projectDir);
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
  });
  afterEach(() => { fs.rmSync(parentDir, { recursive: true }); });

  it('detects sibling with package.json', () => {
    const sibDir = path.join(parentDir, 'my-backend');
    fs.mkdirSync(sibDir);
    fs.writeFileSync(path.join(sibDir, 'package.json'), JSON.stringify({ name: 'my-backend' }));

    const siblings = detectSiblings(projectDir);
    expect(siblings).toHaveLength(1);
    expect(siblings[0].name).toBe('my-backend');
    expect(siblings[0].path).toBe('../my-backend');
  });

  it('infers api_provider role from backend name', () => {
    const sibDir = path.join(parentDir, 'docupaint-backend');
    fs.mkdirSync(sibDir);
    fs.writeFileSync(path.join(sibDir, 'package.json'), '{}');

    const siblings = detectSiblings(projectDir);
    expect(siblings[0].role).toBe('api_provider');
  });

  it('infers mobile role from app name', () => {
    const sibDir = path.join(parentDir, 'docupaint-app');
    fs.mkdirSync(sibDir);
    fs.writeFileSync(path.join(sibDir, 'package.json'), '{}');

    const siblings = detectSiblings(projectDir);
    expect(siblings[0].role).toBe('mobile');
  });

  it('infers shared_types role from shared name', () => {
    const sibDir = path.join(parentDir, 'shared-types');
    fs.mkdirSync(sibDir);
    fs.writeFileSync(path.join(sibDir, 'package.json'), '{}');

    const siblings = detectSiblings(projectDir);
    expect(siblings[0].role).toBe('shared_types');
  });

  it('skips directories without manifests', () => {
    const sibDir = path.join(parentDir, 'random-folder');
    fs.mkdirSync(sibDir);

    const siblings = detectSiblings(projectDir);
    expect(siblings).toHaveLength(0);
  });

  it('skips current directory', () => {
    const siblings = detectSiblings(projectDir);
    expect(siblings.every(s => s.name !== 'my-frontend')).toBe(true);
  });

  it('detects sibling with go.mod', () => {
    const sibDir = path.join(parentDir, 'api-server');
    fs.mkdirSync(sibDir);
    fs.writeFileSync(path.join(sibDir, 'go.mod'), 'module github.com/user/api-server\n');

    const siblings = detectSiblings(projectDir);
    expect(siblings).toHaveLength(1);
    expect(siblings[0].name).toBe('api-server');
    expect(siblings[0].role).toBe('api_provider');
  });

  it('defaults role to reference for unknown names', () => {
    const sibDir = path.join(parentDir, 'something-else');
    fs.mkdirSync(sibDir);
    fs.writeFileSync(path.join(sibDir, 'package.json'), '{}');

    const siblings = detectSiblings(projectDir);
    expect(siblings[0].role).toBe('reference');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/init/siblings.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement sibling detector**

```typescript
// src/init/siblings.ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';

export interface SiblingRepo {
  name: string;
  path: string;
  role: string;
  manifest: string;
}

const MANIFESTS = ['package.json', 'go.mod', 'pyproject.toml', 'Cargo.toml', 'composer.json'];

const ROLE_PATTERNS: [RegExp, string][] = [
  [/backend|api|server/i, 'api_provider'],
  [/frontend|web|client|admin/i, 'frontend'],
  [/mobile|ios|android/i, 'mobile'],
  [/\bapp\b/i, 'mobile'],
  [/shared|common|types/i, 'shared_types'],
  [/infra|deploy|ops|devops/i, 'infra'],
  [/design|ui-kit|storybook/i, 'design_system'],
];

function inferRole(name: string): string {
  for (const [pattern, role] of ROLE_PATTERNS) {
    if (pattern.test(name)) return role;
  }
  return 'reference';
}

function findManifest(dir: string): string | null {
  for (const manifest of MANIFESTS) {
    if (existsSync(join(dir, manifest))) return manifest;
  }
  return null;
}

function extractName(dir: string, manifest: string): string {
  const dirName = basename(dir);
  try {
    if (manifest === 'package.json' || manifest === 'composer.json') {
      const pkg = JSON.parse(readFileSync(join(dir, manifest), 'utf-8'));
      const name = typeof pkg.name === 'string' ? pkg.name : '';
      if (manifest === 'composer.json' && name.includes('/')) {
        return name.split('/').pop()!;
      }
      return name || dirName;
    }
    if (manifest === 'go.mod') {
      const content = readFileSync(join(dir, manifest), 'utf-8');
      const match = content.match(/^module\s+(\S+)/m);
      return match ? match[1].split('/').pop()! : dirName;
    }
  } catch {
    // fall through
  }
  return dirName;
}

export function detectSiblings(projectDir: string): SiblingRepo[] {
  const parentDir = dirname(projectDir);
  const currentName = basename(projectDir);
  const siblings: SiblingRepo[] = [];

  let entries: string[];
  try {
    entries = readdirSync(parentDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry === currentName) continue;
    if (entry.startsWith('.')) continue;

    const fullPath = join(parentDir, entry);
    try {
      if (!statSync(fullPath).isDirectory()) continue;
    } catch {
      continue;
    }

    const manifest = findManifest(fullPath);
    if (!manifest) continue;

    const name = extractName(fullPath, manifest);
    const relPath = `../${entry}`;

    siblings.push({
      name,
      path: relPath,
      role: inferRole(entry),
      manifest,
    });
  }

  return siblings;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/init/siblings.test.ts`
Expected: All PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add src/init/siblings.ts tests/init/siblings.test.ts
git commit -m "feat: sibling repo detector with role inference"
```

---

### Task 3: Update CLI Init to Use Detectors

**Files:**
- Modify: `src/commands/init.ts`
- Modify: `tests/commands/init.test.ts`

- [ ] **Step 1: Update existing test expectations**

In `tests/commands/init.test.ts`, add a test for detection:

```typescript
it('detects project name from package.json', async () => {
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'detected-app',
    description: 'Auto detected',
  }));
  await runInit(tmpDir);
  const { loadConfig } = await import('../../src/config/loader.js');
  const config = await loadConfig(tmpDir);
  expect(config.project.name).toBe('detected-app');
});

it('includes sibling repos as context when detected', async () => {
  // Create a sibling directory with a manifest
  const sibDir = path.join(path.dirname(tmpDir), 'test-backend');
  fs.mkdirSync(sibDir, { recursive: true });
  fs.writeFileSync(path.join(sibDir, 'package.json'), JSON.stringify({ name: 'test-backend' }));

  try {
    await runInit(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'respec.config.yaml'), 'utf-8');
    expect(content).toContain('test-backend');
  } finally {
    fs.rmSync(sibDir, { recursive: true });
  }
});

it('appends Jira/docs guide as comments in CLI mode', async () => {
  await runInit(tmpDir);
  const content = fs.readFileSync(path.join(tmpDir, 'respec.config.yaml'), 'utf-8');
  expect(content).toContain('# To add Jira');
  expect(content).toContain('JIRA_API_TOKEN');
});
```

- [ ] **Step 2: Rewrite `src/commands/init.ts`**

```typescript
// src/commands/init.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { stringify } from 'yaml';
import {
  DEFAULT_AI_ENGINE,
  DEFAULT_AI_TIMEOUT_SECONDS,
  DEFAULT_MAX_PARALLEL,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_DIAGRAM_TYPE,
  DEFAULT_REPO_BRANCH,
  RESPEC_DIR,
  CONFIG_FILENAME,
} from '../constants.js';
import { detectProject } from '../init/detect.js';
import { detectSiblings } from '../init/siblings.js';

export async function runInit(dir: string): Promise<void> {
  const configPath = path.join(dir, CONFIG_FILENAME);

  if (fs.existsSync(configPath)) {
    console.log(`${CONFIG_FILENAME} already exists at ${configPath}`);
    return;
  }

  const project = detectProject(dir);
  const siblings = detectSiblings(dir);

  const config: Record<string, unknown> = {
    project: {
      name: project.name,
      description: project.description,
      ...(project.version ? { version: project.version } : {}),
    },
    sources: {
      repo: {
        path: './',
        branch: DEFAULT_REPO_BRANCH,
        include: project.includes,
        exclude: project.excludes,
      },
      ...(siblings.length > 0 ? {
        context: siblings.map(s => ({
          name: s.name,
          path: s.path,
          role: s.role,
        })),
      } : {}),
    },
    ai: {
      engines: { [DEFAULT_AI_ENGINE]: {} },
      max_parallel: DEFAULT_MAX_PARALLEL,
      timeout: DEFAULT_AI_TIMEOUT_SECONDS,
    },
    output: {
      dir: DEFAULT_OUTPUT_DIR,
      format: DEFAULT_OUTPUT_FORMAT,
      diagrams: DEFAULT_DIAGRAM_TYPE,
      tasks: true,
    },
  };

  let yamlContent = stringify(config);

  // Append Jira/docs guide as comments
  yamlContent += `
# To add Jira and docs context, add to sources:
#   jira:
#     host: https://company.atlassian.net
#     auth: env:JIRA_API_TOKEN
#     filters:
#       projects: [PROJ]
#   docs:
#     confluence:
#       host: https://company.atlassian.net/wiki
#       space: ENG
#       auth: env:CONFLUENCE_TOKEN
#     local: ["./docs", "./README.md"]
`;

  fs.writeFileSync(configPath, yamlContent, 'utf-8');
  console.log(`Created ${CONFIG_FILENAME} at ${configPath}`);

  // Add .respec/ to .gitignore if not already present
  const gitignorePath = path.join(dir, '.gitignore');
  const respecEntry = `${RESPEC_DIR}/`;

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes(respecEntry)) {
      const updated = content.endsWith('\n')
        ? content + respecEntry + '\n'
        : content + '\n' + respecEntry + '\n';
      fs.writeFileSync(gitignorePath, updated, 'utf-8');
      console.log(`Added ${respecEntry} to .gitignore`);
    }
  } else {
    fs.writeFileSync(gitignorePath, respecEntry + '\n', 'utf-8');
    console.log(`Created .gitignore with ${respecEntry}`);
  }
}
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/commands/init.ts tests/commands/init.test.ts
git commit -m "feat: CLI init uses project and sibling detection"
```

---

### Task 4: Interactive Init in Wizard

**Files:**
- Create: `src/wizard/init-flow.ts`
- Modify: `src/wizard/index.ts`

- [ ] **Step 1: Create the interactive init flow**

```typescript
// src/wizard/init-flow.ts
import * as clack from '@clack/prompts';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { detectProject } from '../init/detect.js';
import { detectSiblings, type SiblingRepo } from '../init/siblings.js';
import {
  DEFAULT_AI_ENGINE,
  DEFAULT_AI_TIMEOUT_SECONDS,
  DEFAULT_MAX_PARALLEL,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_DIAGRAM_TYPE,
  RESPEC_DIR,
  CONFIG_FILENAME,
  OUTPUT_FORMATS,
} from '../constants.js';

export async function runInteractiveInit(dir: string): Promise<void> {
  const configPath = join(dir, CONFIG_FILENAME);

  if (fs.existsSync(configPath)) {
    clack.log.warn(`${CONFIG_FILENAME} already exists`);
    return;
  }

  const detected = detectProject(dir);
  const siblings = detectSiblings(dir);

  // Project name
  const name = await clack.text({
    message: 'Project name?',
    initialValue: detected.name,
  });
  if (clack.isCancel(name)) return;

  // Description
  const description = await clack.text({
    message: 'Description?',
    initialValue: detected.description,
  });
  if (clack.isCancel(description)) return;

  // Includes
  const includes = await clack.text({
    message: 'Source include patterns? (comma-separated)',
    initialValue: detected.includes.join(', '),
  });
  if (clack.isCancel(includes)) return;

  // Context sources
  let selectedSiblings: SiblingRepo[] = [];
  if (siblings.length > 0) {
    const choices = await clack.multiselect({
      message: `Found ${siblings.length} sibling repo(s). Add as context?`,
      options: siblings.map(s => ({
        value: s.name,
        label: `${s.name} (${s.role})`,
        hint: s.path,
      })),
      required: false,
    });
    if (!clack.isCancel(choices)) {
      selectedSiblings = siblings.filter(s => (choices as string[]).includes(s.name));
    }
  }

  // Jira
  let jiraConfig: Record<string, unknown> | undefined;
  const useJira = await clack.confirm({
    message: 'Connect Jira for ticket context?',
    initialValue: false,
  });
  if (!clack.isCancel(useJira) && useJira) {
    const host = await clack.text({
      message: 'Jira host?',
      placeholder: 'https://company.atlassian.net',
    });
    if (clack.isCancel(host)) return;

    const authVar = await clack.text({
      message: 'Jira auth (env variable name)?',
      initialValue: 'JIRA_API_TOKEN',
    });
    if (clack.isCancel(authVar)) return;

    const projects = await clack.text({
      message: 'Filter by projects? (comma-separated, empty to skip)',
      initialValue: '',
    });

    jiraConfig = {
      host: host as string,
      auth: `env:${authVar as string}`,
      ...(projects && !clack.isCancel(projects) && (projects as string).trim()
        ? { filters: { projects: (projects as string).split(',').map(p => p.trim()) } }
        : {}),
    };
  }

  // Confluence
  let docsConfig: Record<string, unknown> | undefined;
  const useConfluence = await clack.confirm({
    message: 'Connect Confluence for docs?',
    initialValue: false,
  });
  if (!clack.isCancel(useConfluence) && useConfluence) {
    const host = await clack.text({
      message: 'Confluence host?',
      placeholder: 'https://company.atlassian.net/wiki',
    });
    if (clack.isCancel(host)) return;

    const space = await clack.text({
      message: 'Confluence space key?',
      placeholder: 'ENG',
    });
    if (clack.isCancel(space)) return;

    const authVar = await clack.text({
      message: 'Confluence auth (env variable name)?',
      initialValue: 'CONFLUENCE_TOKEN',
    });
    if (clack.isCancel(authVar)) return;

    docsConfig = {
      confluence: {
        host: host as string,
        space: space as string,
        auth: `env:${authVar as string}`,
      },
    };
  }

  // Local docs
  const localDocs = await clack.text({
    message: 'Local docs paths? (comma-separated, empty to skip)',
    initialValue: '',
  });
  if (!clack.isCancel(localDocs) && (localDocs as string).trim()) {
    docsConfig = {
      ...docsConfig,
      local: (localDocs as string).split(',').map(p => p.trim()),
    };
  }

  // Output format
  const format = await clack.select({
    message: 'Output format?',
    options: OUTPUT_FORMATS.map(f => ({ value: f, label: f })),
  });
  if (clack.isCancel(format)) return;

  // Build config
  const includeList = (includes as string).split(',').map(p => p.trim()).filter(Boolean);
  const config: Record<string, unknown> = {
    project: {
      name: name as string,
      description: description as string,
      ...(detected.version ? { version: detected.version } : {}),
    },
    sources: {
      repo: {
        path: './',
        include: includeList,
        exclude: detected.excludes,
      },
      ...(selectedSiblings.length > 0 ? {
        context: selectedSiblings.map(s => ({
          name: s.name,
          path: s.path,
          role: s.role,
        })),
      } : {}),
      ...(jiraConfig ? { jira: jiraConfig } : {}),
      ...(docsConfig ? { docs: docsConfig } : {}),
    },
    ai: {
      engines: { [DEFAULT_AI_ENGINE]: {} },
      max_parallel: DEFAULT_MAX_PARALLEL,
      timeout: DEFAULT_AI_TIMEOUT_SECONDS,
    },
    output: {
      dir: DEFAULT_OUTPUT_DIR,
      format: format as string,
      diagrams: DEFAULT_DIAGRAM_TYPE,
      tasks: true,
    },
  };

  fs.writeFileSync(configPath, stringify(config), 'utf-8');
  clack.log.success(`Created ${CONFIG_FILENAME}`);

  // .gitignore
  const gitignorePath = join(dir, '.gitignore');
  const respecEntry = `${RESPEC_DIR}/`;
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes(respecEntry)) {
      fs.writeFileSync(gitignorePath, content.endsWith('\n')
        ? content + respecEntry + '\n'
        : content + '\n' + respecEntry + '\n', 'utf-8');
    }
  } else {
    fs.writeFileSync(gitignorePath, respecEntry + '\n', 'utf-8');
  }
}
```

- [ ] **Step 2: Wire into wizard**

In `src/wizard/index.ts`, update the `init` case in `executeCommand`:

Replace:
```typescript
case 'init': {
  const { runInit } = await import('../commands/init.js');
  await runInit(dir);
  break;
}
```

With:
```typescript
case 'init': {
  const { runInteractiveInit } = await import('./init-flow.js');
  await runInteractiveInit(dir);
  break;
}
```

Also add a new case `'init-cli'` that calls the original `runInit` for non-wizard use:

Actually — the wizard handles init specially via `init-flow.ts`. The CLI `respec init` still calls `runInit` directly from `bin/respec.ts` which doesn't go through the wizard. So only the wizard's `executeCommand` needs updating.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/wizard/init-flow.ts src/wizard/index.ts
git commit -m "feat: interactive init wizard with Jira and docs configuration"
```

---

### Task 5: Build, Test, Push

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Manual smoke test — CLI mode**

```bash
cd /tmp && mkdir test-smart-init && cd test-smart-init
echo '{"name":"test-project","description":"A test"}' > package.json
mkdir src
respec init
cat respec.config.yaml
```

Expected: YAML has `name: test-project`, `description` includes "A test", includes `src/**`.

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: smart init adjustments from smoke test"
```

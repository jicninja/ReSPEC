import * as path from 'node:path';
import { ensureDir, writeMarkdown } from '../utils/fs.js';
import type { FormatAdapter, FormatContext } from './types.js';

export class OpenSpecFormat implements FormatAdapter {
  name = 'openspec';

  async package(specsDir: string, outputDir: string, context: FormatContext): Promise<void> {
    const { projectName, projectDescription, sddContent } = context;

    // openspec/AGENTS.md
    writeMarkdown(
      path.join(outputDir, 'openspec', 'AGENTS.md'),
      `# OpenSpec Agents\n\n<openspec-instructions>\nThis project uses the OpenSpec specification format.\nAll implementation must follow the specs defined in openspec/specs/.\nChanges are tracked in openspec/changes/.\nExplorations are documented in openspec/explorations/.\n</openspec-instructions>\n`
    );

    // openspec/project.md
    writeMarkdown(
      path.join(outputDir, 'openspec', 'project.md'),
      `# ${projectName}\n\n${projectDescription}\n`
    );

    // openspec/config.yaml
    writeMarkdown(
      path.join(outputDir, 'openspec', 'config.yaml'),
      `schema: spec-driven\nproject:\n  name: ${projectName}\n  description: ${projectDescription}\n`
    );

    // openspec/specs/ directory
    ensureDir(path.join(outputDir, 'openspec', 'specs'));

    // openspec/changes/full-reimplementation/proposal.md
    writeMarkdown(
      path.join(outputDir, 'openspec', 'changes', 'full-reimplementation', 'proposal.md'),
      `# Full Reimplementation Proposal\n\n## Project\n\n${projectName}\n\n## Rationale\n\nThis proposal outlines the full reimplementation of the system based on the reverse-engineered specification.\n\n## Scope\n\n${sddContent}\n`
    );

    // openspec/changes/full-reimplementation/tasks.md
    writeMarkdown(
      path.join(outputDir, 'openspec', 'changes', 'full-reimplementation', 'tasks.md'),
      `# Reimplementation Tasks\n\n## Overview\n\nTask breakdown for full reimplementation of ${projectName}.\n\n## Tasks\n\n- [ ] Set up project scaffolding\n- [ ] Implement domain model\n- [ ] Build API layer\n- [ ] Configure infrastructure\n- [ ] Write tests\n- [ ] Deploy\n`
    );

    // openspec/explorations/ directory
    ensureDir(path.join(outputDir, 'openspec', 'explorations'));
  }
}

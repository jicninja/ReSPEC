import * as path from 'node:path';
import { ensureDir, writeMarkdown } from '../utils/fs.js';
import type { FormatAdapter, FormatContext } from './types.js';

export class AntigravityFormat implements FormatAdapter {
  name = 'antigravity';

  async package(specsDir: string, outputDir: string, context: FormatContext): Promise<void> {
    const { projectName, projectDescription, sddContent } = context;

    // GEMINI.md
    writeMarkdown(
      path.join(outputDir, 'GEMINI.md'),
      `# Gemini Rules for ${projectName}\n\n## Antigravity-Specific Rules\n\nThis project follows the Antigravity development methodology.\n\n## Guidelines\n\n- Follow the domain model defined in \`.agent/rules/domain-model.md\`\n- Adhere to business rules in \`.agent/rules/business-rules.md\`\n- Keep \`tasks/task.md\` updated as a living checklist\n- Reference \`docs/sdd.md\` for system design decisions\n`
    );

    // AGENTS.md
    writeMarkdown(
      path.join(outputDir, 'AGENTS.md'),
      `# Agent Rules for ${projectName}\n\n## Cross-Tool Rules\n\nThese rules apply across all AI coding tools working on this project.\n\n## Project Overview\n\n${projectDescription}\n\n## Key Constraints\n\n- Implement according to the SDD in \`docs/sdd.md\`\n- Respect domain boundaries defined in \`.agent/rules/domain-model.md\`\n- Business rules in \`.agent/rules/business-rules.md\` are non-negotiable\n- Update \`tasks/task.md\` as work progresses\n`
    );

    // .agent/rules/domain-model.md
    writeMarkdown(
      path.join(outputDir, '.agent', 'rules', 'domain-model.md'),
      `# Domain Model Rules\n\n## Overview\n\nDomain model constraints for ${projectName}.\n\n## Entities\n\n<!-- Core entities and their invariants -->\n\n## Aggregates\n\n<!-- Aggregate boundaries and consistency rules -->\n\n## Value Objects\n\n<!-- Immutable value types -->\n`
    );

    // .agent/rules/business-rules.md
    writeMarkdown(
      path.join(outputDir, '.agent', 'rules', 'business-rules.md'),
      `# Business Rules\n\n## Overview\n\nBusiness rules for ${projectName}.\n\n## Core Rules\n\n<!-- Non-negotiable business constraints -->\n\n## Validation Rules\n\n<!-- Input and state validation requirements -->\n\n## Permissions\n\n<!-- Access control rules -->\n`
    );

    // docs/sdd.md
    writeMarkdown(
      path.join(outputDir, 'docs', 'sdd.md'),
      sddContent
    );

    // tasks/task.md
    writeMarkdown(
      path.join(outputDir, 'tasks', 'task.md'),
      `# Tasks — Living Checklist\n\n## ${projectName}\n\n### In Progress\n\n<!-- Currently active tasks -->\n\n### Todo\n\n- [ ] Implement domain model\n- [ ] Build API layer\n- [ ] Set up infrastructure\n- [ ] Write integration tests\n\n### Done\n\n<!-- Completed tasks -->\n`
    );

    // tasks/implementation_plan.md
    writeMarkdown(
      path.join(outputDir, 'tasks', 'implementation_plan.md'),
      `# Implementation Plan\n\n## ${projectName}\n\n## Overview\n\n${projectDescription}\n\n## Phases\n\n### Phase 1 — Foundation\n\n- Set up project structure\n- Implement core domain model\n- Configure database\n\n### Phase 2 — Features\n\n- Build API endpoints\n- Implement business logic\n- Add authentication\n\n### Phase 3 — Polish\n\n- Write tests\n- Performance optimization\n- Documentation\n- Deployment\n`
    );
  }
}

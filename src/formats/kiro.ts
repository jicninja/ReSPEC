import * as path from 'node:path';
import { ensureDir, writeMarkdown } from '../utils/fs.js';
import type { FormatAdapter, FormatContext } from './types.js';

export class KiroFormat implements FormatAdapter {
  name = 'kiro';

  async package(specsDir: string, outputDir: string, context: FormatContext): Promise<void> {
    const { projectName, projectDescription, sddContent } = context;

    // .kiro/steering/product.md
    writeMarkdown(
      path.join(outputDir, '.kiro', 'steering', 'product.md'),
      `# Product Overview\n\n## Project\n\n**Name:** ${projectName}\n\n**Description:** ${projectDescription}\n`
    );

    // .kiro/steering/tech.md
    writeMarkdown(
      path.join(outputDir, '.kiro', 'steering', 'tech.md'),
      `# Tech Stack\n\n<!-- TODO: Fill in the technology stack for this project -->\n\n## Languages\n\n## Frameworks\n\n## Infrastructure\n`
    );

    // .kiro/steering/structure.md
    writeMarkdown(
      path.join(outputDir, '.kiro', 'steering', 'structure.md'),
      `# Project Structure\n\n<!-- TODO: Fill in the project structure -->\n\n## Directory Layout\n\n## Module Organization\n`
    );

    // .kiro/specs/domain-model/requirements.md
    writeMarkdown(
      path.join(outputDir, '.kiro', 'specs', 'domain-model', 'requirements.md'),
      `# Domain Model Requirements\n\n## Overview\n\nRequirements derived from system design for ${projectName}.\n\n## Functional Requirements\n\n<!-- Requirements extracted from SDD -->\n`
    );

    // .kiro/specs/domain-model/design.md
    writeMarkdown(
      path.join(outputDir, '.kiro', 'specs', 'domain-model', 'design.md'),
      `# Domain Model Design\n\n## Overview\n\nDomain model design for ${projectName}.\n\n${sddContent}\n`
    );

    // .kiro/specs/domain-model/tasks.md
    writeMarkdown(
      path.join(outputDir, '.kiro', 'specs', 'domain-model', 'tasks.md'),
      `# Domain Model Tasks\n\n## Implementation Tasks\n\n<!-- TODO: Break down implementation tasks for the domain model -->\n\n- [ ] Define core entities\n- [ ] Implement value objects\n- [ ] Set up aggregates\n- [ ] Configure repositories\n`
    );
  }
}

import * as path from 'node:path';
import { ensureDir, writeMarkdown } from '../utils/fs.js';
import type { FormatAdapter, FormatContext } from './types.js';

const SKILLS = [
  {
    name: 'domain-model',
    description: 'Use when working with core domain entities, aggregates, and value objects',
  },
  {
    name: 'business-rules',
    description: 'Use when implementing or validating business logic and constraints',
  },
  {
    name: 'api-contracts',
    description: 'Use when building or consuming API endpoints and their contracts',
  },
  {
    name: 'user-flows',
    description: 'Use when implementing user-facing features and interactions',
  },
  {
    name: 'data-model',
    description: 'Use when working with database schemas, migrations, and data access',
  },
  {
    name: 'security-auth',
    description: 'Use when implementing authentication, authorization, and security controls',
  },
  {
    name: 'infrastructure',
    description: 'Use when configuring infrastructure, deployments, and environment setup',
  },
  {
    name: 'migration-guide',
    description: 'Use when planning or executing migration from the legacy system',
  },
];

export class SuperpowersFormat implements FormatAdapter {
  name = 'superpowers';

  async package(specsDir: string, outputDir: string, context: FormatContext): Promise<void> {
    const { projectName, projectDescription, sddContent } = context;

    // Create skill folders with SKILL.md
    for (const skill of SKILLS) {
      writeMarkdown(
        path.join(outputDir, 'skills', skill.name, 'SKILL.md'),
        `---\nname: ${skill.name}\nuser-invocable: true\ndescription: ${skill.description}\n---\n\n# ${skill.name}\n\n${skill.description}.\n\n## Usage\n\nInvoke this skill when you need to work on the ${skill.name.replace(/-/g, ' ')} aspects of ${projectName}.\n`
      );
    }

    // CLAUDE.md
    writeMarkdown(
      path.join(outputDir, 'CLAUDE.md'),
      `# ${projectName}\n\n${projectDescription}\n\n## Skills\n\nThis project uses Superpowers skills for structured AI assistance.\nAvailable skills are in the \`skills/\` directory.\n\n## Guidelines\n\n- Reference \`sdd.md\` for system design decisions\n- Use skills to get context-specific guidance\n- Follow the domain model and business rules strictly\n`
    );

    // sdd.md
    writeMarkdown(
      path.join(outputDir, 'sdd.md'),
      sddContent
    );
  }
}

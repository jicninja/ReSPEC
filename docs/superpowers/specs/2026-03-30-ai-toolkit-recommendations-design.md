# AI Toolkit Recommendations

## Overview

After ReSpec analyzes a codebase and generates specs, it recommends and optionally installs AI tools (MCP servers, skills, plugins, extensions) tailored to the detected stack and chosen export format. Recommendations are AI-driven with post-validation, not a static registry.

## Architecture

### Pipeline Integration

toolkit-gen runs as a standard generator in tier 3 of `respec generate`, parallel with task-gen and format-gen:

```
respec generate
  Tier 1: erd-gen, flow-gen, adr-gen (parallel)
  Tier 2: sdd-gen (sequential)
  Tier 3: task-gen, format-gen, toolkit-gen (parallel)
            ↓
  Output: .respec/generated/toolkit/recommendations.json
```

Post-export, the install wizard reads recommendations.json and offers to install approved tools.

```
respec export --format <format>
  1. Format adapter generates output (existing behavior)
  2. Read recommendations.json
  3. Post-export wizard: present, approve, install
```

### Format-Agent Mapping

The export format signals which agent ecosystem the user works in:

| Format | Agent ecosystem | Multi-agent? |
|--------|----------------|-------------|
| superpowers | Claude Code | No |
| antigravity | Gemini | No |
| kiro | Kiro | Yes, if cc-sdd installed |
| openspec | Agnostic | Yes |
| speckit | Copilot | No |
| bmad | BMAD | Depends |

toolkit-gen uses this mapping to filter recommendations by `agents` field. Multi-agent formats receive recommendations for all supported agents.

## toolkit-gen: Generator Definition

```typescript
{
  id: 'toolkit-gen',
  reads: [
    'repo/dependencies.md',           // raw: frameworks, libs
  ],
  readsAnalyzed: [
    'infra/architecture.md',           // infra patterns
    'domain/bounded-contexts.md',      // complexity signal
  ],
  produces: ['toolkit/recommendations.json'],
  tier: 3,
}
```

### Generator Flow

1. **Collect context**: read dependencies, architecture, bounded contexts, and `config.output.format`
2. **Build prompt**: ask AI engine to recommend MCPs, skills, plugins, extensions as structured JSON given the detected stack and target agent ecosystem
3. **AI engine returns** JSON recommendations
4. **Validate**: for each recommendation with a package name, run `npm view <package>` (~200ms each). Mark `validated: true|false`.
5. **Write** `.respec/generated/toolkit/recommendations.json`

### Prompt Strategy

The prompt provides:
- Concrete dependency list (not asking the LLM to guess)
- Target format and whether multi-agent
- Output JSON schema (strict)
- Instruction: "only recommend tools you know with certainty, include exact npm package name or URL"

## recommendations.json Schema

```jsonc
{
  "stack": {
    "detected": ["nextjs", "prisma", "expo", "typescript"],
    "format": "superpowers",
    "multiAgent": false
  },
  "recommendations": [
    {
      "type": "mcp",              // mcp | skill | plugin | extension
      "name": "prisma-mcp",
      "package": "@prisma/mcp-server",
      "description": "Database introspection and query assistance",
      "reason": "Prisma detected in dependencies",
      "config": {
        "command": "npx",
        "args": ["@prisma/mcp-server"]
      },
      "validated": true,
      "agents": ["claude", "gemini", "cursor"],
      "category": "database"
    }
  ],
  "processRecommendation": {
    "complexity": "medium",
    "suggestedWorkflow": "spec-driven with domain decomposition",
    "reason": "3 bounded contexts detected, mobile + web targets"
  }
}
```

### Field Semantics

- **type**: what kind of tool (mcp, skill, plugin, extension)
- **name**: human-readable identifier
- **package**: npm package name or install target
- **description**: one-line summary
- **reason**: why this was recommended (ties back to detected stack)
- **config**: ready-to-inject configuration object (for MCPs: command + args)
- **validated**: whether `npm view` or URL check passed
- **agents**: which agent ecosystems support this tool
- **category**: grouping for wizard display (database, frontend, testing, etc.)
- **processRecommendation**: SDD workflow suggestion based on detected complexity

## Post-Export Install Wizard

After the format adapter finishes, export reads recommendations.json and presents an interactive wizard.

### Display Format

```
✓ Exported superpowers format to project root

📋 AI Toolkit Recommendations for your stack
─────────────────────────────────────────────

Database (2 tools)
├── ☐ @prisma/mcp-server — DB introspection and queries
└── ☐ superpowers-skills-db — Migration workflows

Frontend (1 tool)
└── ☐ @vercel/mcp-server — Deployment and preview

⚠ Not verified (1)
└── ☐ expo-dev-tools-mcp — Mobile debugging [unverified]

? Install recommendations
❯ Select individually
  Yes to all
  Yes to all verified only
  Skip
```

### Mode Behavior

| Mode | Behavior |
|------|----------|
| **Wizard (interactive)** | Shows list grouped by category, offers: select individually / yes to all / yes verified only / skip |
| **Autopilot** | Installs all verified, skips unverified, logs decisions to `_decisions.md` |
| **CI** | Generates config files only, never installs |

### Install Actions by Type

- **MCPs**: write entry to agent config file (`.claude/settings.json`, `.cursor/mcp.json`, etc. depending on format)
- **Skills**: `npm install` or copy to agent's skills directory
- **Plugins/extensions**: generate setup instructions (cannot install programmatically)
- **API keys needed**: leave placeholder + warning (`⚠ Set DATABASE_URL in .env`)

### Interactive Selection

"Select individually" uses `@clack/prompts` multiselect, consistent with existing ReSpec wizard patterns.

## FormatContext Integration

A new optional field is added to FormatContext:

```typescript
interface FormatContext {
  // existing fields unchanged
  toolkitRecommendations?: ToolkitRecommendations;
}
```

Each format adapter decides how to use recommendations:

| Format | v1 behavior |
|--------|-------------|
| **superpowers** | "Recommended MCPs" section in CLAUDE.md + install skills to `skills/` |
| **openspec** | Section in AGENTS.md + universal `mcp.json` + per-agent configs |
| **antigravity** | Receives field, no processing (v2) |
| **kiro** | Receives field, no processing (v2) |
| **speckit** | Receives field, no processing (v2) |
| **bmad** | Receives field, no processing (v2) |

## v1 Scope

### Included

- toolkit-gen as tier 3 generator
- AI-driven recommendations with npm validation
- recommendations.json schema (full)
- Post-export wizard with @clack/prompts (select individually, yes to all, skip)
- Autopilot installs all verified
- CI generates configs only
- Recommendation injection in superpowers and openspec format adapters
- FormatContext.toolkitRecommendations available to all adapters

### v2 (future)

- `respec toolkit` standalone command (no pipeline required)
- Recommendation injection in antigravity, kiro, speckit, bmad adapters
- Stack recipes (technology combinations trigger extra recommendations)
- npm validation cache
- User overrides in config (`toolkit.ignore` / `toolkit.always`)
- Live marketplace search (npm search, GitHub topics)

### Out of scope

- Programmatic IDE extension installation
- Auto-detect already-installed MCPs
- Hardware/infrastructure recommendations

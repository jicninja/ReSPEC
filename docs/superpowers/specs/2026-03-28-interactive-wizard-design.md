# Interactive Wizard (`respec`)

## Problem

Currently ReSpec requires running individual commands (`respec init`, `respec ingest`, etc.) manually. Users need to know the pipeline order and available commands. An interactive wizard that guides users through the pipeline step-by-step with visual feedback makes the tool more accessible.

## Entry Point

`respec` without arguments launches the wizard. Individual commands continue working as before.

```
bin/respec.ts:
  - No subcommand → runWizard()
  - Subcommand present → commander handles it (unchanged)
```

## Flow

```
1. Splash screen (ASCII art + version)
2. Detect state:
   - No config → offer init
   - Config exists → read pipeline state (state.json)
3. Show contextual menu based on state:
   - empty     → [Init, Exit]
   - ingested  → [Analyze, Re-ingest, Status, Exit]
   - analyzed  → [Generate, Re-analyze, Status, Exit]
   - generated → [Export, Re-generate, Status, Validate, Exit]
4. After each command, return to menu with updated state
5. Spinners during execution, success/error messages with colors
```

## Splash Screen

```
  ╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗
  ╠╦╝║╣ ╚═╗╠═╝║╣ ║
  ╩╚═╚═╝╚═╝╩  ╚═╝╚═╝
  reverse engineering → spec

  v0.1.0
```

ASCII art and tagline rendered in brand color (`#EF9F27`, already defined in `TUI_BRAND_COLOR` constant). Version from package.json.

## Contextual Menu

Uses `@clack/prompts` select. Menu shows only valid actions for current pipeline state. The recommended next action is the default selection:

```
◆  Pipeline: ingested (3 sources)
│
◇  What's next?
│  ● Analyze (recommended)
│  ○ Re-ingest sources
│  ○ View status
│  ○ Exit
└
```

### Menu Options by State

| State | Options | Default |
|-------|---------|---------|
| no config | Init, Autopilot, Exit | Init |
| empty (config exists) | Ingest, Autopilot, Status, Exit | Ingest |
| ingested | Analyze, Autopilot, Re-ingest, Status, Exit | Analyze |
| analyzed | Generate, Autopilot, Re-analyze, Status, Exit | Generate |
| generated | Export, Re-generate, Validate, Status, Exit | Export |

## Autopilot Mode

Runs the entire remaining pipeline automatically from the current state to completion. Available from any state except `generated`.

```
◇  What's next?
│  ○ Ingest sources
│  ● Autopilot — run full pipeline (recommended for new projects)
│  ○ View status
│  ○ Exit
└

◐  Autopilot: running full pipeline...

◐  [1/4] Ingesting sources...
✔  Ingest complete — 26 artifacts, 51 context files

◐  [2/4] Analyzing (Tier 1)...
✔  domain-mapper — done (45s)
✔  infra-detector — done (43s)
✔  api-mapper — done (44s)
◐  [2/4] Analyzing (Tier 2)...
✔  Analysis complete — 60% confidence

◐  [3/4] Generating specs...
✔  Generate complete — 6/6 generators

◐  [4/4] Packaging as superpowers...
✔  Autopilot complete! Specs at ./specs/
```

### Autopilot Behavior

- Determines remaining phases from current state (e.g., if `ingested`, runs analyze → generate → export)
- Runs each phase sequentially, showing progress with clack spinners
- On phase failure: stops, shows error, returns to menu (user can retry or fix)
- No confirmations between phases — that's the point of autopilot
- Uses the same underlying command functions as manual mode

## Execution Feedback

Spinner from clack during long-running operations. TUI messages forwarded to clack's log:

```
◐  Analyzing... Tier 1: domain-mapper, infra-detector, api-mapper
✔  domain-mapper — done (45s)
✔  infra-detector — done (43s)
✔  api-mapper — done (44s)
◐  Analyzing... Tier 2: flow-extractor, rule-miner, permission-scanner
```

On completion, show summary and return to menu:

```
✔  Analysis complete — 6/6 analyzers passed, 60% confidence

◇  What's next?
│  ● Generate specs (recommended)
│  ○ Re-analyze
│  ○ View status
│  ○ Exit
└
```

On error:

```
✖  sdd-gen failed: timeout after 600s

◇  What's next?
│  ● Retry generate
│  ○ View status
│  ○ Exit
└
```

## File Structure

```
src/wizard/
├── index.ts          # runWizard() — main loop, state detection, menu cycle
├── splash.ts         # ASCII art rendering with brand color
├── menu.ts           # buildMenu(state) → clack select options
└── runner.ts         # Wraps command execution with clack spinner
```

### index.ts

Main loop:
1. Show splash
2. Loop:
   a. Detect current state (config exists? state.json phase?)
   b. Build menu for state
   c. Show menu, get user choice
   d. Execute choice via runner
   e. Show result
   f. Continue loop (unless Exit)

### splash.ts

Exports `showSplash()` that prints the ASCII art with chalk/color using `TUI_BRAND_COLOR`. Reads version from package.json.

### menu.ts

Exports `buildMenu(state: PipelineState)` that returns clack select options. Each option has a `value` (command name), `label`, and optional `hint` ("recommended"). The recommended option is determined by the current state.

### runner.ts

Exports `runCommand(command, dir)` that:
1. Starts a clack spinner
2. Calls the underlying command function (`runIngest`, `runAnalyze`, etc.) with `{ ci: true }` to suppress TUI output (wizard handles display)
3. Updates spinner text based on progress
4. Stops spinner on completion with success/error message

## Integration with bin/respec.ts

```typescript
// In bin/respec.ts, after commander setup:
program.action(async () => {
  // No subcommand → wizard
  const { runWizard } = await import('../src/wizard/index.js');
  await runWizard(process.cwd());
});
```

## Dependency

- `@clack/prompts` — lightweight prompts library (selects, spinners, confirmations)

## What Does NOT Change

- Individual commands (`respec ingest`, `respec analyze`, etc.)
- Existing TUI system (renderer, controller, decision-log, keypress)
- Pipeline logic, orchestrator, config, AI adapters — nothing in core
- `--auto` and `--ci` flags on individual commands

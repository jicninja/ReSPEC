export type WizardState = 'no-config' | 'empty' | 'ingested' | 'analyzed' | 'generated';

export type WizardAction =
  | 'init' | 'init-detailed' | 'quick-setup'
  | 'run' | 'continue'
  | 'ingest' | 'analyze' | 'generate' | 'export'
  | 'autopilot' | 'reset' | 'status' | 'validate' | 'review' | 'diff' | 'push-jira' | 'exit';

export interface MenuOption {
  value: WizardAction;
  label: string;
  hint?: string;
}

const MENUS: Record<WizardState, { options: Omit<MenuOption, 'hint'>[]; recommended: WizardAction }> = {
  'no-config': {
    recommended: 'quick-setup',
    options: [
      { value: 'quick-setup', label: 'Quick setup & run pipeline' },
      { value: 'init', label: 'Initialize project (quick)' },
      { value: 'init-detailed', label: 'Initialize project (detailed — Jira, Confluence, etc.)' },
      { value: 'exit', label: 'Exit' },
    ],
  },
  'empty': {
    recommended: 'run',
    options: [
      { value: 'run', label: 'Run full pipeline' },
      { value: 'ingest', label: 'Ingest sources only' },
      { value: 'status', label: 'View status' },
      { value: 'exit', label: 'Exit' },
    ],
  },
  'ingested': {
    recommended: 'continue',
    options: [
      { value: 'continue', label: 'Continue pipeline (analyze → generate → export)' },
      { value: 'analyze', label: 'Analyze only' },
      { value: 'status', label: 'View status' },
      { value: 'exit', label: 'Exit' },
    ],
  },
  'analyzed': {
    recommended: 'continue',
    options: [
      { value: 'continue', label: 'Continue pipeline (generate → export)' },
      { value: 'generate', label: 'Generate only' },
      { value: 'diff', label: 'View diff from last run' },
      { value: 'status', label: 'View status' },
      { value: 'exit', label: 'Exit' },
    ],
  },
  'generated': {
    recommended: 'export',
    options: [
      { value: 'export', label: 'Export to format' },
      { value: 'review', label: 'Review specs (detect hallucinations)' },
      { value: 'generate', label: 'Re-generate specs' },
      { value: 'push-jira', label: 'Push tasks to Jira' },
      { value: 'diff', label: 'View diff from last run' },
      { value: 'validate', label: 'Validate output' },
      { value: 'reset', label: 'Start fresh — wipe all and re-run' },
      { value: 'status', label: 'View status' },
      { value: 'exit', label: 'Exit' },
    ],
  },
};

export function buildMenuOptions(state: WizardState): MenuOption[] {
  const menu = MENUS[state];
  return menu.options.map((opt) => ({
    ...opt,
    hint: opt.value === menu.recommended ? '(recommended)' : undefined,
  }));
}

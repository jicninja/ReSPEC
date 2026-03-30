import * as path from 'node:path';
import { readFileOrEmpty } from './utils.js';

export interface IntentQuestion {
  id: string;
  text: string;
  type: 'select' | 'multiselect' | 'text';
  options?: string[];
}

export interface IntentSuggestResult {
  questions: IntentQuestion[];
  summary: string;
}

export function buildIntentSuggestPrompt(rawDir: string, intent: string): string | null {
  const deps = readFileOrEmpty(path.join(rawDir, 'repo', 'dependencies.md'));
  const structure = readFileOrEmpty(path.join(rawDir, 'repo', 'structure.md'));

  if (!deps && !structure) return null;

  return `You are an AI project advisor. Based on the codebase analysis below, generate 2-4 targeted follow-up questions to help refine the project goal.

IMPORTANT: Return ONLY valid JSON, no markdown wrapping.

## Project Dependencies

${deps || '(No dependency data)'}

## Project Structure

${structure || '(No structure data)'}

## User's Selected Goal

${intent}

## Instructions

Generate follow-up questions specific to this codebase and the user's goal. Each question should help clarify scope, constraints, or focus areas.

Return JSON matching this schema:
{
  "questions": [
    {
      "id": "unique-id",
      "text": "Question text to display",
      "type": "select" | "multiselect" | "text",
      "options": ["option1", "option2"]
    }
  ],
  "summary": "One-line summary of what was found in the codebase"
}

Rules:
- Generate options from ACTUAL data found in the codebase (module names, frameworks, etc.)
- For "port / migration" goals: ask about target stack and which modules to port
- For "refactor" goals: ask about target architecture and focus areas
- For "version upgrade" goals: ask about target versions and breaking changes to address
- Keep questions concrete and actionable
- Return ONLY the JSON object`;
}

export function parseIntentSuggestResponse(response: string): IntentSuggestResult | null {
  if (!response) return null;

  try {
    return JSON.parse(response.trim());
  } catch {
    // Try fence extraction
  }

  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      return null;
    }
  }

  return null;
}

import * as path from 'node:path';
import { readFileOrEmpty } from './utils.js';

export interface IntentRefineResult {
  recommendations: string[];
  suggested_focus: string[];
}

export function buildIntentRefinePrompt(
  analyzedDir: string,
  intent: string | undefined,
  contextNotes: string | undefined,
): string {
  const report = readFileOrEmpty(path.join(analyzedDir, '_analysis-report.md'));
  const boundedContexts = readFileOrEmpty(path.join(analyzedDir, 'domain', 'bounded-contexts.md'));
  const architecture = readFileOrEmpty(path.join(analyzedDir, 'infra', 'architecture.md'));

  return `You are an AI project advisor. Based on the analysis below, provide recommendations to refine the project goal.

IMPORTANT: Return ONLY valid JSON, no markdown wrapping.

## Analysis Report

${report || '(No analysis report)'}

## Bounded Contexts

${boundedContexts || '(No bounded context data)'}

## Architecture

${architecture || '(No architecture data)'}

## Current Goal

${intent || '(No specific goal set)'}

## Additional Context

${contextNotes || '(None)'}

## Instructions

Provide actionable recommendations based on the analysis. Suggest which areas to focus on first, flag risks or coupling issues, and recommend a starting point.

Return JSON:
{
  "recommendations": ["recommendation 1", "recommendation 2"],
  "suggested_focus": ["bounded-context-1", "module-name"]
}`;
}

export function parseIntentRefineResponse(response: string): IntentRefineResult | null {
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

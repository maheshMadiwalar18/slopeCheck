import type { RiskLevel } from '@slopcheck/core';

export type BenchmarkCategory =
  | 'legitimate-popular'
  | 'legitimate-scoped'
  | 'typosquat'
  | 'scoped-impersonation'
  | 'hallucination'
  | 'unknown'
  | 'unsupported-dependency'
  | 'legitimate-new';

export interface TestCase {
  readonly package: string;
  readonly category: BenchmarkCategory;
  readonly expectedBehavior: RiskLevel | 'UNSUPPORTED';
  readonly expectedMinSeverity?: 'hard' | 'strong' | 'heuristic';

  readonly source: string;
  readonly sourceType:
    | 'dataset'
    | 'npm'
    | 'manually-reviewed'
    | 'generated';

  readonly rationale: string;
}

export const liveCorpus: readonly TestCase[] = [
  // Legitimate Popular
  { package: 'lodash', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: 'chalk', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: 'commander', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: 'debug', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: 'uuid', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: 'axios', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: 'moment', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: 'react', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'express', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'typescript', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'vite', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'next', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'eslint', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'prettier', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'webpack', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'axios', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'lodash', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },

  // Typosquats
  { package: 'axio', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of axios.' },
  { package: 'axioss', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of axios.' },
  { package: 'monent', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of moment.' },
  { package: 'vitta', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of vite.' },
  { package: 'nextt', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of next.' },
  { package: 'es-lint', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of eslint.' },
  { package: 'reacct-dom', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of react-dom.' },
  { package: 'reacct', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of react.' },
  { package: 'reactt', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of react.' },
  { package: 'reac', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of react.' },
  { package: 'expres', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of express.' },
  { package: 'expresss', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of express.' },
  { package: 'typecript', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of typescript.' },
  { package: 'typesript', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of typescript.' },
  { package: 'axois', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of axios.' },
  { package: 'lodas', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of lodash.' },

  // Scoped Impersonation
  { package: '@evil/react-dom', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Impersonation.' },
  { package: '@evil/lodash', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Impersonation.' },
  { package: '@evil/axios', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Impersonation.' },
  { package: '@evil/next', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Impersonation.' },
  { package: '@evil/vite', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Impersonation.' },
  { package: '@evil/react', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of react.' },
  { package: '@evil/express', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of express.' },
  { package: '@evil/typescript', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of typescript.' },
  { package: '@evil/reactt', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated scoped typosquat of react.' },

  // Hallucination
  { package: 'react-codeshift', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },
  { package: 'unused-imports', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },
  { package: 'huggingface-cli', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },

  // Legitimate Scoped
  { package: '@vue/compiler-core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: '@types/node', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: '@nestjs/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: '@mui/material', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package' },
  { package: '@angular/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: '@babel/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
];

export const deterministicCorpus: readonly TestCase[] = [
  // Legitimate Popular
  { package: 'react', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'express', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'typescript', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'vite', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'next', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'eslint', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'prettier', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: 'webpack', category: 'legitimate-popular', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },

  // Typosquats
  { package: 'reactt', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of react.' },
  { package: 'reacct', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of react.' },
  { package: 'expres', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of express.' },
  { package: 'expresss', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of express.' },
  { package: 'typecript', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of typescript.' },
  { package: 'lodas', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated typosquat of lodash.' },

  // Hallucinations
  { package: 'openai-auth-middleware', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in dataset.' },
  { package: 'stripe-fake-webhooks', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in dataset.' },
  { package: 'react-dom-server-render-to-stream', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in dataset.' },
  { package: 'react-codeshift', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },
  { package: 'unused-imports', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },
  { package: 'huggingface-cli', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },

  // Scoped Impersonation
  { package: '@evil/react', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of react.' },
  { package: '@evil/express', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of express.' },
  { package: '@evil/typescript', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of typescript.' },

  // Legitimate Scoped
  { package: '@angular/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: '@babel/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  
  // Legitimate New
  { package: 'some-new-startup-package', category: 'legitimate-new', expectedBehavior: 'SAFE', source: 'generated', sourceType: 'generated', rationale: 'New package with young age and low downloads but legit.' },
  // Unknown
  { package: 'this-package-definitely-does-not-exist-12345', category: 'unknown', expectedBehavior: 'UNKNOWN', source: 'generated', sourceType: 'generated', rationale: 'Does not exist.' },
];

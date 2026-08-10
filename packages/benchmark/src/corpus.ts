import type { RiskLevel } from '@slopcheck/core';

export type BenchmarkCategory =
  | 'legitimate-popular'
  | 'legitimate-scoped'
  | 'typosquat'
  | 'scoped-impersonation'
  | 'hallucination'
  | 'unknown'
  | 'unsupported-dependency';

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

export const corpus: readonly TestCase[] = [
  // Legitimate Popular
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
  { package: '@evil/react', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of react.' },
  { package: '@evil/express', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of express.' },
  { package: '@evil/typescript', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'generated', sourceType: 'generated', rationale: 'Generated impersonation of typescript.' },
  { package: '@evil/reactt', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'strong', source: 'generated', sourceType: 'generated', rationale: 'Generated scoped typosquat of react.' },

  // Hallucination
  { package: 'react-codeshift', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },
  { package: 'unused-imports', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },
  { package: 'huggingface-cli', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', source: 'official-hallucination-dataset', sourceType: 'dataset', rationale: 'Listed in the project\'s versioned hallucination corpus.' },

  // Legitimate Scoped
  { package: '@angular/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
  { package: '@babel/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', source: 'npm', sourceType: 'npm', rationale: 'Established package with long publication history and high download volume.' },
];

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
  readonly notes: string;
  readonly source?: string;
}

export const corpus: readonly TestCase[] = [
  // Legitimate Popular
  { package: 'react', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Highly popular front-end library' },
  { package: 'express', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Highly popular web framework' },
  { package: 'typescript', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Highly popular compiler' },
  { package: 'vite', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Popular build tool' },
  { package: 'next', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Popular React framework' },
  { package: 'eslint', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Popular linter' },
  { package: 'prettier', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Popular formatter' },
  { package: 'webpack', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Popular bundler' },
  { package: 'axios', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Popular HTTP client' },
  { package: 'lodash', category: 'legitimate-popular', expectedBehavior: 'SAFE', notes: 'Popular utility library' },

  // Typosquats
  { package: 'reacct', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of react' },
  { package: 'reactt', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of react' },
  { package: 'reac', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of react' },
  { package: 'expres', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of express' },
  { package: 'expresss', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of express' },
  { package: 'typecript', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of typescript' },
  { package: 'typesript', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of typescript' },
  { package: 'axois', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of axios' },
  { package: 'lodas', category: 'typosquat', expectedBehavior: 'HIGH', expectedMinSeverity: 'strong', notes: 'Typosquat of lodash' },

  // Scoped Impersonation
  { package: '@evil/react', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', notes: 'Impersonates react' },
  { package: '@evil/express', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', notes: 'Impersonates express' },
  { package: '@evil/typescript', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', notes: 'Impersonates typescript' },
  { package: '@evil/reactt', category: 'scoped-impersonation', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'strong', notes: 'Scoped typosquat of react' },

  // Hallucination
  { package: 'react-codeshift', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', notes: 'Explicit hallucination from dataset' },
  { package: 'unused-imports', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', notes: 'Explicit hallucination from dataset' },
  { package: 'huggingface-cli', category: 'hallucination', expectedBehavior: 'CRITICAL', expectedMinSeverity: 'hard', notes: 'Explicit hallucination from dataset' },

  // Legitimate Scoped
  { package: '@angular/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', notes: 'Legitimate scoped package' },
  { package: '@babel/core', category: 'legitimate-scoped', expectedBehavior: 'SAFE', notes: 'Legitimate scoped package' },
];

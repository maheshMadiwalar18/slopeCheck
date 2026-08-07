import type { NpmPackageMetadata, NpmDownloadStats, GithubMetadata } from '@slopcheck/registry';

export type RiskLevel = 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';

export interface RiskFactor {
  name: string;
  description: string;
  score: number; // 0-100
  weight: number; // Weight in final calculation (0-1)
}

export interface PackageContext {
  name: string;
  version?: string;
  npm?: NpmPackageMetadata | null;
  downloads?: NpmDownloadStats | null;
  github?: GithubMetadata | null;
}

export interface RiskAssessment {
  package: string;
  score: number; // 0-100, higher is worse
  level: RiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
}

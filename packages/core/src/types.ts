// ---------------------------------------------------------------------------
// Domain types — these are the core abstractions of slopcheck.
// They are defined here with ZERO external dependencies so that @slopcheck/core
// can be consumed independently by third-party tools.
//
// The registry package's Zod-inferred types structurally satisfy these interfaces
// via TypeScript's structural subtyping — no explicit "implements" needed.
// ---------------------------------------------------------------------------

/**
 * Risk severity level for a package.
 */
export type RiskLevel = 'UNKNOWN' | 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';

/**
 * A single risk signal identified by a detector plugin.
 */
export interface RiskFactor {
  readonly name: string;
  readonly description: string;
  /** Risk score from 0 (no risk) to 100 (maximum risk). */
  readonly score: number;
  /** Weight in the final aggregation. Higher = more influence. */
  readonly weight: number;
  /** Classification of the signal severity to determine if it can be diluted. */
  readonly severityClass?: 'hard' | 'strong' | 'heuristic' | undefined;
}

// ---------------------------------------------------------------------------
// Minimal metadata interfaces (satisfied by registry types via duck typing)
// ---------------------------------------------------------------------------

/**
 * Minimal npm package metadata needed for risk analysis.
 */
export interface NpmPackageMetadata {
  readonly name: string;
  readonly description?: string | undefined;
  readonly time: Readonly<Record<string, string>>;
  readonly maintainers?: ReadonlyArray<{ readonly name: string; readonly email?: string | undefined }> | undefined;
  readonly repository?: string | { readonly type?: string | undefined; readonly url: string } | undefined;
  readonly homepage?: string | undefined;
}

/**
 * Minimal npm download statistics needed for risk analysis.
 */
export interface DownloadStats {
  readonly downloads: number;
  readonly start: string;
  readonly end: string;
  readonly package: string;
}

/**
 * Minimal GitHub repository metadata needed for risk analysis.
 */
export interface GithubInfo {
  readonly full_name: string;
  readonly stargazers_count: number;
  readonly forks_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly pushed_at: string;
  readonly archived?: boolean | undefined;
  readonly disabled?: boolean | undefined;
}

export interface VulnerabilityFinding {
  readonly id: string;
  readonly source: string;
  readonly severity: string;
  readonly package: string;
  readonly affectedVersions: readonly string[];
  readonly fixedVersions?: readonly string[] | undefined;
  readonly summary: string;
}

/**
 * All available context for evaluating a package's risk.
 * Populated incrementally by the CLI engine before passing to detectors.
 */
export interface PackageContext {
  readonly name: string;
  readonly version?: string | undefined;
  npm?: NpmPackageMetadata | null | undefined;
  downloads?: DownloadStats | null | undefined;
  github?: GithubInfo | null | undefined;
  vulnerabilities?: readonly VulnerabilityFinding[] | null | undefined;
}

export type AssessmentStatus = 'COMPLETE' | 'PARTIAL' | 'NOT_FOUND' | 'UNAVAILABLE';

export interface AssessmentError {
  readonly source: string;
  readonly code: string;
  readonly message: string;
}

/**
 * The final risk assessment produced by the RiskEngine.
 */
export interface RiskContribution {
  readonly factor: string;
  readonly score: number;
  readonly weight: number;
  readonly contribution: number;
}

export interface RiskAssessment {
  readonly package: string;
  readonly status: AssessmentStatus;
  readonly datasetVersion?: string | undefined;
  readonly assessable: boolean;
  readonly score: number | null;
  readonly level: RiskLevel;
  readonly factors: readonly RiskFactor[];
  readonly vulnerabilities?: readonly VulnerabilityFinding[] | undefined;
  readonly recommendations: readonly string[];
  readonly errors: readonly AssessmentError[];
  readonly scoring?: {
    readonly totalWeightedScore: number;
    readonly totalWeight: number;
    readonly heuristicAverage: number;
    readonly finalScore: number;
    readonly contributions: readonly RiskContribution[];
  };
}

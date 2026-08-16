import { z } from 'zod';
import * as semver from 'semver';
import type { VulnerabilityFinding } from '@slopcheck/core';

export const OsvEventSchema = z.object({
  introduced: z.string().optional(),
  fixed: z.string().optional(),
  last_affected: z.string().optional(),
  limit: z.string().optional()
});

export const OsvRangeSchema = z.object({
  type: z.enum(['ECOSYSTEM', 'GIT', 'SEMVER']).catch('ECOSYSTEM'),
  events: z.array(OsvEventSchema)
});

export const OsvAffectedSchema = z.object({
  package: z.object({
    name: z.string(),
    ecosystem: z.string()
  }),
  ranges: z.array(OsvRangeSchema).optional(),
  versions: z.array(z.string()).optional(),
  database_specific: z.any().optional(),
  ecosystem_specific: z.any().optional()
});

export const OsvVulnerabilitySchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  details: z.string().optional(),
  modified: z.string().optional(),
  published: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  severity: z.array(z.object({
    type: z.string(),
    score: z.string()
  })).optional(),
  affected: z.array(OsvAffectedSchema).optional(),
  database_specific: z.record(z.string(), z.any()).optional()
});

export const OsvResponseSchema = z.object({
  vulns: z.array(OsvVulnerabilitySchema).optional()
});

export type OsvVulnerability = z.infer<typeof OsvVulnerabilitySchema>;
export type OsvResponse = z.infer<typeof OsvResponseSchema>;

/**
 * Normalizes an OSV vulnerability into a standard VulnerabilityFinding
 */
export function normalizeOsv(vuln: OsvVulnerability, packageName: string): VulnerabilityFinding {
  // Find affected entry for the package
  const affected = vuln.affected?.find(a => a.package.name === packageName && a.package.ecosystem === 'npm');
  
  const affectedVersions: string[] = [];
  const fixedVersions: string[] = [];

  if (affected) {
    if (affected.ranges) {
      for (const range of affected.ranges) {
        if (range.type === 'SEMVER' || range.type === 'ECOSYSTEM') {
          for (let i = 0; i < range.events.length; i++) {
            const event = range.events[i];
            if (!event) continue;
            if (event.introduced) {
              const nextEvent = range.events[i + 1];
              if (nextEvent && nextEvent.fixed) {
                affectedVersions.push(`>=${event.introduced} <${nextEvent.fixed}`);
                fixedVersions.push(nextEvent.fixed);
              } else if (nextEvent && nextEvent.last_affected) {
                affectedVersions.push(`>=${event.introduced} <=${nextEvent.last_affected}`);
              } else {
                affectedVersions.push(`>=${event.introduced}`);
              }
            } else if (event.fixed) {
               // If there's a fixed event without a preceding introduced, assume from 0.0.0
               if (i === 0) {
                 affectedVersions.push(`<${event.fixed}`);
                 fixedVersions.push(event.fixed);
               } else {
                 fixedVersions.push(event.fixed);
               }
            }
          }
        }
      }
    }
    
    // Fallback to explicit versions if ranges didn't yield anything
    if (affectedVersions.length === 0 && affected.versions && affected.versions.length > 0) {
      affectedVersions.push(...affected.versions);
    }
  }

  // Determine severity
  let severity = 'UNKNOWN';
  if (vuln.database_specific?.severity) {
    severity = String(vuln.database_specific.severity).toUpperCase();
  } else if (vuln.severity && vuln.severity.length > 0) {
    severity = 'HIGH'; // Fallback
  } else if (affected?.database_specific?.cvss) {
    const cvssScore = affected.database_specific.cvss.score;
    if (typeof cvssScore === 'number') {
      if (cvssScore >= 9.0) severity = 'CRITICAL';
      else if (cvssScore >= 7.0) severity = 'HIGH';
      else if (cvssScore >= 4.0) severity = 'MODERATE';
      else severity = 'LOW';
    }
  } else {
    if (vuln.aliases?.some(a => a.startsWith('GHSA-') || a.startsWith('CVE-'))) {
       severity = 'HIGH'; // Safe default
    }
  }

  const normalizedSeverity = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].includes(severity) ? severity : 'HIGH';
  
  let summary = vuln.summary || vuln.details || 'No description provided.';
  // truncate long summaries
  if (summary.length > 150) {
    summary = summary.substring(0, 147) + '...';
  }

  return {
    id: vuln.id,
    source: 'OSV.dev',
    severity: normalizedSeverity,
    package: packageName,
    affectedVersions: affectedVersions.length > 0 ? affectedVersions : ['*'],
    fixedVersions: fixedVersions.length > 0 ? Array.from(new Set(fixedVersions)) : undefined,
    summary,
  };
}

/**
 * Checks if a specific version intersects with any of the affected ranges
 */
export function isVersionAffected(version: string, finding: VulnerabilityFinding): boolean {
  try {
    for (const range of finding.affectedVersions) {
      if (range === '*') return true;
      if (semver.intersects(version, range)) {
        return true;
      }
    }
    return false;
  } catch {
    // If semver fails to parse (e.g. invalid version format), assume affected
    return true;
  }
}

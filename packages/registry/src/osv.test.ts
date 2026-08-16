import { describe, it, expect } from 'vitest';
import { normalizeOsv, isVersionAffected } from './osv';

describe('OSV Normalization', () => {
  it('normalizes a basic OSV finding', () => {
    const finding = normalizeOsv({
      id: 'CVE-1234',
      summary: 'Test summary',
      affected: [{
        package: { name: 'test-pkg', ecosystem: 'npm' },
        ranges: [{
          type: 'SEMVER',
          events: [{ introduced: '1.0.0' }, { fixed: '1.2.0' }]
        }]
      }],
      database_specific: { severity: 'HIGH' }
    }, 'test-pkg');

    expect(finding.id).toBe('CVE-1234');
    expect(finding.severity).toBe('HIGH');
    expect(finding.affectedVersions).toEqual(['>=1.0.0 <1.2.0']);
    expect(finding.fixedVersions).toEqual(['1.2.0']);
  });

  it('normalizes missing severity to HIGH', () => {
    const finding = normalizeOsv({
      id: 'CVE-1235',
      affected: [{
        package: { name: 'test-pkg', ecosystem: 'npm' }
      }]
    }, 'test-pkg');

    expect(finding.severity).toBe('HIGH');
    expect(finding.affectedVersions).toEqual(['*']);
  });

  it('checks version intersection correctly', () => {
    const finding = normalizeOsv({
      id: 'CVE-1236',
      affected: [{
        package: { name: 'test-pkg', ecosystem: 'npm' },
        ranges: [{
          type: 'SEMVER',
          events: [{ introduced: '1.0.0' }, { fixed: '2.0.0' }]
        }]
      }]
    }, 'test-pkg');

    expect(isVersionAffected('1.5.0', finding)).toBe(true);
    expect(isVersionAffected('2.0.0', finding)).toBe(false);
    expect(isVersionAffected('0.9.0', finding)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import {
  getOfficialHallucinations,
  getCommunityHallucinations,
  getKnownHallucinationNames,
  getPopularPackages,
  getProtectedPackages,
  normalizePackageName,
  getDatasetManifest,
  getHallucinationMap
} from './index';

describe('normalizePackageName', () => {
  it('should trim and lowercase names', () => {
    expect(normalizePackageName(' React ')).toBe('react');
    expect(normalizePackageName('@Angular/Core')).toBe('@angular/core');
  });
});

describe('getDatasetManifest', () => {
  it('should load and parse the manifest', async () => {
    const manifest = await getDatasetManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.datasetVersion).toBeDefined();
    expect(manifest.datasets['official']).toBeDefined();
    expect(manifest.datasets['community']).toBeDefined();
    expect(manifest.datasets['protected']).toBeDefined();
    expect(manifest.datasets['popular-packages']).toBeDefined();
  });
});

describe('getProtectedPackages', () => {
  it('should return a Set of protected package names', async () => {
    const protectedPkgs = await getProtectedPackages();
    expect(protectedPkgs).toBeInstanceOf(Set);
    expect(protectedPkgs.has('react')).toBe(true);
    expect(protectedPkgs.has('typescript')).toBe(true);
  });
});

describe('getOfficialHallucinations', () => {
  it('should return an array of HallucinationRecord objects', async () => {
    const records = await getOfficialHallucinations();
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);

    for (const r of records) {
      expect(typeof r.package).toBe('string');
      expect(typeof r.source).toBe('string');
      expect(typeof r.date_added).toBe('string');
    }
  });

  it('should include known hallucinated packages', async () => {
    const records = await getOfficialHallucinations();
    const names = records.map(r => r.package);
    expect(names).toContain('react-codeshift');
    expect(names).toContain('express-router-v2');
  });

  it('should return a cached reference on subsequent calls', async () => {
    const first = await getOfficialHallucinations();
    const second = await getOfficialHallucinations();
    expect(first).toBe(second); // same reference
  });
});

describe('getCommunityHallucinations', () => {
  it('should return an array of HallucinationRecord objects', async () => {
    const records = await getCommunityHallucinations();
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  it('should include known community-reported packages', async () => {
    const records = await getCommunityHallucinations();
    const names = records.map(r => r.package);
    expect(names).toContain('discord-token-grabber-x');
  });
});

describe('getHallucinationMap', () => {
  it('should enforce official precedence over community and ignore protected', async () => {
    const map = await getHallucinationMap();
    expect(map.has('react-codeshift')).toBe(true);
    expect(map.has('discord-token-grabber-x')).toBe(true);
    
    // Ensure protected packages aren't in the hallucination map
    expect(map.has('react')).toBe(false);
    expect(map.has('typescript')).toBe(false);
  });
});

describe('getKnownHallucinationNames', () => {
  it('should return a Set containing names from both datasets', async () => {
    const names = await getKnownHallucinationNames();
    expect(names).toBeInstanceOf(Set);
    expect(names.has('react-codeshift')).toBe(true);
    expect(names.has('discord-token-grabber-x')).toBe(true);
  });
});

describe('getPopularPackages', () => {
  it('should return an array of strings', async () => {
    const packages = await getPopularPackages();
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThan(0);
  });

  it('should include well-known popular packages', async () => {
    const packages = await getPopularPackages();
    expect(packages).toContain('react');
    expect(packages).toContain('lodash');
    expect(packages).toContain('express');
  });
});

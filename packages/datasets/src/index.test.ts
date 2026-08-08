import { describe, it, expect } from 'vitest';
import {
  getOfficialHallucinations,
  getCommunityHallucinations,
  getKnownHallucinationNames,
  getPopularPackages,
} from './index';

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

    for (const r of records) {
      expect(typeof r.package).toBe('string');
      expect(typeof r.source).toBe('string');
      expect(typeof r.date_added).toBe('string');
    }
  });

  it('should include known community-reported packages', async () => {
    const records = await getCommunityHallucinations();
    const names = records.map(r => r.package);
    expect(names).toContain('discord-token-grabber-x');
  });
});

describe('getKnownHallucinationNames', () => {
  it('should return a Set containing names from both datasets', async () => {
    const names = await getKnownHallucinationNames();
    expect(names).toBeInstanceOf(Set);
    // Official
    expect(names.has('react-codeshift')).toBe(true);
    // Community
    expect(names.has('discord-token-grabber-x')).toBe(true);
  });

  it('should return a cached reference on subsequent calls', async () => {
    const first = await getKnownHallucinationNames();
    const second = await getKnownHallucinationNames();
    expect(first).toBe(second);
  });
});

describe('getPopularPackages', () => {
  it('should return an array of strings', async () => {
    const packages = await getPopularPackages();
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThan(0);
    for (const p of packages) {
      expect(typeof p).toBe('string');
    }
  });

  it('should include well-known popular packages', async () => {
    const packages = await getPopularPackages();
    expect(packages).toContain('react');
    expect(packages).toContain('lodash');
    expect(packages).toContain('express');
  });

  it('should return a cached reference on subsequent calls', async () => {
    const first = await getPopularPackages();
    const second = await getPopularPackages();
    expect(first).toBe(second);
  });
});

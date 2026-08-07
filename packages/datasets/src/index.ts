import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface HallucinationRecord {
  package: string;
  source: string;
  date_added: string;
  notes?: string;
}

export async function getOfficialHallucinations(): Promise<HallucinationRecord[]> {
  const dataPath = path.resolve(__dirname, '../data/official.json');
  const content = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(content);
}

export async function getCommunityHallucinations(): Promise<HallucinationRecord[]> {
  const dataPath = path.resolve(__dirname, '../data/community.json');
  const content = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(content);
}

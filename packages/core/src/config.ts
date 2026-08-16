import fs from 'node:fs/promises';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { PolicySchema, type SlopcheckPolicyConfig } from './policy';

export async function loadConfig(filePath?: string): Promise<SlopcheckPolicyConfig | null> {
  const possiblePaths = filePath 
    ? [path.resolve(process.cwd(), filePath)]
    : [
        path.resolve(process.cwd(), '.slopcheck.yml'),
        path.resolve(process.cwd(), 'slopcheck.config.json'),
        path.resolve(process.cwd(), '.github/slopcheck-policy.yml')
      ];

  for (const p of possiblePaths) {
    try {
      const content = await fs.readFile(p, 'utf-8');
      
      let parsed: unknown;
      if (p.endsWith('.json')) {
        parsed = JSON.parse(content);
      } else if (p.endsWith('.yml') || p.endsWith('.yaml')) {
        parsed = yaml.load(content);
      } else {
        // Try guessing based on content
        if (content.trim().startsWith('{')) {
          parsed = JSON.parse(content);
        } else {
          parsed = yaml.load(content);
        }
      }

      return PolicySchema.parse(parsed);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        // If explicitly requested file isn't found, throw. Otherwise continue searching defaults.
        if (filePath) {
          throw new Error(`Policy file not found: ${filePath}`);
        }
        continue;
      }
      throw new Error(`Failed to load policy file ${p}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // If explicit file was provided but loop finished without finding it (should be caught above, but just in case)
  if (filePath) {
     throw new Error(`Policy file not found: ${filePath}`);
  }

  return null;
}

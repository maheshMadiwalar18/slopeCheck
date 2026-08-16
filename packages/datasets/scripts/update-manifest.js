import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
const manifestPath = path.resolve(dataDir, 'manifest.json');

const filesToHash = [
  'official.json',
  'community.json',
  'popular-packages.json',
  'protected.json'
];

function generateChecksum(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

const manifest = {
  schemaVersion: 1,
  datasetVersion: `2026.08.1`,
  generatedAt: new Date().toISOString(),
  datasets: {}
};

for (const file of filesToHash) {
  const filePath = path.resolve(dataDir, file);
  const name = path.basename(file, '.json');
  
  const checksum = generateChecksum(filePath);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const version = `1.0.0`;

  manifest.datasets[name] = {
    version,
    sha256: checksum,
    records: Array.isArray(content) ? content.length : Object.keys(content).length
  };
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Manifest updated at ${manifestPath}`);

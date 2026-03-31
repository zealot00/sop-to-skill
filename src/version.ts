import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface PackageMetadata {
  name: string;
  version: string;
  description: string;
}

const FALLBACK: PackageMetadata = {
  name: 'sop-to-skill',
  version: process.env.npm_package_version || '1.0.0',
  description: 'Convert SOP documents to executable AI Agent Skills',
};

async function loadPackageJson(): Promise<PackageMetadata> {
  const packagePaths = [
    path.join(process.cwd(), 'package.json'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json'),
  ];

  for (const packagePath of packagePaths) {
    try {
      const raw = await fs.readFile(packagePath, 'utf-8');
      const data = JSON.parse(raw) as Partial<PackageMetadata>;
      if (data.name && data.version) {
        return {
          name: data.name,
          version: data.version,
          description: data.description || FALLBACK.description,
        };
      }
    } catch {
      // Ignore invalid/unreachable path and continue fallback chain.
    }
  }

  return FALLBACK;
}

let cache: PackageMetadata | undefined;

export async function getPackageMetadata(): Promise<PackageMetadata> {
  if (!cache) {
    cache = await loadPackageJson();
  }
  return cache;
}

export function getPackageVersionSync(): string {
  const packagePaths = [
    path.join(process.cwd(), 'package.json'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json'),
  ];

  for (const packagePath of packagePaths) {
    try {
      const raw = readFileSync(packagePath, 'utf-8');
      const data = JSON.parse(raw) as { version?: string };
      if (data.version) {
        return data.version;
      }
    } catch {
      // Ignore and continue fallback chain.
    }
  }

  return process.env.npm_package_version || '0.0.0';
}

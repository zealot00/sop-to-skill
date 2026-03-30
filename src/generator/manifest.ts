import type { SkillManifest } from '../types/index.js';
import yaml from 'js-yaml';

export function generateManifestYaml(manifest: SkillManifest): string {
  return yaml.dump(manifest, { indent: 2, lineWidth: -1 });
}
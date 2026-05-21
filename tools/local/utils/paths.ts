import * as path from 'path';

export function resolveProjectRoot(rootDirOverride?: string): string {
  return path.resolve(rootDirOverride ?? process.cwd());
}

export function resolveFromProjectRoot(projectRoot: string, relativePath: string): string {
  return path.join(projectRoot, relativePath);
}

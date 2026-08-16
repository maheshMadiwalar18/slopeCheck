import fs from 'node:fs/promises';
import * as yaml from 'js-yaml';
import { DependencyGraph, PackageNode, DependencyEdge, DependencySource } from '@slopcheck/core';

interface PnpmLockfile {
  lockfileVersion: string | number;
  importers?: Record<string, {
    dependencies?: Record<string, any>;
    devDependencies?: Record<string, any>;
    optionalDependencies?: Record<string, any>;
  }>;
  dependencies?: Record<string, any>;
  devDependencies?: Record<string, any>;
  optionalDependencies?: Record<string, any>;
  packages?: Record<string, PnpmPackage>;
}

interface PnpmPackage {
  resolution?: { integrity?: string; tarball?: string };
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  name?: string;
  version?: string;
}

export async function parsePnpmLock(filePath: string): Promise<DependencyGraph> {
  const content = await fs.readFile(filePath, 'utf-8');
  let data: PnpmLockfile;
  try {
    data = yaml.load(content) as PnpmLockfile;
  } catch (err) {
    throw new Error('Invalid lockfile: Malformed YAML');
  }

  if (!data.lockfileVersion) {
    throw new Error('Unsupported lockfile version: Missing lockfileVersion');
  }

  const nodes = new Map<string, PackageNode>();
  const edges: DependencyEdge[] = [];

  const packages = data.packages || {};

  // For root node
  const rootId = 'root';
  nodes.set(rootId, {
    id: rootId,
    name: 'root',
    version: '0.0.0',
    source: 'local',
    isWorkspace: true,
    resolutionPath: ['root']
  });

  const getPackageInfoFromKey = (key: string, pkgData: PnpmPackage) => {
    // Keys often look like: "/react@18.2.0" or "react@18.2.0" or "react@18.2.0(foo@1.0.0)"
    if (pkgData.name && pkgData.version) {
      return { name: pkgData.name, version: pkgData.version };
    }

    let cleanKey = key;
    if (cleanKey.startsWith('/')) cleanKey = cleanKey.slice(1);
    
    // Remove peer dep suffixes like (react@18.2.0)
    const parenIndex = cleanKey.indexOf('(');
    if (parenIndex > 0) {
      cleanKey = cleanKey.substring(0, parenIndex);
    }

    const lastAt = cleanKey.lastIndexOf('@');
    if (lastAt > 0) {
      return {
        name: cleanKey.substring(0, lastAt),
        version: cleanKey.substring(lastAt + 1)
      };
    }

    return { name: cleanKey, version: '0.0.0' };
  };

  for (const [pkgKey, pkgData] of Object.entries(packages)) {
    const { name, version } = getPackageInfoFromKey(pkgKey, pkgData);
    
    // Simplistic heuristic for source
    let source: DependencySource = 'npm';
    if (pkgKey.startsWith('file:') || pkgKey.startsWith('link:')) {
      source = 'local';
    } else if (pkgData.resolution?.tarball?.startsWith('git+')) {
      source = 'git';
    } else if (pkgData.resolution?.tarball && !pkgData.resolution.tarball.startsWith('http')) {
      source = 'file';
    }

    nodes.set(pkgKey, {
      id: pkgKey,
      name,
      version,
      source,
      integrity: pkgData.resolution?.integrity,
      isWorkspace: source === 'local',
      resolutionPath: [] // to be computed
    });
  }

  // Connect root to direct dependencies
  const processDirectDeps = (depsMap: Record<string, any> | undefined, type: 'prod' | 'dev' | 'optional') => {
    if (!depsMap) return;
    for (const [depName, depInfo] of Object.entries(depsMap)) {
      // In PNPM lockfile v9+, depInfo might be an object { version, specifier } or a string
      const versionStr = typeof depInfo === 'string' ? depInfo : (depInfo.version as string);
      if (!versionStr) continue;

      // Find the corresponding node id in packages. This is a heuristic lookup.
      // Usually the key in `packages` corresponds to the `versionStr` format.
      let targetKey: string | undefined;
      
      // Often versionStr looks like "18.2.0" and package key is "/react@18.2.0"
      const exactMatch = Object.keys(packages).find(k => k === versionStr);
      if (exactMatch) {
        targetKey = exactMatch;
      } else {
        // Try finding by name and version
        const vParts = versionStr.split('(')[0]; // remove peers from versionStr
        const cleanVer = vParts.startsWith('link:') ? vParts : vParts.replace(/^[^\d]/, ''); // remove ^ or ~ just in case, though pnpm usually stores exact version here
        
        targetKey = Object.keys(packages).find(k => {
           if (k.includes(`${depName}@${cleanVer}`)) return true;
           if (k === `${depName}@${versionStr}`) return true;
           if (k === `/${depName}@${versionStr}`) return true;
           return false;
        });
      }

      if (targetKey && nodes.has(targetKey)) {
        edges.push({
          parent: rootId,
          child: targetKey,
          type
        });
      }
    }
  };

  if (data.importers) {
    for (const importer of Object.values(data.importers)) {
      processDirectDeps(importer.dependencies, 'prod');
      processDirectDeps(importer.devDependencies, 'dev');
      processDirectDeps(importer.optionalDependencies, 'optional');
    }
  } else {
    processDirectDeps(data.dependencies, 'prod');
    processDirectDeps(data.devDependencies, 'dev');
    processDirectDeps(data.optionalDependencies, 'optional');
  }

  // Connect transitive dependencies
  for (const [pkgKey, pkgData] of Object.entries(packages)) {
    const allDeps = [
      { deps: pkgData.dependencies, type: 'prod' as const },
      { deps: pkgData.optionalDependencies, type: 'optional' as const },
    ];

    for (const { deps, type } of allDeps) {
      if (!deps) continue;
      for (const [depName, versionStr] of Object.entries(deps)) {
        let targetKey: string | undefined;
        
        const exactMatch = Object.keys(packages).find(k => k === versionStr);
        if (exactMatch) {
          targetKey = exactMatch;
        } else {
          const vParts = versionStr.split('(')[0];
          targetKey = Object.keys(packages).find(k => {
             if (k.includes(`${depName}@${vParts}`)) return true;
             return false;
          });
        }

        if (targetKey && nodes.has(targetKey)) {
          edges.push({
            parent: pkgKey,
            child: targetKey,
            type
          });
        }
      }
    }
  }

  // Compute shortest resolution paths using BFS from root
  const queue = [{ id: rootId, path: ['root'] }];
  const visited = new Set<string>();
  visited.add(rootId);

  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.parent)) adj.set(edge.parent, []);
    adj.get(edge.parent)!.push(edge.child);
  }

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    const children = adj.get(id) || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId);
        const childNode = nodes.get(childId)!;
        const newPath = [...path, childNode.name];
        childNode.resolutionPath = newPath;
        queue.push({ id: childId, path: newPath });
      }
    }
  }

  return { nodes, edges };
}

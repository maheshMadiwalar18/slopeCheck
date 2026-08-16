import fs from 'node:fs/promises';
import path from 'node:path';
import { DependencyGraph, PackageNode, DependencyEdge, DependencySource } from '@slopcheck/core';

interface NpmLockfileV3 {
  name: string;
  version: string;
  lockfileVersion: number;
  packages?: Record<string, NpmPackage>;
}

interface NpmPackage {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  link?: boolean;
}

export async function parsePackageLock(filePath: string): Promise<DependencyGraph> {
  const content = await fs.readFile(filePath, 'utf-8');
  let data: NpmLockfileV3;
  try {
    data = JSON.parse(content);
  } catch (err) {
    throw new Error('Invalid lockfile: Malformed JSON');
  }

  if (data.lockfileVersion < 2 || !data.packages) {
    throw new Error(`Unsupported lockfile version: ${data.lockfileVersion}. Only lockfileVersion >= 2 (npm v7+) is supported.`);
  }

  const nodes = new Map<string, PackageNode>();
  const edges: DependencyEdge[] = [];

  const packages = data.packages;

  // We need to resolve names. In "packages" object, the key is the path like "node_modules/foo/node_modules/bar".
  // The name is either explicitly in the object, or derived from the last segment.
  const getPackageName = (pkgPath: string, pkgData: NpmPackage): string => {
    if (pkgData.name) return pkgData.name;
    if (pkgPath === '') return data.name || 'root';
    const parts = pkgPath.split('node_modules/');
    return parts[parts.length - 1];
  };

  // Pre-process all nodes to build the map of paths to id
  // Map of node path -> node id
  const pathToId = new Map<string, string>();

  for (const [pkgPath, pkgData] of Object.entries(packages)) {
    const name = getPackageName(pkgPath, pkgData);
    const version = pkgData.version || '0.0.0';
    
    let source: DependencySource = 'npm';
    if (pkgPath === '') {
      source = 'local';
    } else if (pkgData.link) {
      source = 'local';
    } else if (pkgData.resolved && !pkgData.resolved.startsWith('http') && !pkgData.resolved.startsWith('git')) {
      source = 'file';
    } else if (pkgData.resolved && pkgData.resolved.startsWith('git')) {
      source = 'git';
    }

    const id = `${name}@${version}-${pkgPath}`; // ensure uniqueness even for duplicate versions in different paths
    pathToId.set(pkgPath, id);

    nodes.set(id, {
      id,
      name,
      version,
      source,
      integrity: pkgData.integrity,
      isWorkspace: source === 'local',
      resolutionPath: [] // to be computed
    });
  }

  // Find root id
  const rootId = pathToId.get('');

  // We need a helper to find the actual resolved path of a dependency from a given package path
  // In npm v3, if package A requires B, B is found by checking A's node_modules, then parent's node_modules, etc.
  const findDependencyPath = (parentPath: string, depName: string): string | undefined => {
    let currentPath = parentPath;
    while (true) {
      const targetPath = currentPath === '' ? `node_modules/${depName}` : `${currentPath}/node_modules/${depName}`;
      if (packages[targetPath]) {
        return targetPath;
      }
      if (currentPath === '') break;
      // pop one level
      const lastNodeModules = currentPath.lastIndexOf('node_modules');
      if (lastNodeModules <= 0) {
        currentPath = '';
      } else {
        currentPath = currentPath.substring(0, lastNodeModules - 1);
      }
    }
    return undefined; // Not found in the tree
  };

  // Build edges
  for (const [pkgPath, pkgData] of Object.entries(packages)) {
    const parentId = pathToId.get(pkgPath)!;

    const allDeps = [
      { deps: pkgData.dependencies, type: 'prod' as const },
      { deps: pkgData.devDependencies, type: 'dev' as const },
      { deps: pkgData.peerDependencies, type: 'peer' as const },
      { deps: pkgData.optionalDependencies, type: 'optional' as const },
    ];

    for (const { deps, type } of allDeps) {
      if (!deps) continue;
      for (const [depName, _] of Object.entries(deps)) {
        const resolvedPath = findDependencyPath(pkgPath, depName);
        if (resolvedPath) {
          const childId = pathToId.get(resolvedPath)!;
          edges.push({
            parent: parentId,
            child: childId,
            type
          });
        }
      }
    }
  }

  // Compute shortest resolution paths using BFS from root
  if (rootId) {
    const queue = [{ id: rootId, path: [nodes.get(rootId)!.name] }];
    const visited = new Set<string>();
    visited.add(rootId);

    // Initial path for root
    nodes.get(rootId)!.resolutionPath = [nodes.get(rootId)!.name];

    // Build adjacency list for BFS
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
  }

  return { nodes, edges };
}

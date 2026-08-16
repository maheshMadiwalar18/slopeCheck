export type DependencySource = 'npm' | 'local' | 'git' | 'file';

export interface PackageNode {
  id: string; // Unique identifier, e.g. "package-name@version" or "package-name@local-path"
  name: string;
  version: string;
  source: DependencySource;
  integrity?: string;
  isWorkspace: boolean;
  // The shortest dependency path from the root project to this node
  // E.g., ["project", "express", "accepts", "negotiator"]
  resolutionPath: string[]; 
}

export interface DependencyEdge {
  parent: string; // parent node id
  child: string;  // child node id
  type?: 'prod' | 'dev' | 'peer' | 'optional';
}

export interface DependencyGraph {
  nodes: Map<string, PackageNode>;
  edges: DependencyEdge[];
}

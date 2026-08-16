export interface ParsedPackage {
  name: string;
  version?: string;
}

export interface ParsedCommand {
  isInstall: boolean;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  packages: ParsedPackage[];
}

/**
 * Safely parses a shell command to determine if it is a package installation.
 * Extracts the packages without executing the string.
 * Hard-stops parsing if shell injection/chaining characters are encountered.
 */
export function parseInstallCommand(command: string): ParsedCommand {
  const result: ParsedCommand = { isInstall: false, packages: [] };
  
  // 1. Check if the command starts with an install command
  const installRegex = /^\s*(npm|pnpm|yarn|bun)\s+(install|i|add)\b/;
  const match = command.match(installRegex);
  
  if (!match) {
    return result;
  }

  result.isInstall = true;
  result.packageManager = match[1] as 'npm' | 'pnpm' | 'yarn' | 'bun';

  // 2. Extract the remaining string
  const rest = command.slice(match[0].length).trim();
  if (!rest) {
    return result;
  }

  // 3. Tokenize by whitespace
  const tokens = rest.split(/\s+/);
  
  for (let token of tokens) {
    if (!token) continue;
    
    // Stop processing if we hit shell injection/chaining tokens
    // We treat these as barriers: anything after this belongs to another command
    if (token.match(/^[;&|<>]/) || token.includes('$(') || token.includes('`')) {
      break;
    }
    
    // Handle cases where a semicolon or ampersand is attached to a package name
    // e.g. "react;" or "express&&"
    let stopProcessing = false;
    
    const semiIndex = token.indexOf(';');
    if (semiIndex !== -1) {
      token = token.slice(0, semiIndex);
      stopProcessing = true;
    } else {
      const andIndex = token.indexOf('&&');
      if (andIndex !== -1) {
        token = token.slice(0, andIndex);
        stopProcessing = true;
      } else {
        const pipeIndex = token.indexOf('|');
        if (pipeIndex !== -1) {
          token = token.slice(0, pipeIndex);
          stopProcessing = true;
        }
      }
    }

    // Ignore flags (e.g. -D, --save, --global)
    if (token && !token.startsWith('-')) {
      result.packages.push(parsePackageSpecifier(token));
    }
    
    if (stopProcessing) {
      break;
    }
  }

  return result;
}

/**
 * Parses a package specifier into name and version.
 * Supports:
 * react
 * react@19
 * @scope/package
 * @scope/package@1.2.3
 */
function parsePackageSpecifier(spec: string): ParsedPackage {
  if (spec.startsWith('@')) {
    // Scoped package
    const parts = spec.slice(1).split('@');
    if (parts.length > 1) {
      return { 
        name: '@' + parts[0]!, 
        version: parts.slice(1).join('@') 
      };
    }
    return { name: spec };
  }
  
  // Unscoped package
  const parts = spec.split('@');
  if (parts.length > 1) {
    return { 
      name: parts[0]!, 
      version: parts.slice(1).join('@') 
    };
  }
  return { name: spec };
}

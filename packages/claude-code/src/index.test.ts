import { describe, it, expect, vi } from 'vitest';
import { runHook } from './index';
import { SlopcheckGuard } from '@slopcheck/agent';

describe('runHook', () => {
  it('allows empty input', async () => {
    const guard = { inspect: vi.fn() } as unknown as SlopcheckGuard;
    const res = await runHook('', guard);
    expect(res.exitCode).toBe(0);
  });

  it('allows non-json input', async () => {
    const guard = { inspect: vi.fn() } as unknown as SlopcheckGuard;
    const res = await runHook('not json', guard);
    expect(res.exitCode).toBe(0);
  });

  it('allows commands without install', async () => {
    const guard = { inspect: vi.fn() } as unknown as SlopcheckGuard;
    const input = JSON.stringify({ args: { command: 'git clone ...' } });
    const res = await runHook(input, guard);
    expect(res.exitCode).toBe(0);
    expect(guard.inspect).not.toHaveBeenCalled();
  });

  it('allows safe packages', async () => {
    const guard = { 
      inspect: vi.fn().mockResolvedValue({ decision: 'ALLOW' })
    } as unknown as SlopcheckGuard;
    const input = JSON.stringify({ args: { command: 'npm install safe-pkg' } });
    const res = await runHook(input, guard);
    
    expect(res.exitCode).toBe(0);
    expect(guard.inspect).toHaveBeenCalledWith({ package: 'safe-pkg', packageManager: 'npm' });
  });

  it('blocks dangerous packages', async () => {
    const guard = { 
      inspect: vi.fn().mockResolvedValue({ 
        decision: 'BLOCK',
        assessment: { package: 'evil-pkg', level: 'CRITICAL', score: 100 },
        reasons: [{ message: 'Hallucination' }]
      })
    } as unknown as SlopcheckGuard;
    const input = JSON.stringify({ args: { command: 'npm install evil-pkg' } });
    const res = await runHook(input, guard);
    
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('BLOCKED');
    expect(res.stderr).toContain('evil-pkg');
    expect(res.stderr).toContain('Hallucination');
  });

  it('blocks if multiple packages and one is dangerous', async () => {
    const guard = { 
      inspect: vi.fn()
        .mockResolvedValueOnce({ decision: 'ALLOW' })
        .mockResolvedValueOnce({ 
          decision: 'BLOCK',
          assessment: { package: 'evil-pkg', level: 'CRITICAL', score: 100 },
          reasons: [{ message: 'Hallucination' }]
        })
    } as unknown as SlopcheckGuard;
    const input = JSON.stringify({ args: { command: 'npm install safe-pkg evil-pkg' } });
    const res = await runHook(input, guard);
    
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('BLOCKED');
  });

  it('warns on suspicious packages (returns exit 0 with stdout)', async () => {
    const guard = { 
      inspect: vi.fn().mockResolvedValue({ 
        decision: 'WARN',
        assessment: { package: 'suspicious-pkg', level: 'SUSPICIOUS', score: 50 },
        reasons: [{ message: 'Age' }]
      })
    } as unknown as SlopcheckGuard;
    const input = JSON.stringify({ args: { command: 'npm install suspicious-pkg' } });
    const res = await runHook(input, guard);
    
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('WARNING');
    expect(res.stdout).toContain('suspicious-pkg');
  });
});

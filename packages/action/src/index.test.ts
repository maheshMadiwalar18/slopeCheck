import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

// We need to mock the entire module to test the run() side effects safely
vi.mock('@actions/core');
vi.mock('@actions/exec');

describe('Action implementation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock default inputs
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'path') return 'package.json';
      if (name === 'fail-on') return 'high';
      if (name === 'version') return '0.1.0';
      return '';
    });
    
    // Mock the summary writer
    const summaryMock = {
      addHeading: vi.fn().mockReturnThis(),
      addRaw: vi.fn().mockReturnThis(),
      addTable: vi.fn().mockReturnThis(),
      addBreak: vi.fn().mockReturnThis(),
      write: vi.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).summary = summaryMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fails if version format is invalid', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'version') return 'latest; rm -rf /';
      return '';
    });

    const { run } = await import('./index');
    await run();

    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid version format'));
    expect(exec.exec).not.toHaveBeenCalled();
  });

  it('fails if exitCode is 2 (infrastructure failure)', async () => {
    vi.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 2,
      stdout: '',
      stderr: 'npm ERR! NOT_FOUND'
    });

    const { run } = await import('./index');
    await run();

    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('operational error (Exit code 2)'));
  });

  it('fails if invalid JSON is returned', async () => {
    vi.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: 'Not JSON',
      stderr: ''
    });

    const { run } = await import('./index');
    await run();

    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Failed to parse JSON'));
  });

  it('succeeds on SAFE output', async () => {
    vi.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({
        results: [
          { package: 'react', level: 'SAFE' }
        ],
        skipped: []
      }),
      stderr: ''
    });

    const { run } = await import('./index');
    await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('status', 'SAFE');
    expect(core.setOutput).toHaveBeenCalledWith('packages-scanned', 1);
  });

  it('fails on HIGH output with default threshold', async () => {
    vi.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 1,
      stdout: JSON.stringify({
        results: [
          { package: 'react', level: 'HIGH' }
        ],
        skipped: []
      }),
      stderr: ''
    });

    const { run } = await import('./index');
    await run();

    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Security threshold exceeded'));
    expect(core.setOutput).toHaveBeenCalledWith('status', 'HIGH');
    expect(core.setOutput).toHaveBeenCalledWith('high-risk-count', 1);
  });

  it('succeeds on HIGH output if fail-on is critical', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'path') return 'package.json';
      if (name === 'fail-on') return 'critical';
      if (name === 'version') return '0.1.0';
      return '';
    });

    vi.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 1, // CLI fails
      stdout: JSON.stringify({
        results: [
          { package: 'react', level: 'HIGH' }
        ],
        skipped: []
      }),
      stderr: ''
    });

    const { run } = await import('./index');
    await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('CLI detected high/critical risks, but fail-on threshold (critical) was not met.'));
  });
});

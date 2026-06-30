import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeDisable } from './safe-disable.js';

describe('safeDisable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the function and emits no log on success', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    let ran = false;

    safeDisable('happy', () => {
      ran = true;
    });

    expect(ran).toBe(true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('swallows a throw, logs it with the label, and never re-throws', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(() =>
      safeDisable('boom', () => {
        throw new Error('teardown exploded');
      })
    ).not.toThrow();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = logSpy.mock.calls[0]?.[0];
    expect(message).toContain('disable(boom)');
    expect(message).toContain('teardown exploded');
  });
});

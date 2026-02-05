import GLib from 'gi://GLib';
import type { DateProvider } from '../../operations/licensing/index.js';

/**
 * GLib-based DateProvider implementation.
 */
export class GLibDateProvider implements DateProvider {
  now(): Date {
    return new Date();
  }

  today(): string {
    const now = GLib.DateTime.new_now_local();
    return now.format('%Y-%m-%d') ?? '';
  }
}

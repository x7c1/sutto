import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { NotificationService } from '../../operations/notification/index.js';

const NOTIFICATION_PREFIX = 'Sutto';

/**
 * GNOME Shell implementation of NotificationService.
 * Notifications are attributed to Sutto so the user can tell where they come from.
 */
export class GnomeNotificationService implements NotificationService {
  notifyError(title: string, details?: string): void {
    Main.notifyError(`${NOTIFICATION_PREFIX}: ${title}`, details ?? '');
  }

  notifyWarning(title: string, details?: string): void {
    Main.notify(`${NOTIFICATION_PREFIX}: ${title}`, details ?? '');
  }
}

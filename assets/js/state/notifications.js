import { signal } from '@preact/signals';

const defaultDuration = 5000;
const errorDuration = 7000;
const notificationTypes = new Set(['info', 'success', 'warning', 'error']);

let nextNotificationId = 1;

export const notifications = signal([]);

function getNotificationType(type) {
  return notificationTypes.has(type) ? type : 'info';
}

function getDuration(duration, type) {
  if (duration === null) {
    return null;
  }

  if (Number.isFinite(duration) && duration >= 0) {
    return duration;
  }

  return type === 'error' ? errorDuration : defaultDuration;
}

function normalizeAction(action) {
  if (!action || typeof action !== 'object') {
    return null;
  }

  const label = typeof action.label === 'string' ? action.label.trim() : '';

  if (!label) {
    return null;
  }

  return {
    label,
    href: typeof action.href === 'string' && action.href.trim() ? action.href.trim() : null,
    onSelect: typeof action.onSelect === 'function' ? action.onSelect : null,
    dismissOnSelect: action.dismissOnSelect !== false,
  };
}

function normalizeActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.map(normalizeAction).filter(Boolean).slice(0, 2);
}

export function enqueueNotification(input = {}) {
  const message = typeof input.message === 'string' ? input.message.trim() : '';

  if (!message) {
    return null;
  }

  const type = getNotificationType(input.type);
  const duration = getDuration(input.duration, type);
  const createdAt = Date.now();
  const notification = {
    id: input.id || `notification-${createdAt}-${nextNotificationId}`,
    type,
    message,
    actions: normalizeActions(input.actions),
    createdAt,
    expiresAt: duration === null ? null : createdAt + duration,
    politeness: input.politeness === 'assertive' ? 'assertive' : 'polite',
  };

  nextNotificationId += 1;
  notifications.value = [...notifications.value, notification];

  return notification;
}

export function dismissNotification(id) {
  notifications.value = notifications.value.filter((notification) => notification.id !== id);
}

export function clearNotifications() {
  notifications.value = [];
}

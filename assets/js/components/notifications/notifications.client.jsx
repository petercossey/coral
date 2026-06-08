import { useEffect } from 'preact/hooks';
import { dismissNotification, notifications } from '../../state/notifications.js';

function getRole(notification) {
  return notification.politeness === 'assertive' ? 'alert' : 'status';
}

function handleAction(action, notification, event) {
  if (action.onSelect) {
    event.preventDefault();
    action.onSelect(notification);
  }

  if (action.dismissOnSelect) {
    dismissNotification(notification.id);
  }
}

function NotificationAction({ action, notification }) {
  const className =
    'font-semibold text-white underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950';

  return (
    <a href={action.href || '#'} class={className} onClick={(event) => handleAction(action, notification, event)}>
      {action.label}
    </a>
  );
}

function NotificationLine({ notification }) {
  return (
    <li class="leading-6" role={getRole(notification)} aria-live={notification.politeness}>
      <span>{notification.message}</span>
      {notification.actions.map((action) => (
        <span key={action.label}>
          {' '}
          <NotificationAction action={action} notification={notification} />
        </span>
      ))}
    </li>
  );
}

export function Notifications() {
  const items = notifications.value;

  useEffect(() => {
    const timers = items
      .filter((notification) => notification.expiresAt !== null)
      .map((notification) => {
        const delay = Math.max(notification.expiresAt - Date.now(), 0);

        return window.setTimeout(() => {
          dismissNotification(notification.id);
        }, delay);
      });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6"
      aria-relevant="additions text"
    >
      <ol class="pointer-events-auto w-full max-w-3xl rounded bg-slate-950 px-5 py-3 text-sm text-white">
        {items.map((notification) => (
          <NotificationLine notification={notification} key={notification.id} />
        ))}
      </ol>
    </div>
  );
}

export default {
  component: Notifications,
};

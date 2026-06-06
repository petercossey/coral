const eventPrefix = 'coral:';

function getEventName(name) {
  if (name.startsWith(eventPrefix)) {
    if (import.meta.env.DEV) {
      console.warn(`Coral event topics should omit the "${eventPrefix}" prefix.`, name);
    }

    return name;
  }

  return `${eventPrefix}${name}`;
}

export function emit(topic, detail = undefined) {
  document.dispatchEvent(new CustomEvent(getEventName(topic), { detail }));
}

export function on(topic, handler) {
  const eventName = getEventName(topic);

  document.addEventListener(eventName, handler);

  return () => {
    document.removeEventListener(eventName, handler);
  };
}

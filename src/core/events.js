// Minimal pub/sub for the few genuinely cross-cutting moments (death, scene
// changes). Keeps systems from importing UI modules just to announce something.
const handlers = new Map();

export function on(name, fn) {
  if (!handlers.has(name)) handlers.set(name, []);
  handlers.get(name).push(fn);
  // Handing back the undo makes a short-lived listener possible to take away again.
  return () => {
    const list = handlers.get(name);
    const i = list?.indexOf(fn) ?? -1;
    if (i >= 0) list.splice(i, 1);
  };
}

export function emit(name, ...args) {
  for (const fn of handlers.get(name) || []) fn(...args);
}

// Minimal DOM/canvas stand-in so the game modules can be imported under Node.
const noop = () => {};

const drawContext = new Proxy({
  createRadialGradient: () => ({ addColorStop: noop }),
  createLinearGradient: () => ({ addColorStop: noop }),
  getImageData: () => ({ data: [80, 100, 70, 255] }),
  canvas: { width: 1200, height: 650 },
}, {
  get: (o, k) => (k in o ? o[k] : noop),
  set: (o, k, v) => (o[k] = v, true),
});

function makeStyle() {
  const store = {};
  return new Proxy(store, {
    get: (o, k) => (k === 'setProperty' ? (name, value) => { o[name] = value; }
                 : k === 'removeProperty' ? name => { delete o[name]; }
                 : o[k]),
    set: (o, k, v) => (o[k] = v, true),
  });
}

function makeElement() {
  const el = {
    style: makeStyle(),
    dataset: {},
    hidden: false,
    textContent: '',
    className: '',
    disabled: false,
    children: [],
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    getContext: () => drawContext,
    toDataURL: () => 'data:image/png;base64,',
    getBoundingClientRect: () => ({ x: 0, y: 0, top: 0, left: 0, width: 1200, height: 650 }),
    addEventListener: noop,
    removeEventListener: noop,
    setAttribute: noop,
    setPointerCapture: noop,
    replaceChildren() { this.children = []; },
    append(...kids) { this.children.push(...kids); },
    focus: noop,
    scrollIntoView: noop,
    querySelector: () => makeElement(),
    querySelectorAll: () => [],
    firstElementChild: { style: makeStyle() },
    parentElement: null,
    remove() {},
  };
  return el;
}

export function installDom() {
  const elements = new Map();
  const store = new Map();

  const documentElement = makeElement();
  documentElement.dataset = {};
  const classes = new Set();
  documentElement.classList = {
    add: (...c) => c.forEach(x => classes.add(x)),
    remove: (...c) => c.forEach(x => classes.delete(x)),
    toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    contains: c => classes.has(c),
  };

  globalThis.document = {
    hidden: false,
    activeElement: null,
    documentElement,
    fullscreenElement: null,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
    createElement: makeElement,
    addEventListener: noop,
  };
  globalThis.window = globalThis;
  globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
  globalThis.screen = { orientation: { lock: async () => {} } };
  globalThis.history = { pushState: noop };
  globalThis.navigator ??= {};
  if (!globalThis.addEventListener) globalThis.addEventListener = noop;
  if (!globalThis.removeEventListener) globalThis.removeEventListener = noop;
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = noop;
  globalThis.cancelAnimationFrame = noop;

  return { elements, store };
}

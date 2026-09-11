/**
 * Everything that differs between "a page in a browser" and "an installed app".
 * Written defensively: every native capability is feature-detected, so the same
 * build runs in Chrome, in a Capacitor WebView and in a Tauri window.
 */

const cap = () => globalThis.Capacitor;
const tauri = () => globalThis.__TAURI__ || globalThis.__TAURI_INTERNALS__;

export function shell() {
  if (cap()?.isNativePlatform?.()) return 'capacitor';
  if (tauri()) return 'tauri';
  return 'browser';
}

export const platform = () => cap()?.getPlatform?.() ?? (tauri() ? 'desktop' : 'web');

/** True when we are running as an installed app rather than a browser tab. */
export function isApp() {
  if (shell() !== 'browser') return true;
  try {
    return matchMedia('(display-mode: standalone)').matches
        || matchMedia('(display-mode: fullscreen)').matches
        || !!navigator.standalone;
  } catch { return false; }
}

export function isTouch() {
  try { return matchMedia('(pointer: coarse)').matches; } catch { return false; }
}

export const canQuit = () => shell() !== 'browser';

export async function quit() {
  try {
    if (shell() === 'capacitor') {
      const app = cap()?.Plugins?.App;
      await app?.exitApp?.();
      return true;
    }
    if (shell() === 'tauri') {
      const win = globalThis.__TAURI__?.window?.getCurrentWindow?.()
               ?? globalThis.__TAURI__?.window?.appWindow;
      await win?.close?.();
      return true;
    }
  } catch { /* fall through */ }
  return false;
}

export async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    return true;
  } catch { return false; }
}

export async function exitFullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen?.(); } catch { /* ignore */ }
}

export const isFullscreen = () => !!document.fullscreenElement;

/** Landscape is the design orientation — the world view is 960x580. */
export async function lockLandscape() {
  try {
    const orientation = cap()?.Plugins?.ScreenOrientation;
    if (orientation?.lock) { await orientation.lock({ orientation: 'landscape' }); return true; }
    await screen.orientation?.lock?.('landscape');
    return true;
  } catch { return false; }
}

/** Stops the screen dimming mid-fight where the plugin is available. */
export async function keepAwake(on = true) {
  try {
    const plugin = cap()?.Plugins?.KeepAwake;
    if (plugin) { await (on ? plugin.keepAwake() : plugin.allowSleep()); return true; }
    if (on && navigator.wakeLock?.request) {
      const sentinel = await navigator.wakeLock.request('screen');
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) navigator.wakeLock.request('screen').catch(() => {});
      });
      return !!sentinel;
    }
  } catch { /* a dimming screen is not worth an error */ }
  return false;
}

/** Android's hardware/gesture back button. Returns a disposer. */
export function onBackButton(handler) {
  const app = cap()?.Plugins?.App;
  if (app?.addListener) {
    const sub = app.addListener('backButton', handler);
    return () => sub?.then?.(s => s.remove?.());
  }
  // In a browser, the closest analogue is a popstate we push ourselves.
  const onPop = () => { history.pushState(null, ''); handler({ canGoBack: false }); };
  history.pushState(null, '');
  addEventListener('popstate', onPop);
  return () => removeEventListener('popstate', onPop);
}

/** Applies the shell as classes so CSS can branch without re-querying. */
export function markDocument() {
  const root = document.documentElement;
  root.classList.add(`shell-${shell()}`);
  root.classList.toggle('is-app', isApp());
  root.classList.toggle('is-touch', isTouch());
  root.dataset.platform = platform();
}

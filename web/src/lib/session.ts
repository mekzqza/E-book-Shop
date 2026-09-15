// Screen-to-screen state (buyer draft, created order, tracking prefill), kept for this tab only.
// Android WebView needs settings.domStorageEnabled = true for this.

export type Draft = { bookId: string; buyerName: string; buyerEmail: string };

export function save(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function load<T>(key: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

export function drop(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

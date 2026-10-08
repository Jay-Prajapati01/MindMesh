/**
 * The landing page opens with a scroll-driven intro cover. Once a visitor has
 * seen it (or arrives from inside the app / with a deep link), we remember that
 * so returning to "/" shows the real landing content immediately instead of
 * forcing another scroll gesture.
 */
const INTRO_SEEN_KEY = "mindmesh-intro-seen";

export function markIntroSeen(): void {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // sessionStorage can be unavailable (private mode) — intro just plays again.
  }
}

export function introSeen(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

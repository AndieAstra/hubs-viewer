export class FullscreenHelper {
  private _listeners = new Set<(active: boolean) => void>();

  isFullscreen(): boolean { return this.isActive(); }

  constructor(private host: HTMLElement, private pseudoClass = 'pseudo-fullscreen') {
    this._onNativeChange = this._onNativeChange.bind(this);
    document.addEventListener('fullscreenchange', this._onNativeChange);
  }

  async enter(): Promise<void> {
    if (!this.host) return;
    try {
      await (
        this.host.requestFullscreen?.({ navigationUI: 'hide' }) ??
        (this.host as any).webkitRequestFullscreen?.() ??
        Promise.reject()
      );
      await (screen.orientation as any)?.lock?.('landscape').catch(() => {});
    } catch {
      this.host.classList.add(this.pseudoClass);
      this._emit(true);
    }
  }

  async exit(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await (
          document.exitFullscreen?.() ??
          (document as any).webkitExitFullscreen?.() ??
          Promise.reject()
        );
        (screen.orientation as any)?.unlock?.();
      }
    } finally {
      this.host.classList.remove(this.pseudoClass);
      this._emit(false);
    }
  }

  toggle(): Promise<void> {
    return this.isActive() ? this.exit() : this.enter();
  }

  isActive(): boolean {
    return (
      document.fullscreenElement === this.host ||
      this.host.classList.contains(this.pseudoClass)
    );
  }

  onChange(cb: (active: boolean) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  dispose(): void {
    document.removeEventListener('fullscreenchange', this._onNativeChange);
    this._listeners.clear();
    this.host.classList.remove(this.pseudoClass);
  }

  /* ---- private helpers --------------------------- */

  private _onNativeChange() {
    this._emit(this.isActive());
  }

  private _emit(active: boolean) {
    this._listeners.forEach(fn => fn(active));
  }
}

export async function toggleFullscreen(el: HTMLElement): Promise<void> {
  if (!el) return;

  const isFull = document.fullscreenElement === el;

  if (!isFull) {
    const req =
      el.requestFullscreen ||
      (el as any).webkitRequestFullscreen ||
      (el as any).msRequestFullscreen;
    if (req) await req.call(el);
    try {
      await (screen.orientation as any)?.lock?.('landscape');
    } catch {}
  } else {
    const exit =
      document.exitFullscreen ||
      (document as any).webkitExitFullscreen ||
      (document as any).msExitFullscreen;
    if (exit) await exit.call(document);
    try {
      (screen.orientation as any)?.unlock?.();
    } catch {}
  }
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
}

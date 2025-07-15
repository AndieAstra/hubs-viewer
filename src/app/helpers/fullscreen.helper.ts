export class FullscreenHelper {
  /**
   * @param host         The element to be shown in fullscreen.
   * @param pseudoClass  CSS class toggled when using fallback mode.
   */
  constructor(
    private host: HTMLElement,
    private pseudoClass: string = 'pseudo-fullscreen'
  ) {
    this._onNativeChange = this._onNativeChange.bind(this);
    document.addEventListener('fullscreenchange', this._onNativeChange);
  }

  /** Attempt to enter real fullscreen; fall back to a CSS class. */
  async enter(): Promise<void> {
    if (!this.host) return;

    try {
      await (
        this.host.requestFullscreen?.({ navigationUI: 'hide' }) ||
        // Safari ≤15 (macOS) uses webkit prefix
        (this.host as any).webkitRequestFullscreen?.() ||
        Promise.reject()
      );
    } catch {
      // Native API not available (iOS Safari). Use CSS pseudo‑fullscreen.
      this.host.classList.add(this.pseudoClass);
      this._emit();
    }
  }

  /** Exit either native or pseudo fullscreen. */
  async exit(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await (
          document.exitFullscreen?.() ||
          (document as any).webkitExitFullscreen?.() ||
          Promise.reject()
        );
      }
    } finally {
      this.host.classList.remove(this.pseudoClass);
      this._emit();
    }
  }

  /** Toggle fullscreen state. */
  toggle(): Promise<void> {
    return this.isActive() ? this.exit() : this.enter();
  }

  /** True if host is in native or pseudo fullscreen. */
  isActive(): boolean {
    return (
      document.fullscreenElement === this.host ||
      this.host.classList.contains(this.pseudoClass)
    );
  }

  /** Subscribe to changes. Returns an unsubscribe function. */
  onChange(cb: (active: boolean) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  /** Remove listeners – call in ngOnDestroy. */
  dispose(): void {
    document.removeEventListener('fullscreenchange', this._onNativeChange);
    this._listeners.clear();
    this.host.classList.remove(this.pseudoClass);
  }

  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  // ------------------------------------------------------------------
  private _listeners = new Set<(active: boolean) => void>();

  private _onNativeChange() {
    this._emit();
  }

  private _emit() {
    const active = this.isActive();
    this._listeners.forEach(fn => fn(active));
  }
}

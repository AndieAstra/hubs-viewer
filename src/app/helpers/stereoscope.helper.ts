import * as THREE from 'three';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect';

type StereoChangeCallback = (active: boolean) => void;

export class StereoscopeHelper {
  private _listeners = new Set<StereoChangeCallback>();
  private _active = false;
  private stereoEffect: StereoEffect;
  private _enabled = false;

  get enabled(): boolean {
    return this._enabled;
  }

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.Camera) {
    this.stereoEffect = new StereoEffect(this.renderer);
    this.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
      this.resize(window.innerWidth, window.innerHeight);
    });
  }

  isActive(): boolean {
    return this._active;
  }

  enable(): void {
    if (this._active) return;
    this._active = true;
    this._emit(true);
  }

  disable(): void {
    if (!this._active) return;
    this._active = false;
    this._emit(false);
  }

  toggle(): void {
    this.isActive() ? this.disable() : this.enable();
  }

  render(): void {
    if (this._active) {
      this.stereoEffect.render(this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onChange(cb: StereoChangeCallback): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  dispose(): void {
    this._listeners.clear();
    this.disable();
  }

  resize(width: number, height: number): void {
    this.stereoEffect.setSize(width, height);
  }

  private _emit(active: boolean) {
    this._listeners.forEach((fn) => fn(active));
  }
}

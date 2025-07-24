import * as THREE from 'three';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect';

type StereoChangeCallback = (active: boolean) => void;

export class StereoscopeHelper {
  private _listeners = new Set<StereoChangeCallback>();
  private _active = false;  // To track if stereo is active or not
  private stereoEffect: StereoEffect;
  private _enabled = false;

  get enabled(): boolean {
    return this._enabled;
  }

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera
  ) {
 this.stereoEffect = new StereoEffect(this.renderer);
    this.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
      this.resize(window.innerWidth, window.innerHeight);
    });
  }

    public getStereoEffect(): StereoEffect {
    return this.stereoEffect;
  }

  isActive(): boolean {
    return this._active;
  }

  // enable(): void {
  //   if (this._active) return;
  //   this._active = true;
  //   this._emit(true);
  // }

  enable(): void {
  if (this._active) return;
  this._active = true;
  this._emit(true);

  // Ensure the camera's aspect ratio is properly set for stereo
  const perspectiveCamera = this.camera as THREE.PerspectiveCamera;
  perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
  perspectiveCamera.updateProjectionMatrix();

  // Optionally log stereo status
  console.log("Stereo enabled");
}

disable(): void {
  if (!this._active) return;
  this._active = false;
  this._emit(false);

  // Optionally log stereo status
  console.log("Stereo disabled");
}

  toggle(): void {
    this.isActive() ? this.disable() : this.enable();
  }

  render(): void {
    if (this._active) {
      // Render using stereo effect
      this.stereoEffect.render(this.scene, this.camera);
    } else {
      // Render in mono mode
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
  this.renderer.setSize(width, height);
  const perspectiveCamera = this.camera as THREE.PerspectiveCamera;
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  this.stereoEffect.setSize(width, height);
}


  private _emit(active: boolean): void {
    this._listeners.forEach((fn) => fn(active));
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height);
  }
}

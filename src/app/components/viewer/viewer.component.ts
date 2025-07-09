import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  HostListener
} from '@angular/core';

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';

import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { VrControllerHelper } from '../helpers/vr-controller.helper';
import { PlayerMovementHelper } from '../helpers/player-movement.helper';
import { StorageService } from '../../services/storage.service';
import { SceneControlsService } from '../../services/scene-controls.service';
import { SceneManager } from './scene-manager';

// export interface SavedModel {
//   models: Array<{
//     name: string;
//     position: { x: number; y: number; z: number };
//     rotation: { x: number; y: number; z: number };
//     scale: { x: number; y: number; z: number };
//     fileName: string;
//     glbBase64?: string; // Optional: Base64 encoded GLB model data
//     gltfBase64?: string; // Optional: Base64 encoded GLTF model data
//     jsonBase64?: string; // Optional: Base64 encoded JSON model data
//   }>;

//   camera: {
//     position: { x: number; y: number; z: number };
//     rotation: { x: number; y: number; z: number };
//   };

//   lighting: {
//     ambient: {
//       color: number;
//       intensity: number;
//     };
//     directional: {
//       color: number;
//       intensity: number;
//       position: [number, number, number]; // Position of the directional light in 3D space
//     };
//   };
// }

export interface SavedModel {
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  fileName: string;
  glbBase64: string;
}

export interface SceneData {
  models: SavedModel[];
  camera: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  };
  lighting: {
    ambient: {
      color: number;
      intensity: number;
    };
    directional: {
      color: number;
      intensity: number;
      position: [number, number, number];
    };
  };
}

@Component({
  selector: 'app-viewer',
  standalone: true,
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})

export class ViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('viewerCanvas', { static: false }) viewerCanvasRef!: ElementRef;

  model: THREE.Object3D = new THREE.Object3D(); // Assume this is the model loaded
  //camera: THREE.Camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  controls: any; // Assuming some controls for camera movement

  private sceneLight!: THREE.DirectionalLight;
  private sceneManager!: SceneManager;

  private playerMovementHelper = new PlayerMovementHelper(10, 9.8, 10, 1.6);
  private prevTime = 0;
//
  private boundOnKeyDown!: (event: KeyboardEvent) => void;
  private boundOnKeyUp!: (event: KeyboardEvent) => void;
//

  scene!: THREE.Scene;
  renderer!: THREE.WebGLRenderer;
  uploadedModel: THREE.Object3D | null = null;
  objects: THREE.Object3D[] = [];
  playerObj: THREE.Object3D = new THREE.Object3D();

  isLoading = false;
  sunlight = 1;
  movementSpeed = 50;
  modelSize = 30;
  modelScale = 1;
  modelHeight = 0;
  ambientIntensity = 0.5;
  speed = 50;
  cameraHeight = 2;

  private clock = new THREE.Clock();
  public sceneLoaded = false;
  showEscHint = false;
  private container!: HTMLElement;
  private escHint!: HTMLDivElement;
  private escHintSprite!: THREE.Sprite;

  vrActive = false;
  private animationId: number | null = null;
  private vrHelper = new VrControllerHelper(3.0);
  public controllerSpeed = 3.0;

  private movementHelper!: PlayerMovementHelper;
  transformControls!: TransformControls;
  selectedTool = '';

  private keysPressed = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private canJump = false;
  private gravity = 9.8;
  private jumpStrength = 5;

  public ambientLight = new THREE.AmbientLight(0xffffff, 1);

  public isVRMode = false;
  public isPlacingModel = false; // Define this property to avoid errors.

  get isInFullscreen(): boolean {
      return document.fullscreenElement === this.containerRef?.nativeElement;
    }

  private isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  @Input() glbFile?: File;

  @HostListener('window:resize')
  onWindowResize(): void {
    this.sceneManager?.resize();
  }

  private originalSize?: { width: number; height: number };    // For restoring size after VR
  private originalCameraAspect?: number;                       // Used to reset camera aspect
  private originalSetAnimationLoop: any;                       // Backup of setAnimationLoop

  stereoEffect: any;

  constructor(
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private storageService: StorageService,
    private sceneControlsService: SceneControlsService,
  ) {}

  ngOnInit() {
    // Initialize player movement helper with consistent parameters
    this.playerMovementHelper = new PlayerMovementHelper(
      10,    // moveSpeed
      9.8,   // gravity
      10,    // jumpStrength
      1.6    // cameraHeight
    );

    // Bind event handlers to maintain correct 'this'
    this.boundOnKeyDown = (event: KeyboardEvent) => {
      this.playerMovementHelper.onKeyDown(event.code);
    };

    this.boundOnKeyUp = (event: KeyboardEvent) => {
      this.playerMovementHelper.onKeyUp(event.code);
    };

    // Add keyboard event listeners
    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);

    // Initialize VR helper and canJump flag
    this.vrHelper.enabled = true;
    this.canJump = true;

    // Start animation loop with correct binding
    requestAnimationFrame(this.animate.bind(this));

    // Fullscreen change listener to toggle escHint display
    document.addEventListener('fullscreenchange', () => {
      if (!this.escHint || !this.container) return;
      this.escHint.style.display = document.fullscreenElement === this.container ? 'block' : 'none';
    });
  }

  ngOnDestroy() {

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    window.removeEventListener('resize', this.resizeListener);

    if (this.vrHelper) {
      this.vrHelper.stop();
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        if ((obj as THREE.Mesh).material) {
          const material = (obj as THREE.Mesh).material;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material.dispose();
          }
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['glbFile']) {
      const glbFileChange = changes['glbFile'];

      if (glbFileChange.currentValue) {
        if (glbFileChange.isFirstChange()) return;

        if (this.sceneLoaded) {
          const confirmReplace = confirm(
            'A scene is already loaded. Do you want to replace it with a new model?'
          );
          if (!confirmReplace) return;
        }

        const file = glbFileChange.currentValue as File;

        const loader = new GLTFLoader();
        loader.load(
          URL.createObjectURL(file),
          (gltf) => {
            const model = gltf.scene;
            this.uploadedModel = model;
            this.sceneLoaded = true;
            this.objects.push(model);
            this.applyModelTransform();
            this.logToConsole('MODEL_LOADED', { name: model.name });
          },
          undefined, // Optional: You can handle loading progress here
          (error) => {
            this.logToConsole('ERRORS.FAILED_LOAD_MODEL', { fileName: file.name });
          }
        );
      } else if (!this.sceneLoaded && !glbFileChange.isFirstChange()) {
        alert('⚠️ No model file loaded or scene is empty. Please load a valid GLB model.');
      }
    }
  }

  ngAfterViewInit() {
    this.scene = new THREE.Scene();

    // Initialize Three.js renderer targeting the canvas element
    this.renderer = new THREE.WebGLRenderer({ canvas: this.viewerCanvasRef.nativeElement });

    const container = this.containerRef?.nativeElement;
    if (!container) {
      console.error('Container reference is missing.');
      return;
    }

    if (!this.renderer || !this.renderer.domElement) {
      console.warn(this.translate.instant('ERRORS.RENDERER_NOT_AVAILABLE'));
      return;
    }

    this.sceneManager = new SceneManager(container);

    // Append renderer canvas if not already appended
    const canvas = this.renderer.domElement;
    if (!canvas.parentElement || canvas.parentElement !== container) {
      container.appendChild(canvas);
    }

    // Style container and canvas for correct layout and interaction
    Object.assign(container.style, { position: 'relative' });
    Object.assign(canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      touchAction: 'none',
      zIndex: '0',
    });

    this.canvasRef = new ElementRef(canvas);
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    // Create and add ESC hint sprite and div
    this.escHintSprite = this.createEscHintSprite();
    this.escHintSprite.visible = false;
    this.scene.add(this.escHintSprite);

    this.escHint = document.createElement('div');
    this.escHint.classList.add('esc-hint');
    this.escHint.innerHTML = '🔙 Press <strong>ESC</strong> to exit fullscreen';
    this.escHint.style.display = 'none';
    container.appendChild(this.escHint);

    // Fullscreen change event: update ESC hint visibility
    document.addEventListener('fullscreenchange', () => {
      const fsEl = document.fullscreenElement;
      const isFullscreen = fsEl === this.renderer.domElement || fsEl === container;

      this.showEscHint = isFullscreen;
      if (this.escHint) this.escHint.style.display = isFullscreen ? 'block' : 'none';
      if (this.escHintSprite) this.escHintSprite.visible = isFullscreen;
    });

    // Listen for window resize to adjust renderer size
    this.resizeListener = () => this.onResize();
    window.addEventListener('resize', this.resizeListener);

    // Initialize previous time for animation loop
    this.prevTime = performance.now();

    // Start animation loop with binding for correct 'this'
    requestAnimationFrame(this.animate.bind(this));

    // Drag and drop support for loading GLB models
    canvas.addEventListener('dragover', (event) => event.preventDefault());

    canvas.addEventListener('drop', (event) => {
      event.preventDefault();

      const file = event.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.glb')) {
        if (this.sceneLoaded && !confirm(this.translate.instant('ERRORS.DROP_REPLACE_CONFIRM'))) {
          return;
        }

        const loader = new GLTFLoader();
        loader.load(
          URL.createObjectURL(file),
          (gltf) => {
            const model = gltf.scene;
            this.uploadedModel = model;
            this.sceneLoaded = true;
            this.objects.push(model);
            this.applyModelTransform();
            this.logToConsole('MODEL_LOADED', { name: model.name });
          },
          undefined,
          (error) => {
            this.logToConsole('ERRORS.FAILED_LOAD_MODEL', { fileName: file.name });
          }
        );
      }
    });
  }

// ****************************** Resize the window ******************************

  private resizeListener = () => {
    this.onResize();
  };

  onResize(width?: number, height?: number): void {
    this.sceneManager.resize();
  }

  toggleFullscreen() {
    const canvas = this.renderer?.domElement;

    if (!canvas) return;

    if (!document.fullscreenElement) {
      canvas.requestFullscreen()
        .catch(err => console.error("Failed to enter fullscreen:", err));
    } else {
      document.exitFullscreen()
        .catch(err => console.error("Failed to exit fullscreen:", err));
    }
  }

// ****************************** THREE Movement ******************************

  animate = (time: number) => {
    if (!this.controls || !this.scene) return;

    // Calculate delta time in seconds
    const delta = (time - this.prevTime) / 1000 || 0;
    this.prevTime = time;

    if (this.isLoading) {
      requestAnimationFrame(this.animate);
      return; // skip updating while loading
    }

    // Update VR joystick, etc.
    this.vrHelper.update();

    // Apply friction and keyboard movement (gravity/jump)
    this.playerMovementHelper.applyFriction(delta, 5.0);
    this.playerMovementHelper.updateKeyboardMovement(
      delta,
      this.speed,
      this.controls.getObject(),
      this.scene
    );

    // Move escHintSprite with camera if visible
    if (this.escHintSprite) {
      const isInFullscreen = document.fullscreenElement === this.renderer.domElement;
      this.escHintSprite.visible = isInFullscreen;

      if (isInFullscreen) {
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        const cameraPosition = this.camera.position.clone();
        this.escHintSprite.position.copy(cameraPosition).add(cameraDirection.multiplyScalar(2));
        this.escHintSprite.position.y -= 1.2;
        this.escHintSprite.quaternion.copy(this.camera.quaternion);
      }
    }

    // Your collision detection logic here
    const isColliding = (pos: THREE.Vector3) => {
      // TODO: raycast or collision check against collidable objects
      return false;
    };

    // Apply combined movement (keyboard + VR)
    this.playerMovementHelper.applyCombinedMovement(
      delta,
      this.controls.getObject(),
      this.controls,
      this.playerMovementHelper.keysPressed,
      this.vrHelper.movementVector,
      this.controls.getObject().quaternion,
      isColliding
    );

    this.playerMovementHelper.enforceGround(this.controls.getObject());

    this.renderer.render(this.scene, this.camera);

    // For debugging
    console.log('Facing quaternion:', this.controls.getObject().quaternion);
    console.log('Joystick Movement:', this.vrHelper.movementVector);

    // Schedule next frame
    requestAnimationFrame(this.animate);
  };

  private createEscHintSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔙 Press ESC to exit fullscreen', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    sprite.visible = false;

    sprite.scale.set(6, 0.8, 1);
    sprite.position.set(0, -0.8, -2.5);

    return sprite;
  }

  onKeyDown = (event: KeyboardEvent) => {
    this.playerMovementHelper.onKeyDown(event.code);
  };

  onKeyUp = (event: KeyboardEvent) => {
    this.playerMovementHelper.onKeyUp(event.code);
  };

// ****************************** Model Settings ******************************

  applyModelTransform() {
    if (this.uploadedModel) {
      this.uploadedModel.scale.set(this.modelScale, this.modelScale, this.modelScale);
      this.uploadedModel.position.set(
        this.modelSize * 0.5,
        this.modelHeight,
        0
      );
    }
  }

  logToConsole(message: string, details: any) {
    console.log(message, details);
  }

  enterModelPlacementMode(): void {
    this.isPlacingModel = true;
    this.snackBar.open(this.translate.instant('MESSAGES.MODEL_PLACEMENT_MODE_ACTIVE'), 'OK', { duration: 3000 });
  }

// ****************************** THREE helper tools ******************************

// Method called on slider change for model size
 public onModelSizeChange(event: any): void {
    const size = event.target.value;
    this.sceneControlsService.updateModelSize(this.model, size);
  }

  // Method called on slider change for model height
public onModelHeightChange(event: any): void {
    const height = event.target.value;
    this.sceneControlsService.updateModelHeight(this.model, height);
  }

  // Method called on slider change for camera speed
public onCameraSpeedChange(event: any): void {
    const speed = event.target.value;
    this.sceneControlsService.updateCameraSpeed(this.controls, speed);
  }

  // Method called on slider change for sunlight intensity
 public onSunlightIntensityChange(event: any): void {
    const intensity = event.target.value;
    this.sceneControlsService.updateSunlightIntensity(this.sceneLight, intensity); // Assuming you have a scene light
  }

  // Method called on slider change for eye level
 public onEyeLevelChange(event: any): void {
    const eyeLevel = event.target.value;
    this.sceneControlsService.updateEyeLevel(this.camera, eyeLevel);
  }

// ********** VR Tools *************

public enterVR(): void {
  if (!/Mobi|Android/i.test(navigator.userAgent)) {
     this.snackBar.open(this.translate.instant('MESSAGES.VR_MOBILE_ONLY'), 'OK', { duration: 3000 });
    return;
  }

  if (!confirm(this.translate.instant('MESSAGES.ENTER_VR_CONFIRM'))) {
    return;
  }

  this.isVRMode = true;
  document.body.classList.add('vr-mode');

  const canvas = this.renderer.domElement;
  const container = this.containerRef.nativeElement;

  const requestFullscreen = container.requestFullscreen
    || (container as any).webkitRequestFullscreen
    || (container as any).msRequestFullscreen;

  if (requestFullscreen) {
    requestFullscreen.call(container).catch((err: any) => {
      console.warn(this.translate.instant('ERRORS.FULLSCREEN_FAILED'), err);
    });
  }

  try {
    (screen.orientation as any)?.lock?.('landscape').catch((err: any) => {
      console.warn(this.translate.instant('ERRORS.ORIENTATION_LOCK_FAILED'), err);
    });
  } catch (err) {
    console.warn(this.translate.instant('ERRORS.ORIENTATION_LOCK_UNAVAILABLE'), err);
  }

  this.originalSize = {
    width: container.clientWidth,
    height: container.clientHeight,
  };
  this.originalCameraAspect = this.camera.aspect;

  if (!this.stereoEffect) {
    this.stereoEffect = new StereoEffect(this.renderer);
  }
  this.stereoEffect.setSize(container.clientWidth, container.clientHeight);

  this.renderer.setAnimationLoop(() => this.renderVR());

  history.pushState({ vr: true }, '');

  window.onpopstate = () => {
    if (this.isVRMode) this.exitVR();
  };
}

public exitVR(): void {
  document.body.classList.remove('vr-mode');
  this.isVRMode = false;

  if (this.renderer?.setAnimationLoop) {
    this.renderer.setAnimationLoop(null);
  }

  try {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err: any) => {
        console.warn(this.translate.instant('ERRORS.EXIT_FULLSCREEN_FAILED'), err);
      });
    }
    (screen.orientation as any)?.unlock?.();
  } catch (e) {
    console.warn(this.translate.instant('ERRORS.UNLOCK_ORIENTATION_FAILED'), e);
  }

  if (this.renderer && this.camera && this.originalSize) {
    this.camera.aspect = this.originalCameraAspect ?? window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.originalSize.width, this.originalSize.height);
  }

  this.controls.enabled = true;
  this.snackBar.open(this.translate.instant('MESSAGES.EXITED_VR_MODE'), 'OK', { duration: 2000 });

  if (history.state?.vr) {
    history.back();
  }

  window.onpopstate = null;
}

private renderVR = () => {
  this.camera.position.y = this.cameraHeight;
  this.stereoEffect.render(this.scene, this.camera);
};

}

import {Component,ElementRef, Input, OnInit,OnChanges, SimpleChanges, AfterViewInit, ViewChild, OnDestroy, HostListener, NgZone,} from '@angular/core';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import GUI from 'lil-gui';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VrControllerHelper } from '../helpers/vr-controller.helper';
import { PlayerMovementHelper } from '../helpers/player-movement.helper';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export interface SavedModel {
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  fileName: string;
  glbBase64: string;
}

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatSnackBarModule, TranslateModule],
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})

export class ViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  [x: string]: any;

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild(ViewerComponent) viewerComponent!: ViewerComponent;

  @HostListener('document:webkitfullscreenchange')
  onWebkitFullscreenChange() {
    this.onResize();
  }

  @Input() glbFile?: File;

  constructor(
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private ngZone: NgZone
  ) {}

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  ambientLight!: THREE.AmbientLight;
  dirLight!: THREE.DirectionalLight;

  uploadedModel: THREE.Object3D | null = null;

  // Track loaded meshes for collision etc
  objects: THREE.Object3D[] = [];

// ===========================================================
// 🎛️ Default Configuration Values
// ===========================================================
sunlight = 1;                // Scene sunlight intensity
movementSpeed = 50;          // Player movement speed
modelSize = 30;              // Default model scale factor
modelScale = 1;              // Actual model scale applied
modelHeight = 0;             // Vertical position offset for model
ambientIntensity = 0.5;      // Ambient light intensity
speed = 50;                  // Movement speed used by sliders
cameraHeight = 2;            // Camera/player height from ground

// ===========================================================
// 📦 Scene and Rendering
// ===========================================================
private clock = new THREE.Clock();
public sceneLoaded = false;                          // Used to track scene initialization
private gui!: GUI; // dat.GUI or lil-gui instance for debugging or runtime adjustments
showEscHint = false;
private container!: HTMLElement;
private escHint!: HTMLDivElement;
private escHintSprite!: THREE.Sprite;

// ===========================================================
// VR Integration
// ===========================================================
vrActive = false;
private animationId: number | null = null;
vrControllerActive = false;
private vrHelper = new VrControllerHelper(3.0); // Move speed
public controllerSpeed = 3.0;

// ===========================================================
// 🕹️ Controls & Tools
// ===========================================================
private movementHelper!: PlayerMovementHelper;
public controls!: PointerLockControls;               // FPS-style movement
transformControls!: TransformControls;                // 3D object transform tools
selectedTool = '';                                    // Currently selected tool (e.g., translate/rotate)

// ===========================================================
// 🧭 Input & Keyboard Navigation
// ===========================================================
private keysPressed = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

// ===========================================================
// 🎮 Player Physics / Motion
// ===========================================================
private velocity = new THREE.Vector3();
private direction = new THREE.Vector3();
private canJump = false;
private gravity = 9.8;         // Gravitational force
private jumpStrength = 5;      // Jump height multiplier

// ===========================================================
// 🧰 VR and Stereo Settings
// ===========================================================
private stereoEffect!: StereoEffect;
public isVRMode = false;
private originalSize?: { width: number; height: number };    // For restoring size after VR
private originalCameraAspect?: number;                       // Used to reset camera aspect
private originalSetAnimationLoop: any;                       // Backup of setAnimationLoop

get isInFullscreen(): boolean {
    return document.fullscreenElement === this.containerRef?.nativeElement;
  }

// ===========================================================
// 📱 Device Context
// ===========================================================
private isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ===========================================================
// 🧱 Helpers
// ===========================================================
gridHelper!: THREE.GridHelper;
showGrid = true;                  // Toggle grid visibility

// ===========================================================
// ⚙️ UI State
// ===========================================================
isPlacingModel = false;           // Whether user is placing a model in the scene

ngOnInit() {
  document.addEventListener('keydown', this.onKeyDown);
  document.addEventListener('keyup', this.onKeyUp);
  document.addEventListener('fullscreenchange', () => {
    this.escHint.style.display = document.fullscreenElement === this.container ? 'block' : 'none';
  });

  //this.loadSceneFromLocalStorage();
  this.canJump = true;
  this.vrHelper.enabled = true;
  this.movementHelper = new PlayerMovementHelper(
    3.0,
    this.gravity,
    this.jumpStrength,
    this.cameraHeight
  );
}

ngOnDestroy() {
  document.removeEventListener('keydown', this.onKeyDown);
  document.removeEventListener('keyup', this.onKeyUp);
  window.removeEventListener('resize', this.resizeListener);

  // Clean up VR helper
  if (this.vrHelper) {
    this.vrHelper.stop();
  }

  // Cancel animation frame if running
  if (this.animationId) {
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  // Clean up Three.js
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

ngOnChanges(changes: SimpleChanges) {
  if (changes['glbFile'] && changes['glbFile'].currentValue) {
    // Skip initial binding load
    if (changes['glbFile'].isFirstChange()) return;

    if (this.sceneLoaded) {
      const confirmReplace = confirm(
        'A scene is already loaded. Do you want to replace it with a new model?'
      );
      if (!confirmReplace) return;
      this.clearScene();
    }

    const file = changes['glbFile'].currentValue as File;

    this['sceneControls'].loadGLB(
      file,
      this.scene,
      1,  // scale or other param
      0,  // another param (rotation, offset, etc.)
      (model: THREE.Object3D) => {
        this.uploadedModel = model;
        this.sceneLoaded = true;
        this.objects.push(model);
        this.applyModelTransform();
        this['logToConsole']('MODEL_LOADED', { name: model.name });
      },
      () => {
        this['logToConsole']('ERRORS.FAILED_LOAD_MODEL', { fileName: file.name });
      }
    );
  } else if (
    !this.glbFile &&
    !this.sceneLoaded &&
    !changes['glbFile']?.isFirstChange()
  ) {
    alert('⚠️ No model file loaded or scene is empty. Please load a valid GLB model.');
  }
}

ngAfterViewInit() {
  this.initScene();
  this.animate();

  this.container = this.containerRef.nativeElement;

  this.resizeListener = () => this.onResize();
  window.addEventListener('resize', this.resizeListener);

  this.escHint = document.createElement('div');
  this.escHint.classList.add('esc-hint');
  this.escHint.innerHTML = '🔙 Press <strong>ESC</strong> to exit fullscreen';
  this.escHint.style.display = 'none';
  this.container.appendChild(this.escHint);

  document.addEventListener('fullscreenchange', () => {
    const fsEl = document.fullscreenElement;
    const isFullscreen = fsEl === this.renderer?.domElement || fsEl === this.container;
    this.showEscHint = isFullscreen;

    if (this.escHint) this.escHint.style.display = isFullscreen ? 'block' : 'none';
    if (this.escHintSprite) this.escHintSprite.visible = isFullscreen;
  });

  if (!this.renderer || !this.renderer.domElement) {
    console.warn(this.translate.instant('ERRORS.RENDERER_NOT_AVAILABLE'));
    return;
  }

  const canvas = this.renderer.domElement;
  const container = this.containerRef.nativeElement;

  if (!canvas.parentElement || canvas.parentElement !== container) {
    container.appendChild(canvas);
  }

  Object.assign(container.style, {
    border: '2px dashed red',
    position: 'relative'
  });

  Object.assign(canvas.style, {
    border: '2px solid lime',
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    touchAction: 'none',
    zIndex: '0'
  });

  this.canvasRef = new ElementRef(canvas);
  this.renderer.setSize(container.clientWidth, container.clientHeight);

  this.escHintSprite = this.createEscHintSprite();
  this.escHintSprite.visible = false;
  this.scene.add(this.escHintSprite);

  canvas.addEventListener('dragover', (event) => event.preventDefault());
  canvas.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.glb')) {
      if (this.sceneLoaded && !confirm(this.translate.instant('ERRORS.DROP_REPLACE_CONFIRM'))) return;
      this.clearScene();
      this['sceneControls'].loadGLB(
        file,
        this.scene,
        1,
        0,
        (model: THREE.Object3D) => {
          this.uploadedModel = model;
          this.sceneLoaded = true;
          this.objects.push(model);
          this.applyModelTransform();
          this['logToConsole']('MODEL_LOADED', { name: model.name });
        },
        () => {
          this['logToConsole']('ERRORS.FAILED_LOAD_MODEL', {
            fileName: file.name
          });
        }
      );
    }
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      const selected = intersects[0].object;
      console.log('Selected object:', selected.name || selected.uuid);
    }
  });

  canvas.addEventListener('click', () => {
    this.controls.lock();
    setTimeout(() => {
      if (this.controls.isLocked) this.controls.unlock();
    }, 10000);
  });

  document.addEventListener('click', (e) => {
    if (!canvas.contains(e.target as Node) && this.controls.isLocked) {
      this.controls.unlock();
    }
  });

  this.gridHelper = new THREE.GridHelper(10, 10);
  this.gridHelper.visible = this.showGrid;
  this.scene.add(this.gridHelper);

  this.stereoEffect = new StereoEffect(this.renderer);
  this.stereoEffect.setSize(window.innerWidth, window.innerHeight);

  window.addEventListener('orientationchange', () => {
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape && !this.isVRMode) {
      this.enterVR();
    } else if (!isLandscape && this.isVRMode) {
      this.exitVR();
    }
  });

  window.addEventListener('popstate', () => {
    if (this.isVRMode) {
      this.exitVR();
    }
  });
}

//********* UI Controls for the ThreeJS Scene *********/

private initScene() {
  const container = this.containerRef.nativeElement;
  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(0x111111);

  this.camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  this.camera.position.set(0, this.cameraHeight, 10);
  this.camera.lookAt(0, this.cameraHeight, 0);

  try {
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

     // ✅ Touch compatibility
    this.renderer.domElement.style.touchAction = 'manipulation';
    this.renderer.domElement.style.pointerEvents = 'auto';
  } catch (e) {
    console.error(this.translate.instant('ERRORS.WEBGL_CREATION_FAILED'), e);
    alert(this.translate.instant('ERRORS.WEBGL_INIT_FAIL_ALERT'));
    return;
  }

// ngAfterViewInit or initScene:
this.container = this.containerRef.nativeElement;
this.container.style.position = 'relative'; // critical

this.escHint = document.createElement('div');
this.escHint.classList.add('esc-hint');
this.escHint.innerHTML = '🔙 Press <strong>ESC</strong> to exit fullscreen';
this.escHint.style.display = 'none';

this.container.appendChild(this.escHint);

  // 💡 Lighting
  this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  this.scene.add(this.ambientLight);

  this.dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  this.dirLight.position.set(5, 10, 7.5);
  this.scene.add(this.dirLight);

  // 🚶 Controls + user instructions
  this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
  this.scene.add(this.controls.getObject());

  const instructions = document.createElement('div');

  instructions.style.position = 'absolute';
  instructions.style.top = '50%';
  instructions.style.left = '50%';
  instructions.style.transform = 'translate(-50%, -50%)';
  instructions.style.color = 'white';
  instructions.style.fontSize = '24px';
  instructions.style.padding = '10px';
  instructions.style.background = 'rgba(0,0,0,0.5)';
  instructions.style.borderRadius = '8px';
  container.appendChild(instructions);

  container.addEventListener('click', () => {
    this.controls.lock();
    container.removeChild(instructions);
  });

  container.addEventListener('touchstart', () => {
    this.controls.lock();
    if (container.contains(instructions)) {
      container.removeChild(instructions);
    }
  }, { passive: true });

  // 🧰 GUI (hidden, optional for dev tools)
  this.gui = new GUI({ width: 280 });
  this.gui.domElement.style.display = 'none';

  // 🧱 Floor
  const floorGeo = new THREE.PlaneGeometry(200, 200);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData['collidable'] = true;
  this.scene.add(floor);
  this.objects.push(floor);

  // 📐 Helpers
  const gridHelper = new THREE.GridHelper(200, 200, 0xd453ff, 0x444ddd);
  this.scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(5);
  this.scene.add(axesHelper);
}

//************* Update/Model Transform ******************* */

updateModelTransform(): void {
  if (this.uploadedModel) {
    this.uploadedModel.scale.setScalar(this.modelScale);
    this.uploadedModel.position.y = this.modelHeight;
  }
}

// private setUploadedModel(model: THREE.Object3D): void {
//   this.uploadedModel = model;
//   this.modelScale = model.scale.x; // Sync GUI with actual values
//   this.modelHeight = model.position.y;
// }

applyModelTransform(): void {
    if (this.uploadedModel) {
      this.uploadedModel.scale.setScalar(this.modelScale);
      this.uploadedModel.position.y = this.modelHeight;
    }
  }

//************* Update Ambient Light ******************* */

  updateAmbientLight() {
  this.ambientLight.intensity = this.ambientIntensity;
}

  updateCameraHeight() {
  this.camera.position.y = this.cameraHeight;
}

  clearScene() {
      this['sceneControls'].clearScene(
        this.scene,
        () => confirm('Are you sure you want to clear the scene?'),
        (msgKey: string) => console.log(msgKey)
      );
      this.uploadedModel = null;
      this.objects = [];
    }

//************* Load GLB helper for buttons ******************* */

 loadGLB(file: File): void {
    const loader = new GLTFLoader();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) return;
      loader.parse(
        e.target.result as ArrayBuffer,
        '',
        (gltf) => {
          // Check if GLB is a valid model
          if (!gltf.scene) {
            console.error('Invalid GLB format.');
            return;
          }

          this.scene.add(gltf.scene);
          this.uploadedModel = gltf.scene;
          console.log('GLB loaded successfully');
        },
        (error) => {
          console.error('Error loading GLB:', error);
        }
      );
    };

    reader.readAsArrayBuffer(file);
  }

//************* Animation/ Controller Pad and Keys ******************* */

private animate = () => {
  this.animationId = requestAnimationFrame(this.animate);
  const delta = this.clock.getDelta();

  this.vrHelper.update(); // Update joystick

  this.movementHelper.applyFriction(delta, 5.0);
  this.movementHelper.updateKeyboardMovement(delta, this.speed); // Only updates velocity.y (gravity/jump)

  // Inside animate()
  if (this.escHintSprite) {
    const offset = new THREE.Vector3(0, -0.8, -2.5);
    this.escHintSprite.position.copy(this.camera.localToWorld(offset.clone()));
  }

  if (this.escHintSprite) {
  const isInFullscreen = document.fullscreenElement === this.renderer.domElement;
  this.escHintSprite.visible = isInFullscreen;
}

  this.movementHelper.applyCombinedMovement(
    delta,
    this.controls.getObject(),
    this.controls,
    this.keysPressed, // WASD
    this.vrHelper.movementVector, // joystick
    this.controls.getObject().quaternion, // direction of player
    this.isColliding.bind(this)
  );

  this.movementHelper.enforceGround(this.controls.object);

  // Update ESC hint sprite position & orientation if visible
  if (this.escHintSprite && this.escHintSprite.visible) {
    // Get camera forward direction
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Position sprite 2 units in front of camera and a bit below
    const cameraPosition = this.camera.position.clone();
    this.escHintSprite.position.copy(cameraPosition).add(cameraDirection.multiplyScalar(2));
    this.escHintSprite.position.y -= 1.2;

    // Make it face camera
    this.escHintSprite.quaternion.copy(this.camera.quaternion);
  }

  this.renderer.render(this.scene, this.camera);

  console.log('Facing quaternion:', this.controls.getObject().quaternion);
  console.log('Joystick Movement:', this.vrHelper.movementVector);
};

public isColliding(position: THREE.Vector3): boolean {
  const playerHeight = 1.6;
  const playerHalfHeight = playerHeight / 2;

  const playerBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position.x, position.y - playerHalfHeight, position.z),
    new THREE.Vector3(0.5, playerHeight, 0.5)
  );

  for (const obj of this.objects ?? []) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.intersectsBox(playerBox)) return true;
  }

  return false;
}

private onKeyDown = (event: KeyboardEvent) => {
  this.movementHelper.onKeyDown(event.code);
};

private onKeyUp = (event: KeyboardEvent) => {
  this.movementHelper.onKeyUp(event.code);
};

//************* Screen Sizing ******************* */

private resizeListener = () => {
  this.onResize();
};

onResize(width?: number, height?: number): void {
  const container = this.containerRef.nativeElement;
  const w = width ?? container.clientWidth;
  const h = height ?? container.clientHeight;

  if (this.renderer && this.camera) {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  if (this.isVRMode && this.stereoEffect) {
    this.stereoEffect.setSize(w, h);
  }
}

//************* FullScreen ******************* */

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

//********* ESC Hint for Fullscreen *********/

private createEscHintSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Text
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

  sprite.visible = false; // Hide until fullscreen is entered

  sprite.scale.set(6, 0.8, 1);           // W x H (adjust as needed)
  sprite.position.set(0, -0.8, -2.5);    // Centered, slightly below camera

  return sprite;
}

//************* VR Integration ******************* */

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

//************* Page Load Popup*************** */

enterModelPlacementMode(): void {
    this.isPlacingModel = true;
    this.snackBar.open(this.translate.instant('MESSAGES.MODEL_PLACEMENT_MODE_ACTIVE'), 'OK', { duration: 3000 });
  }

//************* ThreeJS Buttons ******************* */

 updateSunlight(value: number): void {
   this.dirLight.intensity = value;
 }

 updateSpeed(value: number): void {
   this.speed = value;
   this.movementHelper.moveSpeed = value;
   this.vrHelper.moveSpeed = value;
 }

 updateEyeLevel(value: number): void {
   const minHeight = 2;
   const maxHeight = 30;
   this.cameraHeight = Math.max(minHeight, Math.min(value, maxHeight));
   this.camera.position.y = this.cameraHeight;
 }

 updateModelSize(value: number): void {
   const minScale = 30;
   const maxScale = 100;
   this.modelScale = Math.min(Math.max(value, minScale), maxScale);
   this.updateModelTransform?.();
 }

 updateModelHeight(value: number): void {
   this.modelHeight = value;
   this.updateModelTransform?.();
 }

}

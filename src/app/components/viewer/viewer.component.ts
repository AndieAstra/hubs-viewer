import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  HostListener,
  NgZone
} from '@angular/core';

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Import the GLTF type

import GUI from 'lil-gui';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { VrControllerHelper } from '../helpers/vr-controller.helper';
import { PlayerMovementHelper } from '../helpers/player-movement.helper';
import { StorageService } from '../../services/storage.service';


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
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})

export class ViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  [x: string]: any;

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild(ViewerComponent) viewerComponent!: ViewerComponent;
  @ViewChild('viewerCanvas', { static: false }) viewerCanvasRef!: ElementRef;

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  ambientLight!: THREE.AmbientLight;
  dirLight!: THREE.DirectionalLight;

  uploadedModel: THREE.Object3D | null = null;

  // Track loaded meshes for collision etc
  objects: THREE.Object3D[] = [];

  playerObj: THREE.Object3D; // Declare playerObj as a THREE.Object3D

  isLoading = false;
  sunlight = 1;                // Scene sunlight intensity
  movementSpeed = 50;          // Player movement speed
  modelSize = 30;              // Default model scale factor
  modelScale = 1;              // Actual model scale applied
  modelHeight = 0;             // Vertical position offset for model
  ambientIntensity = 0.5;      // Ambient light intensity
  speed = 50;                  // Movement speed used by sliders
  cameraHeight = 2;            // Camera/player height from ground

  private clock = new THREE.Clock();
  public sceneLoaded = false;                          // Used to track scene initialization
  private gui!: GUI; // dat.GUI or lil-gui instance for debugging or runtime adjustments
  showEscHint = false;
  private container!: HTMLElement;
  private escHint!: HTMLDivElement;
  private escHintSprite!: THREE.Sprite;

  vrActive = false;
  private animationId: number | null = null;
  vrControllerActive = false;
  private vrHelper = new VrControllerHelper(3.0); // Move speed
  public controllerSpeed = 3.0;

  private movementHelper!: PlayerMovementHelper;
  public controls!: PointerLockControls;               // FPS-style movement
  transformControls!: TransformControls;                // 3D object transform tools
  selectedTool = '';                                    // Currently selected tool (e.g., translate/rotate)

  private keysPressed = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private canJump = false;
  private gravity = 9.8;         // Gravitational force
  private jumpStrength = 5;      // Jump height multiplier


  private stereoEffect!: StereoEffect;
  public isVRMode = false;
  private originalSize?: { width: number; height: number };    // For restoring size after VR
  private originalCameraAspect?: number;                       // Used to reset camera aspect
  private originalSetAnimationLoop: any;                       // Backup of setAnimationLoop

  get isInFullscreen(): boolean {
      return document.fullscreenElement === this.containerRef?.nativeElement;
    }

  private isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  gridHelper!: THREE.GridHelper;
  showGrid = true;                  // Toggle grid visibility

  isPlacingModel = false;           // Whether user is placing a model in the scene
  viewerRef: any; // This will hold your viewer reference

  @HostListener('document:webkitfullscreenchange')
  onWebkitFullscreenChange() {
    this.onResize();
  }

  @Input() glbFile?: File;

  constructor(
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private ngZone: NgZone,
    private storageService: StorageService,
  ) {
    this.playerObj = new THREE.Object3D();
  }


// ***********************************************************************************************

ngOnInit() {
  document.addEventListener('fullscreenchange', () => {
    this.escHint.style.display = document.fullscreenElement === this.container ? 'block' : 'none';
  });

  this.canJump = true;
  this.vrHelper.enabled = true;
  this.movementHelper = new PlayerMovementHelper(
    3.0,
    this.gravity,
    this.jumpStrength,
    this.cameraHeight
  );
  this.viewerRef = new THREE.WebGLRenderer({ canvas: this.viewerCanvasRef.nativeElement });
}

ngOnDestroy() {
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

    // Handle the scenario where the file is being updated or initially set
    if (glbFileChange.currentValue) {

      // Skip if it's the first change (when component is initialized)
      if (glbFileChange.isFirstChange()) return;

      // If a scene is already loaded, ask the user if they want to replace it
      if (this.sceneLoaded) {
        const confirmReplace = confirm(
          'A scene is already loaded. Do you want to replace it with a new model?'
        );
        if (!confirmReplace) return; // Don't replace if user cancels
        //this.clearScene(); // Clear the current scene if user agrees
      }

      // Retrieve the new file to be loaded
      const file = glbFileChange.currentValue as File;

      // Load the new GLB file
      this['sceneControls'].loadGLB(
        file,
        this.scene,
        1, // scale (example: adjust this based on your needs)
        0, // rotation (example: adjust this as needed)
        (model: THREE.Object3D) => {
          console.log('Model loaded:', model);
          this.uploadedModel = model; // Store the loaded model
          this.sceneLoaded = true; // Set flag to true indicating a model is loaded
          this.objects.push(model); // Add the model to the list of objects
          this['applyModelTransform'](); // Apply any transformations needed on the model
          this['logToConsole']('MODEL_LOADED', { name: model.name }); // Log the model load
        },
        () => {
          this['logToConsole']('ERRORS.FAILED_LOAD_MODEL', { fileName: file.name }); // Handle load failure
        }
      );
    } else if (!this.sceneLoaded && !glbFileChange.isFirstChange()) {
      // Alert the user if no model is loaded and no valid file is provided
      alert('⚠️ No model file loaded or scene is empty. Please load a valid GLB model.');
    }
  }
}

ngAfterViewInit() {

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
      //this.clearScene();
      this['sceneControls'].loadGLB(
        file,
        this.scene,
        1,
        0,
        (model: THREE.Object3D) => {
          this.uploadedModel = model;
          this.sceneLoaded = true;
          this.objects.push(model);
          this['applyModelTransform']();
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

  //add a toggle for the grid
  this.gui.add(this, 'showGrid').name('Toggle Grid').onChange((visible: boolean) => {
  this.gridHelper.visible = visible;
});

  this.stereoEffect = new StereoEffect(this.renderer);
  this.stereoEffect.setSize(window.innerWidth, window.innerHeight);

  window.addEventListener('popstate', () => {
    if (this.isVRMode) {
    }
  });

  if (this.viewerCanvasRef) {
    this.viewerRef = new THREE.WebGLRenderer({ canvas: this.viewerCanvasRef.nativeElement });
  }
  if (this.viewerCanvasRef && this.viewerCanvasRef.nativeElement) {
    console.log("Viewer Canvas element:", this.viewerCanvasRef.nativeElement);
  } else {
    console.error("Viewer Canvas reference is missing.");
  }
}

//********* UI Controls for the ThreeJS Scene *********/

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

//************* Page Load Popup*************** */

enterModelPlacementMode(): void {
    this.isPlacingModel = true;
    this.snackBar.open(this.translate.instant('MESSAGES.MODEL_PLACEMENT_MODE_ACTIVE'), 'OK', { duration: 3000 });
  }

}

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

import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { VrControllerHelper } from '../helpers/vr-controller.helper';
import { PlayerMovementHelper } from '../helpers/player-movement.helper';
import { StorageService } from '../../services/storage.service';
import { SceneControlsService } from '../../services/scene-controls.service';

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

  public isVRMode = false;
  public isPlacingModel = false; // Define this property to avoid errors.

  @Input() glbFile?: File;
  //ambientLight: any;
  public ambientLight = new THREE.AmbientLight(0xffffff, 1);

  constructor(
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private storageService: StorageService,
    private sceneControlsService: SceneControlsService
  ) {}

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
    this.renderer = new THREE.WebGLRenderer({ canvas: this.viewerCanvasRef.nativeElement });
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
      position: 'relative'
    });

    Object.assign(canvas.style, {
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
          undefined, // Optional: Handle progress
          (error) => {
            this.logToConsole('ERRORS.FAILED_LOAD_MODEL', {
              fileName: file.name
            });
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
    const container = this.containerRef.nativeElement;
    const w = width ?? container.clientWidth;
    const h = height ?? container.clientHeight;

    if (this.renderer && this.camera) {
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    // If VR Mode is active, adjust accordingly
    if (this.isVRMode) {
      // Handle VR resize logic here (e.g. using WebXR)
    }
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

enterVR(){
  // TODO: Open bug report form
  console.log('Entered VR');
}

exitVR(){
  // TODO: Open bug report form
    console.log('Exited VR');
}

}

import {
  Component, ElementRef, Input, OnInit, OnChanges, SimpleChanges,
  AfterViewInit, OnDestroy, ViewChild, HostListener
} from '@angular/core';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';

import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { PlayerMovementHelper } from '../helpers/player-movement.helper';
import { StorageService } from '../../services/storage.service';
import { SceneControlsService } from '../../services/scene-controls.service';
import { VrControllerHelper } from '../helpers/vr-controller.helper';
import { SceneManagerComponent } from '../scene-manager/scene-manager.component';


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
  imports: [SceneManagerComponent],
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})

export class ViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild(SceneManagerComponent) sceneManager!: SceneManagerComponent;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('sceneContainer', { static: true }) sceneContainerRef!: ElementRef<HTMLElement>;
  @Input() glbFile?: File;
  @Input() vrHelper!: VrControllerHelper;

  scene!: THREE.Scene;
  renderer!: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  uploadedModel: THREE.Object3D | null = null;
  model: THREE.Object3D = new THREE.Object3D();
  controls: any;

  //sceneManager!: SceneManagerComponent;
  sceneManagerContainer!: HTMLElement;

  transformControls!: TransformControls;
  stereoEffect: any;
  //vrHelper!: VrControllerHelper;

  //playerObj: THREE.Object3D = new THREE.Object3D();
  ambientLight = new THREE.AmbientLight(0xffffff, 1);
  private sceneLight!: THREE.DirectionalLight;

  movementHelper!: PlayerMovementHelper;
  private playerMovementHelper = new PlayerMovementHelper(10, 9.8, 10, 1.6);

  private clock = new THREE.Clock();
  private animationId: number | null = null;

  private originalSize?: { width: number; height: number };
  private originalCameraAspect?: number;

  private boundOnKeyDown!: (event: KeyboardEvent) => void;
  private boundOnKeyUp!: (event: KeyboardEvent) => void;
  private resizeListener = () => this.onResize();

  public controllerSpeed = 3.0;
  public sceneLoaded = false;
  public isPlacingModel = false;
  public isVRMode = false;

  isLoading = false;
  sunlight = 1;
  movementSpeed = 50;
  modelSize = 30;
  modelScale = 1;
  modelHeight = 0;
  ambientIntensity = 0.5;
  cameraHeight = 2;

  get isInFullscreen(): boolean {
    return document.fullscreenElement === this.sceneContainerRef?.nativeElement;
  }

  constructor(
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private storageService: StorageService,
    private sceneControlsService: SceneControlsService,
  ) {}

ngOnInit() {
  this.boundOnKeyDown = (event: KeyboardEvent) => this.playerMovementHelper.onKeyDown(event.code);
  this.boundOnKeyUp = (event: KeyboardEvent) => this.playerMovementHelper.onKeyUp(event.code);
  window.addEventListener('keydown', this.boundOnKeyDown);
  window.addEventListener('keyup', this.boundOnKeyUp);

  if (this.vrHelper) {
    this.vrHelper.enableInteractions();
  }

  document.addEventListener('fullscreenchange', () => {
    // Optional: Handle full screen change visuals
  });
}

ngAfterViewInit(): void {
  if (!this.sceneContainerRef?.nativeElement) {
    console.error('sceneContainerRef is undefined.');
    return;
  }

  this.sceneManagerContainer = this.sceneContainerRef.nativeElement;

  const animate = (time: number) => {
    this.sceneManager?.render();
    this.animationId = requestAnimationFrame(animate);
  };
  this.animationId = requestAnimationFrame(animate);

  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = document.fullscreenElement !== null;
    if (this.sceneManager) {
      this.sceneManager.setEscHintVisible(isFullscreen);
    }
  });
}


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['glbFile']?.currentValue && !changes['glbFile'].isFirstChange()) {
      const file = changes['glbFile'].currentValue as File;
      if (this.sceneLoaded) {
        const confirmReplace = confirm('A scene is already loaded. Replace it?');
        if (!confirmReplace) return;
      }

      const loader = new GLTFLoader();
      loader.load(
        URL.createObjectURL(file),
        (gltf) => {
          const model = gltf.scene;
          this.uploadedModel = model;
          this.sceneLoaded = true;
          this.applyModelTransform();
          this.logToConsole('MODEL_LOADED', { name: model.name });
        },
        undefined,
        (error) => {
          this.logToConsole('ERRORS.FAILED_LOAD_MODEL', { fileName: file.name });
        }
      );
    }
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
    window.removeEventListener('resize', this.resizeListener);

    if (this.vrHelper) this.vrHelper.stop();
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer) this.renderer.dispose();

    this.scene?.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      const material = (obj as THREE.Mesh).material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.sceneManager?.resize();
  }

  onResize(width?: number, height?: number): void {
    this.sceneManager?.resize();
  }

  toggleFullscreen() {
    const canvas = this.renderer?.domElement;
    if (!canvas) return;

    if (!document.fullscreenElement) {
      canvas.requestFullscreen().catch(err => console.error("Fullscreen failed:", err));
    } else {
      document.exitFullscreen().catch(err => console.error("Exit fullscreen failed:", err));
    }
  }

  applyModelTransform() {
    if (this.uploadedModel) {
      this.uploadedModel.scale.set(this.modelScale, this.modelScale, this.modelScale);
      this.uploadedModel.position.set(this.modelSize * 0.5, this.modelHeight, 0);
    }
  }

  enterModelPlacementMode(): void {
    this.isPlacingModel = true;
    this.snackBar.open(this.translate.instant('MESSAGES.MODEL_PLACEMENT_MODE_ACTIVE'), 'OK', { duration: 3000 });
  }

  logToConsole(message: string, details: any) {
    console.log(message, details);
  }

  onModelSizeChange(event: any): void {
    this.sceneControlsService.updateModelSize(this.model, event.target.value);
  }

  onModelHeightChange(event: any): void {
    this.sceneControlsService.updateModelHeight(this.model, event.target.value);
  }

  onCameraSpeedChange(event: any): void {
    this.sceneControlsService.updateCameraSpeed(this.controls, event.target.value);
  }

  onSunlightIntensityChange(event: any): void {
    this.sceneControlsService.updateSunlightIntensity(this.sceneLight, event.target.value);
  }

  onEyeLevelChange(event: any): void {
    this.sceneControlsService.updateEyeLevel(this.camera, event.target.value);
  }

  enterVR(): void {
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
      this.snackBar.open(this.translate.instant('MESSAGES.VR_MOBILE_ONLY'), 'OK', { duration: 3000 });
      return;
    }

    if (!confirm(this.translate.instant('MESSAGES.ENTER_VR_CONFIRM'))) return;

    this.isVRMode = true;
    document.body.classList.add('vr-mode');

    const container = this.sceneContainerRef.nativeElement;
    const requestFullscreen = container.requestFullscreen
      || (container as any).webkitRequestFullscreen
      || (container as any).msRequestFullscreen;

    requestFullscreen?.call(container).catch((err: any) =>
      console.warn(this.translate.instant('ERRORS.FULLSCREEN_FAILED'), err)
    );

    try {
      (screen.orientation as any)?.lock?.('landscape').catch((err: any) =>
        console.warn(this.translate.instant('ERRORS.ORIENTATION_LOCK_FAILED'), err)
      );
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

  exitVR(): void {
    this.isVRMode = false;
    document.body.classList.remove('vr-mode');

    this.renderer?.setAnimationLoop(null);
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err: any) =>
          console.warn(this.translate.instant('ERRORS.EXIT_FULLSCREEN_FAILED'), err)
        );
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

    if (history.state?.vr) history.back();
    window.onpopstate = null;
  }

  private renderVR = () => {
    if (this.vrHelper) {
      this.vrHelper.update(); // updates orientation + movement
      this.vrHelper.applyRotation(this.camera); // applies smoothed rotation

      // Apply movement
      const delta = this.clock.getDelta();
      const move = this.vrHelper.movementVector.clone().multiplyScalar(delta * this.vrHelper.moveSpeed);
      this.camera.position.add(move);
    }

    this.camera.position.y = this.cameraHeight;
    this.stereoEffect.render(this.scene, this.camera);
  };

}

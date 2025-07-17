import {
  Component, ElementRef, Input, OnInit, OnChanges, SimpleChanges,
  AfterViewInit, OnDestroy, ViewChild, HostListener,
  ChangeDetectorRef
} from '@angular/core';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';

import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { PlayerMovementHelper } from '../../helpers/player-movement.helper';
import { ProjectData, StorageService } from '../../services/storage.service';
import { SceneControlsService } from '../../services/scene-controls.service';
import { VrControllerHelper } from '../../helpers/vr-controller.helper';
import { SceneManagerComponent } from '../scene-manager/scene-manager.component';
import { toggleFullscreen } from '../../helpers/fullscreen.helper';

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

  stereoEffect?: StereoEffect;
  uploadedModel: THREE.Object3D | null = null;
  sceneLoaded = false;

  public get scene() { return this.sceneManager?.scene; }
  public get camera() { return this.sceneManager?.camera; }
  public get ambient() { return this.sceneManager?.ambientLight; }
  public get directional() { return this.sceneManager?.dirLight; }

  renderer!: THREE.WebGLRenderer;
  model: THREE.Object3D = new THREE.Object3D();
  controls: any;
  sceneManagerContainer!: HTMLElement;
  transformControls!: TransformControls;

  ambientLight = new THREE.AmbientLight(0xffffff, 1);
  public dirLight!: THREE.DirectionalLight;

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
    private cdRef: ChangeDetectorRef
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
    });

    this.sceneControlsService.setAmbientLight(this.sceneManager.ambientLight);

    this.storageService.registerChangeDetector(this.cdRef);
  }

  ngAfterViewInit(): void {
    const containerEl = this.sceneContainerRef?.nativeElement;

    if (!containerEl) {
      console.error('sceneContainerRef is undefined or not available in the DOM.');
      return;
    }

    this.sceneManagerContainer = containerEl;

    const animate = (time: number) => {
      this.sceneManager?.render();
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);

    document.addEventListener('fullscreenchange', () => {
      const isFullscreen = document.fullscreenElement !== null;
      this.sceneManager?.setEscHintVisible(isFullscreen);
    });

 // Create and add ambient light (room light)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // color, intensity
    this.scene.add(this.ambientLight);

    // Create and add directional light (sunlight)
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(5, 10, 7.5);
    this.scene.add(this.dirLight);

   /* 👉  give the service access to the sun light */
  this.sceneControlsService.setDirectionalLight(this.sceneManager.dirLight);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['glbFile']?.currentValue && !changes['glbFile'].isFirstChange()) {
      const file = changes['glbFile'].currentValue as File;
      if (this.sceneLoaded && !confirm('A scene is already loaded. Replace it?')) return;

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

    this.vrHelper?.stop();
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();

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

  onModelSizeChange(event: Event): void {
    const size = +(event.target as HTMLInputElement).value;
    if (this.uploadedModel) {
      this.sceneControlsService.updateModelSize(this.uploadedModel, size);
    }
  }

  onModelHeightChange(evt: Event): void {
    const y = parseFloat((evt.target as HTMLInputElement).value);
    const target = this.uploadedModel ?? this.model;
    this.sceneControlsService.updateModelHeight(target, y);
  }

  //
  // Are these two the same thing???
  // onCameraSpeedChange(event: any): void {
  //   this.sceneControlsService.updateCameraSpeed(this.controls, event.target.value);
  // }

  public setWalkSpeed(speed: number): void {
    this.sceneControlsService.updateMovementSpeed(speed);
  }
  //
  //

  onSunlightIntensityChange(event: any): void {
    this.sceneControlsService.updateSunlightIntensity(this.sceneLight, event.target.value);
  }

  onSunlightColorChange(event: Event): void {
  const hexColor = (event.target as HTMLInputElement).value;
  if (this.dirLight) {
    this.dirLight.color = new THREE.Color(hexColor);
  }
}

  onEyeLevelChange(evt: Event): void {
    const val = +(evt.target as HTMLInputElement).value;
    this.sceneManager?.setEyeLevel(val);
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

  // Request fullscreen on the container element
  const requestFullscreen = container.requestFullscreen
    || (container as any).webkitRequestFullscreen
    || (container as any).msRequestFullscreen;

  requestFullscreen?.call(container).catch((err: any) =>
    console.warn(this.translate.instant('ERRORS.FULLSCREEN_FAILED'), err)
  );

  // Try to lock screen orientation to landscape
  try {
    (screen.orientation as any)?.lock?.('landscape').catch((err: any) =>
      console.warn(this.translate.instant('ERRORS.ORIENTATION_LOCK_FAILED'), err)
    );
  } catch (err) {
    console.warn(this.translate.instant('ERRORS.ORIENTATION_LOCK_UNAVAILABLE'), err);
  }

  // Save original container size and camera aspect
  this.originalSize = {
    width: container.clientWidth,
    height: container.clientHeight,
  };
  this.originalCameraAspect = this.camera?.aspect;

  // Initialize and set size for stereoEffect
  if (!this.stereoEffect) {
    this.stereoEffect = new StereoEffect(this.renderer);
  }
  this.stereoEffect.setSize(container.clientWidth, container.clientHeight);

  // Start VR rendering loop using stereoEffect
  this.renderer.setAnimationLoop(() => this.renderVR());

  // Push VR state to history to handle back button exit
  history.pushState({ vr: true }, '');
  window.onpopstate = () => {
    if (this.isVRMode) this.exitVR();
  };
}

exitVR(): void {
  this.isVRMode = false;
  document.body.classList.remove('vr-mode');

  // Stop VR animation loop
  this.renderer?.setAnimationLoop(null);

  // Exit fullscreen if active
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err: any) =>
        console.warn(this.translate.instant('ERRORS.EXIT_FULLSCREEN_FAILED'), err)
      );
    }

    // Unlock screen orientation
    (screen.orientation as any)?.unlock?.();
  } catch (e) {
    console.warn(this.translate.instant('ERRORS.UNLOCK_ORIENTATION_FAILED'), e);
  }

  // Restore camera aspect ratio and renderer size
  if (this.renderer && this.camera && this.originalSize) {
    this.camera.aspect = this.originalCameraAspect ?? window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.originalSize.width, this.originalSize.height);
  }

  // Reset container styles (in case you changed them on enter VR)
  const container = this.sceneContainerRef.nativeElement;
  Object.assign(container.style, {
    width: '',
    height: '',
    position: '',
    top: '',
    left: '',
    display: '',
  });

  this.snackBar.open(this.translate.instant('MESSAGES.EXITED_VR_MODE'), 'OK', { duration: 2000 });

  // Go back in history if VR state was pushed
  if (history.state?.vr) history.back();
  window.onpopstate = null;
}

  private renderVR = () => {
    if (this.vrHelper) {
      this.vrHelper.update();
      if (this.camera) {
        this.vrHelper.applyRotation(this.camera);
        const delta = this.clock.getDelta();
        const move = this.vrHelper.movementVector.clone().multiplyScalar(delta * this.vrHelper.moveSpeed);
        this.camera.position.add(move);
        this.camera.position.y = this.cameraHeight;
      }
    }

    if (this.stereoEffect && this.scene && this.camera) {
      this.stereoEffect.render(this.scene, this.camera);
    }
  };

  // onFileChange(evt: Event): void {
  //   const file = (evt.target as HTMLInputElement).files?.[0];
  //   if (!file) return;
  //   this.storageService.loadProject(file);
  // }

  async onFileChange(evt: Event): Promise<void> {
  const file = (evt.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    await this.loadFile(file);  // calls the new loadFile
    this.storageService.logToConsole(`Loaded file: ${file.name}`);
  } catch (error) {
    console.error('Failed to load scene:', error);
    this.storageService.logToConsole('ERROR_LOADING_SCENE');
  }

  // Reset file input
  (evt.target as HTMLInputElement).value = '';

  if (!file.name.endsWith('.json')) {
  this.snackBar.open('Invalid file type. Please upload a JSON file.', 'OK', { duration: 3000 });
  return;
}
}

disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as any).geometry) {
      (child as any).geometry.dispose?.();
    }
    if ((child as any).material) {
      const mat = (child as any).material;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose?.());
      else mat.dispose?.();
    }
  });
}

  handleLocalFile(file: File): void {
    const loader = new GLTFLoader();
    loader.load(URL.createObjectURL(file), (gltf) => {

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const c   = new THREE.Vector3();
      box.getCenter(c);
      gltf.scene.position.sub(c);

      const s = new THREE.Vector3();
      box.getSize(s);
      gltf.scene.position.y += s.y * 0.5;

      this.uploadedModel = gltf.scene;
      this.scene.add(gltf.scene);
      this.applyModelTransform();
      this.logToConsole('MODEL_LOADED', { name: gltf.scene.name });
    }, undefined,
      err => this.logToConsole('ERRORS.FAILED_LOAD_MODEL', { fileName: file.name })
    );
  }

  // loadFile(file: File): void {
  //   this.handleLocalFile(file);
  // }

// async loadFile(file: File): Promise<void> {
//   const reader = new FileReader();

//   reader.onload = async () => {
//     try {
//       const jsonText = reader.result as string;
//       const projectData = JSON.parse(jsonText) as ProjectData;

//       const sceneData = projectData.scene;
//       if (!sceneData) throw new Error('No scene data found in file.');

//       this.clearScene();
//       this.restoreScene(sceneData);

//       if (!this.scene) {
//         throw new Error('Scene not initialized. Cannot load model.');
//       }

//       for (const modelData of sceneData.models) {


//         const binary = Uint8Array.from(
//           atob(modelData.glbBase64),
//           (c) => c.charCodeAt(0)
//         );
//         const blob = new Blob([binary], { type: 'model/gltf-binary' });
//         const url = URL.createObjectURL(blob);

//         const loader = new GLTFLoader();
//         const gltf = await loader.loadAsync(url);
//         URL.revokeObjectURL(url);

//         const model = gltf.scene;
//         model.name = modelData.name;
//         model.position.set(
//           modelData.position.x,
//           modelData.position.y,
//           modelData.position.z
//         );
//         model.rotation.set(
//           modelData.rotation.x,
//           modelData.rotation.y,
//           modelData.rotation.z
//         );
//         model.scale.set(
//           modelData.scale.x,
//           modelData.scale.y,
//           modelData.scale.z
//         );
//         model.userData['isLoadedModel'] = true;
//         model.userData['fileName'] = modelData.fileName;

//         this.scene.add(model);
//       }

//       this.sceneLoaded = true;

//     } catch (e) {
//       console.error('Failed to load file:', e);
//       this.storageService.logToConsole('ERROR_LOADING_SCENE');
//     }
//   };

//   reader.onerror = () => {
//     this.storageService.logToConsole('ERROR_READING_FILE');
//   };

//   reader.readAsText(file);
// }

async loadFile(file: File): Promise<void> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    try {
      await this.loadJsonScene(file); // Handles JSON scene loading
    } catch (err) {
      console.error('Failed to load JSON scene:', err);
      this.storageService.logToConsole('ERROR_LOADING_JSON_SCENE');
    }
  } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
    await this.handleLocalModelFile(file); // Handles single model loading
  } else {
    console.error('Unsupported file type:', file.name);
    this.storageService.logToConsole('ERROR.UNSUPPORTED_FILE_TYPE');
  }
}

async loadJsonScene(file: File): Promise<void> {
  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const jsonText = reader.result as string;
      const sceneData = JSON.parse(jsonText) as SceneData;

      if (!sceneData) {
        throw new Error('No scene data found in file.');
      }

      // Clear and restore the scene
      this.clearScene();
      this.restoreScene(sceneData);

      // Add Ambient Light with higher intensity if not already present
      if (!this.scene.getObjectByName('ambientLight')) {
        const ambientLight = new THREE.AmbientLight(0x404040, 2); // Increase intensity to 2
        ambientLight.name = 'ambientLight'; // Add a name to track
        this.scene.add(ambientLight);
      }

      // Add Directional Light with proper target if not already present
      if (!this.scene.getObjectByName('directionalLight')) {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // White light
        directionalLight.position.set(5, 10, 7); // Adjust the position
        directionalLight.name = 'directionalLight'; // Add a name to track
        this.scene.add(directionalLight);

        // Create a target object for directional light
        const target = new THREE.Object3D();
        target.position.set(0, 0, 0); // Make it point to the origin
        directionalLight.target = target;
      }

      // Ensure the camera is facing the scene
      if (!this.camera) {
        throw new Error('Camera not found');
      }

      this.camera.position.set(0, 1, 3); // Position the camera slightly above and looking at the origin
      this.camera.lookAt(0, 0, 0); // Make sure camera faces the origin of the scene

      // Load models from the scene data
      for (const modelData of sceneData.models) {
        const binary = Uint8Array.from(atob(modelData.glbBase64), c => c.charCodeAt(0));
        const blob = new Blob([binary], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        URL.revokeObjectURL(url);

        const model = gltf.scene;
        model.name = modelData.name;
        model.position.set(modelData.position.x, modelData.position.y, modelData.position.z);
        model.rotation.set(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z);
        model.scale.set(modelData.scale.x, modelData.scale.y, modelData.scale.z);
        model.userData['isLoadedModel'] = true;
        model.userData['fileName'] = modelData.fileName;

        // Debug: Check model material type
        model.traverse((child) => {
          // TypeScript requires type assertion here for meshes
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            console.log('Model Material Type:', mesh.material);

            // Ensure materials are standard materials that require lighting
            if (!(mesh.material instanceof THREE.MeshStandardMaterial)) {
              console.warn('Non-Standard material found, switching to MeshStandardMaterial');
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.5,
              });
            }
          }
        });

        this.scene.add(model);
      }

      this.sceneLoaded = true;
      this.storageService.logToConsole(`Loaded JSON scene: ${file.name}`);

    } catch (e) {
      console.error('Failed to load JSON scene:', e);
      this.storageService.logToConsole('ERROR_LOADING_SCENE');
    }
  };

  reader.onerror = () => {
    this.storageService.logToConsole('ERROR_READING_FILE');
  };

  reader.readAsText(file);
}


async handleLocalModelFile(file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync(url);
    URL.revokeObjectURL(url);

    const model = gltf.scene;
    model.name = file.name;
    model.userData['isLoadedModel'] = true;
    model.userData['fileName'] = file.name;

    this.scene.add(model);
    this.sceneLoaded = true;

    this.storageService.logToConsole(`Loaded model: ${file.name}`);
  } catch (error) {
    console.error('Failed to load model:', error);
    this.storageService.logToConsole('ERRORS.FAILED_LOAD_MODEL');
  }
}






  async onToggleFullscreen(): Promise<void> {
  const container = this.sceneContainerRef?.nativeElement
                 ?? this.renderer?.domElement as HTMLElement | undefined;
  if (container) {
    await toggleFullscreen(container);
  }
}

clearScene(): void {
  const toRemove: THREE.Object3D[] = [];

  this.scene.traverse((obj) => {
    if (obj.userData?.['isLoadedModel']) {
      toRemove.push(obj);
    }
  });

  for (const obj of toRemove) {
    this.scene.remove(obj);
    this.disposeObject(obj);
    obj.traverse(child => {
      if ((child as any).geometry) {
        (child as any).geometry.dispose?.();
      }
      if ((child as any).material) {
        const mat = (child as any).material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose?.());
        } else {
          mat.dispose?.();
        }
      }
    });
  }
}


restoreScene(sceneData: SceneData): void {
  // Restore camera
  this.camera.position.set(
    sceneData.camera.position.x,
    sceneData.camera.position.y,
    sceneData.camera.position.z
  );
  this.camera.rotation.set(
    sceneData.camera.rotation.x,
    sceneData.camera.rotation.y,
    sceneData.camera.rotation.z
  );

  // Restore ambient light
  this.ambientLight.color.setHex(sceneData.lighting.ambient.color);
  this.ambientLight.intensity = sceneData.lighting.ambient.intensity;

  // Restore directional light
  this.dirLight.color.setHex(sceneData.lighting.directional.color);
  this.dirLight.intensity = sceneData.lighting.directional.intensity;
  this.dirLight.position.set(
    sceneData.lighting.directional.position[0],
    sceneData.lighting.directional.position[1],
    sceneData.lighting.directional.position[2]
  );
}


}

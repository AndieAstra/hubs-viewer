import {
  Component, ElementRef, Input, OnInit, OnChanges, SimpleChanges,
  AfterViewInit, OnDestroy, ViewChild, HostListener,
  ChangeDetectorRef
} from '@angular/core';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
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

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(5, 10, 7.5);
    this.scene.add(this.dirLight);
    this.sceneControlsService.setDirectionalLight(this.sceneManager.dirLight);
    const modelJson = this.getModelJson();
    this.sceneManager.loadGLTFModel(modelJson);
  }

  getModelJson() {
    return {
      "asset": { "version": "2.0", "generator": "glTF-Exporter" },
      "scene": 0,
      "scenes": [{ "nodes": [0] }],
      "nodes": [{ "mesh": 0 }],
      "meshes": [{ "primitives": [{ "attributes": { "POSITION": 0 }, "indices": 1 }] }],
      "buffers": [{ "byteLength": 0 }]
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['glbFile']?.currentValue && !changes['glbFile'].isFirstChange()) {
      const file = changes['glbFile'].currentValue as File;


          if (this.sceneLoaded) {
        this.snackBar.open(this.translate.instant('MESSAGES.REPLACE_MODEL_CONFIRM'), 'OK', { duration: 5000 });
        setTimeout(() => {
          this.loadNewModel(file);
        }, 5000);
        return;
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

  public setWalkSpeed(speed: number): void {
    this.sceneControlsService.updateMovementSpeed(speed);
  }

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
  this.originalCameraAspect = this.camera?.aspect;
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

 async onFileChange(evt: Event): Promise<void> {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.json')) {
        await this.sceneManager.loadJSON(file);
        this.storageService.logToConsole(`Loaded file: ${file.name}`);
      } else {
        this.snackBar.open('Invalid file type. Please upload a JSON file.', 'OK', { duration: 3000 });
        return;
      }
    } catch (error) {
      console.error('Failed to load scene:', error);
      this.storageService.logToConsole('ERROR_LOADING_SCENE');
    }
    (evt.target as HTMLInputElement).value = '';
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


async loadFile(file: File): Promise<void> {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.json')) {
    try {
      await this.loadJsonScene(file);
      this.storageService.logToConsole(`Loaded JSON scene: ${file.name}`);
    } catch (error) {
      console.error('Failed to load JSON scene:', error);
      this.storageService.logToConsole('ERROR_LOADING_JSON_SCENE');
    }
  } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
    try {
      await this.handleLocalModelFile(file);
    } catch (error) {
      console.error('Failed to load model:', error);
      this.storageService.logToConsole('ERRORS.FAILED_LOAD_MODEL');
    }
  } else {
    console.error('Unsupported file type:', file.name);
    this.storageService.logToConsole('ERROR.UNSUPPORTED_FILE_TYPE');
  }

  (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
}

async loadJsonScene(file: File): Promise<void> {
  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const json = JSON.parse(reader.result as string);

      // Case 1: Native Three.js scene (from scene.toJSON())
      if (json.object && json.metadata?.type === 'Object') {
        this.clearScene();

        const loader = new THREE.ObjectLoader();
        const parsedScene = loader.parse(json.object);
        this.scene.add(parsedScene);

        this.storageService.logToConsole('Loaded native Three.js scene.');
        this.renderer.render(this.scene, this.camera);
        return;
      }

      // Case 2: Custom scene format (with "models" array)
      if (json.models && Array.isArray(json.models)) {
        this.clearScene();
        this.restoreScene(json); // Setup camera, lighting, etc.

        for (const model of json.models) {
          const modelObj = await this.loadModelFromBase64(model);
          this.scene.add(modelObj);
        }

        this.storageService.logToConsole('Loaded custom JSON scene.');
        this.renderer.render(this.scene, this.camera);
        return;
      }

      // Invalid structure
      throw new Error('Unrecognized scene format');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error while loading JSON:', err);
      this.snackBar.open('Error loading scene JSON: ' + message, 'OK', { duration: 4000 });
    }
  };

  reader.readAsText(file);
}


async loadModelFromBase64(data: SavedModel): Promise<THREE.Object3D> {
  const binary = Uint8Array.from(atob(data.glbBase64), c => c.charCodeAt(0));
  const blob = new Blob([binary], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);

  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    URL.revokeObjectURL(url);

    const model = gltf.scene;
    model.position.set(data.position.x, data.position.y, data.position.z);
    model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    model.scale.set(data.scale.x, data.scale.y, data.scale.z);
    return model;
  } catch (err) {
    console.error('Failed to load model from base64:', err);
    throw err;
  }
}


adjustCameraPosition(): void {
  const boundingBox = new THREE.Box3().setFromObject(this.scene);
  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const cameraHeight = Math.max(maxDim * 1.5, 10);
  this.camera.position.set(center.x, center.y + cameraHeight, center.z + maxDim * 1.5);
  this.camera.lookAt(center);
  this.camera.near = 0.1;
  this.camera.updateProjectionMatrix();
  console.log('Camera position:', this.camera.position);
  console.log('Scene center:', center);
}

loadNewModel(file: File) {
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
  async loadGLTF(file: File): Promise<void> {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(URL.createObjectURL(file), (gltf) => {
        if (gltf.scene) {
          this.scene.add(gltf.scene);
          this.uploadedModel = gltf.scene;
          resolve();
        }
      }, undefined, reject);
    });
  }
async loadJSON(file: File): Promise<void> {
  const loader = new THREE.ObjectLoader();
  const gltfLoader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const json = event.target?.result;
        if (!json) {
          reject(new Error('Failed to read file contents.'));
          return;
        }
        console.log('File content:', json);
        const parsedObject = JSON.parse(json as string);
        if (parsedObject?.asset) {

        gltfLoader.parse(json as string, '', (gltf: GLTF) => {
          const object = gltf.scene;
          this.scene.add(object);
          this.uploadedModel = object;
          resolve();
        }, (event: ErrorEvent) => {
          const error = event.error ?? new Error(event.message);
          reject(new Error('Error loading GLTF JSON: ' + error.message));
        });


        } else if (parsedObject?.type) {
          const object = loader.parse(parsedObject);
          this.scene.add(object);
          this.uploadedModel = object;
          resolve();
        } else {
          reject(new Error('The parsed JSON is not valid GLTF or Object format.'));
        }
      } catch (error) {
        console.error('Error while loading JSON:', error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
    reader.readAsText(file);
  });
}


private restoreSceneLighting(lightingData: any): void {
  if (!lightingData) return;
  if (lightingData.ambient) {
    if (!this.scene.getObjectByName('ambientLight')) {
      const ambientLight = new THREE.AmbientLight(lightingData.ambient.color, lightingData.ambient.intensity);
      ambientLight.name = 'ambientLight';
      this.scene.add(ambientLight);
    }
  }
  if (lightingData.directional) {
    if (!this.scene.getObjectByName('directionalLight')) {
      const directionalLight = new THREE.DirectionalLight(lightingData.directional.color, lightingData.directional.intensity);
      directionalLight.position.set(lightingData.directional.position.x, lightingData.directional.position.y, lightingData.directional.position.z);
      directionalLight.name = 'directionalLight';
      this.scene.add(directionalLight);
    }
  }
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
  this.createDefaultCamera();
}

private createDefaultCamera(): void {
  const container = this.sceneContainerRef?.nativeElement;
  const aspectRatio = container
    ? container.clientWidth / container.clientHeight
    : window.innerWidth / window.innerHeight;

  this.sceneManager.camera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
  this.camera.position.set(0, this.cameraHeight || 2, 5);
  this.camera.lookAt(new THREE.Vector3(0, this.cameraHeight || 0, 0));
}

restoreScene(sceneData: SceneData): void {
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

  this.ambientLight.color.setHex(sceneData.lighting.ambient.color);
  this.ambientLight.intensity = sceneData.lighting.ambient.intensity;
  this.dirLight.color.setHex(sceneData.lighting.directional.color);
  this.dirLight.intensity = sceneData.lighting.directional.intensity;
  this.dirLight.position.set(
    sceneData.lighting.directional.position[0],
    sceneData.lighting.directional.position[1],
    sceneData.lighting.directional.position[2]
  );
}}

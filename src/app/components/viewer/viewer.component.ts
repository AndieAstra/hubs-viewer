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
  NgZone,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
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
private scene!: THREE.Scene;
private camera!: THREE.PerspectiveCamera;
public renderer!: THREE.WebGLRenderer;
private clock = new THREE.Clock();
private objects: THREE.Object3D[] = [];               // All interactive objects
uploadedModel: THREE.Object3D | null = null;          // User-uploaded GLB
private sceneLoaded = false;                          // Used to track scene initialization
private gui!: GUI; // dat.GUI or lil-gui instance for debugging or runtime adjustments


// ===========================================================
// VR Integration
// ===========================================================

vrActive = false;
private animationId: number | null = null;
vrControllerActive = false;
private vrHelper = new VrControllerHelper(3.0); // Move speed
public controllerSpeed = 3.0;


// ===========================================================
// 💡 Lighting System
// ===========================================================
private ambientLight!: THREE.AmbientLight;
private dirLight!: THREE.DirectionalLight;

// ===========================================================
// 🕹️ Controls & Tools
// ===========================================================

private movementHelper!: PlayerMovementHelper;

private controls!: PointerLockControls;               // FPS-style movement
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
  this.loadSceneFromLocalStorage();
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
    // Skip loading if this is the very first change (initial binding)
    if (changes['glbFile'].isFirstChange()) {
      // Optionally, do nothing on first load or set a flag here
      return;
    }

    if (this.sceneLoaded) {
      const confirmReplace = confirm('A scene is already loaded. Do you want to replace it with a new model?');
      if (!confirmReplace) return;
      this.clearScene();
    }
    this.loadGLB(changes['glbFile'].currentValue);
  }

  // Optionally handle no model loaded only after initial load
  else if (!this.glbFile && !this.sceneLoaded && !changes['glbFile']?.isFirstChange()) {
    alert('⚠️ No model file loaded or scene is empty. Please load a valid GLB model.');
  }

}

ngAfterViewInit() {
  this.initScene();
  this.animate();

  this.resizeListener = () => this.onResize();
  window.addEventListener('resize', this.resizeListener);


  if (this.glbFile) {
    this.loadGLB(this.glbFile);
  }

  // ✅ SAFELY SETUP canvas + renderer DOM
  if (!this.renderer || !this.renderer.domElement) {
    const msg = this.translate.instant('ERRORS.RENDERER_NOT_AVAILABLE');
    console.warn(msg);
    return;
  }

  const canvas = this.renderer.domElement;
  const container = this.containerRef.nativeElement;

// ✅ ENSURE canvas is added to container and assigned to canvasRef
if (!canvas.parentElement || canvas.parentElement !== container) {
  container.appendChild(canvas);
}

// 🔍 Add debug borders here
Object.assign(container.style, {
  border: '2px dashed red',
});

Object.assign(canvas.style, {
  border: '2px solid lime',
});

  // ✅ Optional: Assign to canvasRef if needed elsewhere
  this.canvasRef = new ElementRef(canvas);

  // ✅ Style the canvas for layout consistency
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

  // ✅ Resize renderer based on container
  this.renderer.setSize(container.clientWidth, container.clientHeight);
  this.animate();

  // ✅ Drag-and-drop events
  canvas.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  canvas.addEventListener('drop', (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files?.[0];
  if (file && file.name.endsWith('.glb')) {
    if (this.sceneLoaded && !confirm(this.translate.instant('ERRORS.DROP_REPLACE_CONFIRM'))) return;
    this.clearScene();
    this.loadGLB(file);
  }
});

  // ✅ Raycasting click handler
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

  // ✅ Pointer lock control logic
  canvas.addEventListener('click', () => {
    this.controls.lock();

    // 👶 Auto unlock after 10 seconds
    setTimeout(() => {
      if (this.controls.isLocked) {
        this.controls.unlock();
      }
    }, 10000);
  });

  document.addEventListener('click', (e) => {
    if (!canvas.contains(e.target as Node) && this.controls.isLocked) {
      this.controls.unlock();
    }
  });

  // ✅ Grid Helper
  this.gridHelper = new THREE.GridHelper(10, 10);
  this.scene.add(this.gridHelper);
  this.gridHelper.visible = this.showGrid;

  // ✅ Stereo VR effect
  this.stereoEffect = new StereoEffect(this.renderer);
  this.stereoEffect.setSize(window.innerWidth, window.innerHeight);

  // ✅ VR auto-toggle on mobile orientation
  window.addEventListener('orientationchange', () => {
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape && !this.isVRMode) {
      this.enterVR();
    } else if (!isLandscape && this.isVRMode) {
      this.exitVR();
    }
  });

  // ✅ VR exit on back navigation
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

private setUploadedModel(model: THREE.Object3D): void {
  this.uploadedModel = model;
  this.modelScale = model.scale.x; // Sync GUI with actual values
  this.modelHeight = model.position.y;
}

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

//************* Loading Models ******************* */

public triggerSceneUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) this.uploadSceneFromFile(file);
    };
    input.click();
  }

public loadGLB(file: File): void {
  const loader = new GLTFLoader();
  const reader = new FileReader();

  reader.onload = () => {
    try {
      loader.parse(reader.result as ArrayBuffer, '', (gltf) => {
        const model = gltf.scene;

        // Set metadata
        model.userData['isLoadedModel'] = true;
        model.userData['fileName'] = file.name;
        model.userData['file'] = file;

        // Add model to the scene
        model.scale.setScalar(this.modelScale);
        model.position.y = this.modelHeight;
        this.scene.add(model);

        // ✅ Track this as the active model for GUI control
        this.setUploadedModel(model);

        // Mark scene state and persist it
        this.sceneLoaded = true;

        // Auto Save - TBA NOT FUNCTIONAL YET

      });
    } catch {
      alert(this.translate.instant('ERRORS.MODEL_LOAD_ERROR_ALERT'));
    }
  };

  reader.onerror = () => {
    alert(this.translate.instant('ERRORS.FILE_READ_FAIL_ALERT'));
  };

  reader.readAsArrayBuffer(file);
}

uploadSceneFromFile(file: File): void {
  const reader = new FileReader();
  reader.onload = async (event: ProgressEvent<FileReader>) => {
    this.clearScene(); // ✅ Clear previous scene fully

    const contents = event.target?.result as string;
    const sceneData: SceneData = JSON.parse(contents);

    // --- Restore lighting ---
    if (sceneData.lighting) {
      if (sceneData.lighting.ambient) {
        this.ambientLight.color.setHex(sceneData.lighting.ambient.color);
        this.ambientLight.intensity = sceneData.lighting.ambient.intensity;
      }
      if (sceneData.lighting.directional) {
        this.dirLight.color.setHex(sceneData.lighting.directional.color);
        this.dirLight.intensity = sceneData.lighting.directional.intensity;
        this.dirLight.position.fromArray(sceneData.lighting.directional.position);
      }
    }

    // --- Restore camera ---
    if (sceneData.camera) {
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
    }

    // --- Restore models ---
    for (const model of sceneData.models) {
      const gltfLoader = new GLTFLoader();
      const glbBinary = atob(model.glbBase64 ?? '');
      const binaryArray = new Uint8Array(glbBinary.length);
      for (let i = 0; i < glbBinary.length; i++) {
        binaryArray[i] = glbBinary.charCodeAt(i);
      }

      const blob = new Blob([binaryArray], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);

      try {
        const gltf = await gltfLoader.loadAsync(url);
        const loadedModel = gltf.scene;

        loadedModel.name = model.name;
        loadedModel.position.copy(model.position);
        loadedModel.rotation.set(
          model.rotation.x,
          model.rotation.y,
          model.rotation.z
        );
        loadedModel.scale.copy(model.scale);
        loadedModel.userData['fileName'] = model.fileName;
        loadedModel.userData['isLoadedModel'] = true;

        this.objects = []; // Clear before restoring
        loadedModel.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            // Taking out the colliding physics for now
            child.userData['collidable'] = false;
            this.objects.push(child); // Add only once
          }
        });

        this.uploadedModel = loadedModel;
        this.applyModelTransform();
        this.scene.add(loadedModel);
        this.saveSceneToLocalStorage();

        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(this.translate.instant('ERRORS.FAILED_LOAD_MODEL', { fileName: model.fileName }), error);
      }
    }
    this.sceneLoaded = true;
  };

  reader.readAsText(file);
  }

private loadSceneFromLocalStorage(): void {

  const raw = localStorage.getItem('autosavedScene');
  if (!raw) {
     console.warn(this.translate.instant('ERRORS.NO_AUTOSAVED_SCENE'));
    return;
  }

  try {
    const sceneData = JSON.parse(raw);

    this.clearScene();

    // Restore camera
    if (sceneData.camera) {
      const { position, rotation } = sceneData.camera;
      this.camera.position.set(position.x, position.y, position.z);
      this.camera.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    // Restore lighting
    if (sceneData.lighting) {
      const { ambient, directional } = sceneData.lighting;
      if (ambient) {
        this.ambientLight.color.setHex(ambient.color);
        this.ambientLight.intensity = ambient.intensity;
      }
      if (directional) {
        this.dirLight.color.setHex(directional.color);
        this.dirLight.intensity = directional.intensity;
        this.dirLight.position.set(
          directional.position.x,
          directional.position.y,
          directional.position.z
        );
      }
    }

    // Load models from base64 glb
    if (sceneData.models && Array.isArray(sceneData.models)) {
      const loader = new GLTFLoader();

      sceneData.models.forEach((modelData: any) => {
        if (!modelData.glbBase64) {
          console.warn(this.translate.instant('ERRORS.MODEL_MISSING_BASE64', { modelName: modelData.name }));
          return;
        }

        // Decode base64 to ArrayBuffer
        const binaryString = atob(modelData.glbBase64);
        const len = binaryString.length;
        const arrayBuffer = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          arrayBuffer[i] = binaryString.charCodeAt(i);
        }

        loader.parse(arrayBuffer.buffer, '', (gltf) => {
          const model = gltf.scene;
          model.name = modelData.name || 'Loaded Model';
          model.position.set(modelData.position.x, modelData.position.y, modelData.position.z);
          model.rotation.set(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z);
          model.scale.set(modelData.scale.x, modelData.scale.y, modelData.scale.z);

          model.userData['isLoadedModel'] = true;
          model.userData['fileName'] = modelData.fileName || 'unknown.glb';

          this.scene.add(model);
          this.objects.push(model);
        }, (error) => {
          console.error(this.translate.instant('ERRORS.MODEL_LOAD_BASE64_ERROR'), error);
        });
      });
    }

    console.log(this.translate.instant('MESSAGES.SCENE_LOADED_LOCALSTORAGE'));
  } catch (err) {
     console.error(this.translate.instant('ERRORS.SCENE_LOAD_LOCALSTORAGE_ERROR'), err);
  }
}

//************* Save/Clear Scene ******************* */

//Exporting your scene
saveScene(): void {
  const sceneData: SceneData = {
    models: [],
    camera: {
      position: this.camera.position.clone(),
      rotation: {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y,
        z: this.camera.rotation.z
      }
    },
    lighting: {
      ambient: {
        color: this.ambientLight.color.getHex(),
        intensity: this.ambientLight.intensity,
      },
      directional: {
        color: this.dirLight.color.getHex(),
        intensity: this.dirLight.intensity,
        position: this.dirLight.position.toArray(),
      },
    },
  };

  const gltfExporter = new GLTFExporter();
  const objectsToExport = this.scene.children.filter(
    (obj) => obj.userData?.['isLoadedModel']
  );

  const exportNextModel = (index: number) => {
    if (index >= objectsToExport.length) {
      // All models processed, save the final scene JSON
      const blob = new Blob([JSON.stringify(sceneData)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'scene.json';
      link.click();
      URL.revokeObjectURL(url);

      this.snackBar.open(this.translate.instant('MESSAGES.SCENE_EXPORTED'), 'OK', { duration: 3000 });
      console.log(this.translate.instant('MESSAGES.SCENE_EXPORT_COMPLETE'));
      return;
    }

    const obj = objectsToExport[index];

    gltfExporter.parse(
      obj,
      (gltf) => {
        let glbBlob: Blob;

        if (gltf instanceof ArrayBuffer) {
          glbBlob = new Blob([gltf], { type: 'model/gltf-binary' });
        } else {
          glbBlob = new Blob([JSON.stringify(gltf)], { type: 'application/json' });
        }

        const reader = new FileReader();
        reader.onload = () => {
          const binary = new Uint8Array(reader.result as ArrayBuffer);
          let binaryString = '';
          for (let i = 0; i < binary.byteLength; i++) {
            binaryString += String.fromCharCode(binary[i]);
          }
          const base64 = btoa(binaryString);

          sceneData.models.push({
            name: obj.name || 'Unnamed',
            position: obj.position.clone(),
            rotation: {
              x: obj.rotation.x,
              y: obj.rotation.y,
              z: obj.rotation.z,
            },
            scale: obj.scale.clone(),
            fileName: obj.userData['fileName'] || 'unknown.glb',
            glbBase64: base64,
          });

          exportNextModel(index + 1);
        };

        reader.readAsArrayBuffer(glbBlob);
      },

(error) => {
  console.error(this.translate.instant('ERRORS.MODEL_EXPORT_ERROR'), error);
  exportNextModel(index + 1); // Skip and continue with next model
},
{ binary: true }
);
console.log(this.translate.instant('MESSAGES.SCENE_EXPORT_STARTED'));
exportNextModel(0);
}}

//autosave
private saveSceneToLocalStorage(): void {
  try {
    const models = this.scene.children
      .filter(obj => obj.userData?.['isLoadedModel'])
      .map((obj) => ({
        name: obj.name || '',
        position: {
          x: obj.position.x,
          y: obj.position.y,
          z: obj.position.z,
        },
        rotation: {
          x: obj.rotation.x,
          y: obj.rotation.y,
          z: obj.rotation.z,
        },
        scale: {
          x: obj.scale.x,
          y: obj.scale.y,
          z: obj.scale.z,
        },
        fileName: obj.userData['fileName'] || 'unknown.glb',
      }));

    const sceneData = {
      models,
      camera: {
        position: {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z,
        },
        rotation: {
          x: this.camera.rotation.x,
          y: this.camera.rotation.y,
          z: this.camera.rotation.z,
        }
      },
      lighting: {
        ambient: {
          color: this.ambientLight.color.getHex(),
          intensity: this.ambientLight.intensity,
        },
        directional: {
          color: this.dirLight.color.getHex(),
          intensity: this.dirLight.intensity,
          position: {
            x: this.dirLight.position.x,
            y: this.dirLight.position.y,
            z: this.dirLight.position.z,
          }
        }
      }
    };

// ******************************************************************************************

// 9 of 20

    localStorage.setItem('autosavedScene', JSON.stringify(sceneData));
  } catch (err) {
    console.error(this.translate.instant('ERRORS.SCENE_SAVE_LOCALSTORAGE_ERROR'), err);
  }
}

private isColliding(position: THREE.Vector3): boolean {
  // Player height and half-height for collision box center calculation
  const playerHeight = 1.6;
  const playerHalfHeight = playerHeight / 2;

  // Create collision box centered at player's current position adjusted vertically
  const playerBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position.x, position.y - playerHalfHeight, position.z),
    new THREE.Vector3(0.5, playerHeight, 0.5)
  );

  // Check collisions with all scene objects
  for (const obj of this.objects) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.intersectsBox(playerBox)) return true;
  }

  return false;
}

clearScene(): void {
  // Dispose of existing background if it's a texture
  if (this.scene.background instanceof THREE.Texture) {
    this.scene.background.dispose?.();
    this.scene.background = null;
  }

  // Remove all previously loaded models
  const toRemove = this.scene.children.filter((obj: THREE.Object3D) => obj.userData?.['isLoadedModel']);
  toRemove.forEach(obj => {
    this.scene.remove(obj);
    obj.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Dispose geometry
        mesh.geometry?.dispose?.();

        // Dispose materials and textures
        const disposeMaterial = (material: THREE.Material | undefined) => {
          if (!material) return;

          const mat = material as any;
          ['map', 'lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 'normalMap', 'displacementMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'envMap']
            .forEach((prop) => {
              if (mat[prop]?.dispose) mat[prop].dispose();
            });

          material.dispose?.();
        };

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(mesh.material);
        }
      }
    });
  });

  // Clear interaction objects
  this.objects = [];

  // Reset camera position/rotation
  this.camera.position.set(0, 0, 5);
  this.camera.rotation.set(0, 0, 0);
}

resetView(): void {
    // Implement your reset logic here (e.g., reset camera position)
    this.camera.position.set(0, this.cameraHeight, 10);
    this.camera.lookAt(0, this.cameraHeight, 0);
    this.controls.unlock();  // Or however you want to reset controls
    this.snackBar.open(this.translate.instant('MESSAGES.VIEW_RESET'), 'OK', { duration: 2000 });
  }

// Toggles wireframe mode on loaded models
toggleWireframe(): void {
  if (!this.uploadedModel) return;

  this.uploadedModel.traverse((child: any) => {
    if (child.isMesh) {
      child.material.wireframe = !child.material.wireframe;
    }
  });

  this.snackBar.open(this.translate.instant('MESSAGES.WIREFRAME_TOGGLED'), 'OK', { duration: 2000 });
}

// Clears the loaded model(s)
clearModel(): void {
  if (this.uploadedModel) {
    this.scene.remove(this.uploadedModel);
    this.uploadedModel = null;
    this.snackBar.open(this.translate.instant('MESSAGES.MODEL_CLEARED'), 'OK', { duration: 2000 });
  }
}

//************* Animation/ Controller Pad and Keys ******************* */

private animate = () => {
  this.animationId = requestAnimationFrame(this.animate);
  const delta = this.clock.getDelta();

  this.vrHelper.update(); // Update joystick

this.movementHelper.applyFriction(delta, 5.0);
this.movementHelper.updateKeyboardMovement(delta, this.speed); // Only updates velocity.y (gravity/jump)

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


  // Optional: Apply look-around based on orientation (disabled for now)
  // this.vrHelper.applyRotation(this.camera, 0.3);

  this.renderer.render(this.scene, this.camera);

  console.log('Facing quaternion:', this.controls.getObject().quaternion);
  console.log('Joystick Movement:', this.vrHelper.movementVector);
};

private onKeyDown = (event: KeyboardEvent) => {
  this.movementHelper.onKeyDown(event.code);
};

private onKeyUp = (event: KeyboardEvent) => {
  this.movementHelper.onKeyUp(event.code);
};


//************* Screen Sizing ******************* */

private resizeListener = () => {
  const container = this.containerRef.nativeElement;
  this.camera.aspect = container.clientWidth / container.clientHeight;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(container.clientWidth, container.clientHeight);
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

  // ✅ Ensure stereo effect resizes in VR
  if (this.isVRMode && this.stereoEffect) {
    this.stereoEffect.setSize(w, h);
  }
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

  // Try fullscreen on container (priority)
  const requestFullscreen = container.requestFullscreen
    || (container as any).webkitRequestFullscreen
    || (container as any).msRequestFullscreen;

  if (requestFullscreen) {
    requestFullscreen.call(container).catch((err: any) => {
      console.warn(this.translate.instant('ERRORS.FULLSCREEN_FAILED'), err);
    });
  }

  // Orientation lock (Android Chrome only)
  try {
    (screen.orientation as any)?.lock?.('landscape').catch((err: any) => {
      console.warn(this.translate.instant('ERRORS.ORIENTATION_LOCK_FAILED'), err);
    });
  } catch (err) {
    console.warn(this.translate.instant('ERRORS.ORIENTATION_LOCK_UNAVAILABLE'), err);
  }

  // Save original size/aspect
  this.originalSize = {
    width: container.clientWidth,
    height: container.clientHeight,
  };
  this.originalCameraAspect = this.camera.aspect;

  // Set up stereo effect for split-view
  if (!this.stereoEffect) {
    this.stereoEffect = new StereoEffect(this.renderer);
  }
  this.stereoEffect.setSize(container.clientWidth, container.clientHeight);

  // Start VR render loop
  this.renderer.setAnimationLoop(() => this.renderVR());

  // Push to history stack so back button exits
  history.pushState({ vr: true }, '');

  // Handle popstate/back-button
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

  // Restore browser history
  if (history.state?.vr) {
    history.back();
  }

  // Reset onpopstate handler
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

//************* User Friendly UI Buttons ******************* */

setTransformMode(mode: 'translate' | 'rotate' | 'scale'): void {
  this.selectedTool = mode;
  if (this.transformControls) {
    this.transformControls.setMode(mode);
    const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
    this.snackBar.open(this.translate.instant(`MESSAGES.${modeName.toUpperCase()}_MODE_ACTIVATED`), 'OK', { duration: 2000 });
  }
}

onAddModel(): void {
  this.snackBar.open(this.translate.instant('MESSAGES.CLICK_PLACE_MODEL'), 'OK', { duration: 3000 });
  this.enterModelPlacementMode();
}

onToggleGrid(): void {
  this.showGrid = !this.showGrid;
  this.gridHelper.visible = this.showGrid;
  const msgKey = this.showGrid ? 'MESSAGES.GRID_SHOWN' : 'MESSAGES.GRID_HIDDEN';
  this.snackBar.open(this.translate.instant(msgKey), 'OK', { duration: 2000 });
}

onClearScene(): void {
  const confirmClear = confirm(this.translate.instant('MESSAGES.SCENE_CLEARED_CONFIRM'));
  if (!confirmClear) return;

  this.scene.children
    .filter(obj => obj.userData?.['isLoadedModel'])
    .forEach(obj => {
      this.scene.remove(obj);
    });

  this.snackBar.open(this.translate.instant('MESSAGES.SCENE_CLEARED'), 'OK', { duration: 2000 });
}

toggleRoomLight() {
  this.ambientLight.intensity = this.ambientLight.intensity > 0 ? 0 : 0.5;
}

toggleLightcolor() {
  const colors = [0xffffff, 0xffcc00, 0x00ccff, 0xff66cc];
  const current = this.ambientLight.color.getHex();
  const next = colors[(colors.indexOf(current) + 1) % colors.length];
  this.ambientLight.color.setHex(next);
}

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

  // Clamp the value between minHeight and maxHeight
  this.cameraHeight = Math.max(minHeight, Math.min(value, maxHeight));

  // Apply new height to camera position
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

save(): void {
  this.saveScene?.();
}

load(): void {
  this.triggerSceneUpload?.();
}

}

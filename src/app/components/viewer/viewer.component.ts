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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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
    MatSnackBarModule,],

  template: `<div #canvasContainer class="viewer-container"></div>`,
})

export class ViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild(ViewerComponent) viewerComponent!: ViewerComponent;


  @Input() glbFile?: File;

  constructor(private snackBar: MatSnackBar) {}

  //
  //
  sunlight = 1;
  movementSpeed = 50;
  modelSize = 30;
  //
  //

  private stereoEffect!: StereoEffect;
  public isVRMode = false;

  private originalSize?: { width: number; height: number };
  private originalCameraAspect?: number;
  //private originalSetAnimationLoop?: typeof THREE.WebGLRenderer.prototype.setAnimationLoop;
  private controls!: PointerLockControls;
  private originalSetAnimationLoop: any;

  modelScale = 1;
  modelHeight = 0;
  uploadedModel: THREE.Object3D | null = null;


  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private canJump = false;
  private gravity = 9.8;
  private jumpStrength = 5;

  ambientIntensity = 0.5;
  speed = 50;
  cameraHeight = 2;

  // State flags
  showGrid = true;
  isPlacingModel = false;


  // References
  gridHelper!: THREE.GridHelper;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  //private controls!: PointerLockControls;
  private clock = new THREE.Clock();
  private objects: THREE.Object3D[] = [];
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;
  private gui!: GUI;
  private sceneLoaded = false;
  transformControls!: TransformControls;

  //private controls!: PointerLockControls | OrbitControls;
  private isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  selectedTool = '';

  private keysPressed = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

ngOnInit() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    this.loadSceneFromLocalStorage();
    this.canJump = true;
    //this.initThree();
  }

ngOnDestroy() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resizeListener);
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

    if (this.glbFile) this.loadGLB(this.glbFile);
    this.animate();

    if (!this.renderer) {
      console.warn('Renderer not available — possibly failed to create WebGL context');
      return;
    }


    this.renderer.domElement.addEventListener('dragover', (event) => {
    event.preventDefault();
    });

    this.renderer.domElement.addEventListener('drop', (event) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.glb')) {
        if (this.sceneLoaded && !confirm('Replace current scene with new model?')) return;
        this.clearScene();
        this.loadGLB(file);
      }
    });

    this.renderer.domElement.addEventListener('click', (event) => {
      const mouse = new THREE.Vector2();
      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        const selected = intersects[0].object;
        console.log('Selected object:', selected.name || selected.uuid);
        // Optional: highlight or transform
      }
    });

    const canvas = this.renderer.domElement;

  // Click inside to start walking (existing logic)
  const instructions = document.createElement('div');
  this.containerRef.nativeElement.appendChild(instructions);

  canvas.addEventListener('click', () => {
    this.controls.lock();
    // if (instructions.parentNode) {
    //   instructions.parentNode.removeChild(instructions);
    // }

    // 👶 Automatically unlock after 10 seconds
    setTimeout(() => {
      if (this.controls.isLocked) {
        this.controls.unlock();
      }
    }, 1000);
  });

  // 👆 Click *outside* canvas to unlock
  document.addEventListener('click', (e) => {
    if (!canvas.contains(e.target as Node) && this.controls.isLocked) {
      this.controls.unlock();
    }
  });

    this.gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(this.gridHelper);
    this.gridHelper.visible = this.showGrid;

    // Auto save TBA NOT FUNCTIONAL YET

  // VR Integration
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
    console.error('WebGLRenderer creation failed:', e);
    alert('WebGL could not initialize. Try restarting your browser or switching to Chrome.');
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
  instructions.innerText = 'Click to start walking!';
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

        // Traverse the model and set collidable properties
        // model.traverse((child) => {
        //   if ((child as THREE.Mesh).isMesh) {
        //     (child as THREE.Mesh).geometry.computeBoundingBox();
        //     this.objects.push(child);
        //     child.userData['collidable'] = true;
        //   }
        // });

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
      alert('❌ Error loading model. Please try again with a proper GLB format.');
    }
  };

  reader.onerror = () => {
    alert('❌ Failed to read file. Please try again.');
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
        console.error(`Failed to load model: ${model.fileName}`, error);
      }
    }

    this.sceneLoaded = true;
  };

  reader.readAsText(file);
  }

private loadSceneFromLocalStorage(): void {

  const raw = localStorage.getItem('autosavedScene');
  if (!raw) {
    console.warn('No autosaved scene found in localStorage.');
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
          console.warn(`Model ${modelData.name} missing base64 data`);
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
          console.error('Error loading model from base64:', error);
        });
      });
    }

    console.log('Scene loaded from localStorage with base64 models.');
  } catch (err) {
    console.error('Failed to load scene from localStorage:', err);
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

      this.snackBar.open('Scene exported successfully!', 'OK', { duration: 3000 });
      console.log('Scene export complete.');
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
        console.error('Error exporting model', error);
        exportNextModel(index + 1); // Skip and continue with next model
      },
      { binary: true }
    );
  };

  console.log('Scene export started...');
  exportNextModel(0);
}

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

    localStorage.setItem('autosavedScene', JSON.stringify(sceneData));
  } catch (err) {
    console.error('Failed to save scene to localStorage:', err);
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

// ************************************************************************
// Need to update to current camera view straight ahead. NOT the floor!
// Resets camera or scene view
resetView(): void {
  // Implement your reset logic here (e.g., reset camera position)
  this.camera.position.set(0, this.cameraHeight, 0);
  this.camera.lookAt(0, 0, 0);
  this.controls.unlock();  // Or however you want to reset controls
  this.snackBar.open('View reset!', 'OK', { duration: 2000 });
}
// ************************************************************************

// Toggles wireframe mode on loaded models
toggleWireframe(): void {
  if (!this.uploadedModel) return;

  this.uploadedModel.traverse((child: any) => {
    if (child.isMesh) {
      child.material.wireframe = !child.material.wireframe;
    }
  });
  this.snackBar.open('Wireframe toggled!', 'OK', { duration: 2000 });
}

// Clears the loaded model(s)
clearModel(): void {
  if (this.uploadedModel) {
    this.scene.remove(this.uploadedModel);
    this.uploadedModel = null;
    this.snackBar.open('Model cleared!', 'OK', { duration: 2000 });
  }
}

//************* Animation/ WSAD Keys ******************* */

private animate = () => {
  requestAnimationFrame(this.animate);

  const delta = this.clock.getDelta();

  // Friction (XZ plane)
  const friction = 5.0;
  this.velocity.x -= this.velocity.x * friction * delta;
  this.velocity.z -= this.velocity.z * friction * delta;

  // Reset direction
  this.direction.set(0, 0, 0);

  // ✅ REVERSED: Z is flipped
  if (this.keysPressed.forward) this.direction.z += 1;   // forward = +Z
  if (this.keysPressed.backward) this.direction.z -= 1;  // backward = -Z
  if (this.keysPressed.left) this.direction.x -= 1;      // left = -X
  if (this.keysPressed.right) this.direction.x += 1;     // right = +X

  this.direction.normalize();

  // Apply movement
  if (this.direction.length() > 0) {
    this.velocity.x += this.direction.x * this.speed * delta;
    this.velocity.z += this.direction.z * this.speed * delta;
  }

  const moveX = this.velocity.x * delta;
  const moveZ = this.velocity.z * delta;

  const playerObj = this.controls.object;
  const oldX = playerObj.position.x;
  const oldZ = playerObj.position.z;

  // Try move right/left (X)
  this.controls.moveRight(moveX);
  if (this.isColliding(playerObj.position)) {
    playerObj.position.x = oldX; // only undo X movement
  }

  // Try move forward/backward (Z)
  this.controls.moveForward(moveZ);
  if (this.isColliding(playerObj.position)) {
    playerObj.position.z = oldZ; // only undo Z movement
  }

  // Gravity
  this.velocity.y -= this.gravity * delta;

  // Prevent falling below ground level
  const minY = this.cameraHeight;
  this.controls.object.position.y += this.velocity.y * delta;
  if (this.controls.object.position.y < minY) {
    this.velocity.y = 0;
    this.controls.object.position.y = minY;
    this.canJump = true;
  }

  this.renderer.render(this.scene, this.camera);
};


private onKeyDown = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      this.keysPressed.forward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      this.keysPressed.left = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      this.keysPressed.backward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      this.keysPressed.right = true;
      break;
    case 'Space':
      if (this.canJump) {
        this.velocity.y = this.jumpStrength;
        this.canJump = false;
      }
      break;
  }
};

private onKeyUp = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      this.keysPressed.forward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      this.keysPressed.left = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      this.keysPressed.backward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      this.keysPressed.right = false;
      break;
  }
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

  // ✅ Attach resize only once
  window.removeEventListener('resize', this.resizeListener);
  window.addEventListener('resize', this.resizeListener);
}


//************* VR Integration ******************* */

public enterVR(): void {
  if (!/Mobi|Android/i.test(navigator.userAgent)) {
    this.snackBar.open('VR mode is only available on mobile devices.', 'OK', { duration: 3000 });
    return;
  }

  if (!confirm('Enter VR mode? Place your phone into a viewer like Google Cardboard.')) {
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
      console.warn('Fullscreen failed:', err);
    });
  }

  // Orientation lock (Android Chrome only)
  try {
    (screen.orientation as any)?.lock?.('landscape').catch((err: any) => {
      console.warn('Orientation lock failed:', err);
    });
  } catch (err) {
    console.warn('Orientation lock not available:', err);
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
        console.warn('Exit fullscreen failed', err);
      });
    }
    (screen.orientation as any)?.unlock?.();
  } catch (e) {
    console.warn('Unlock orientation failed', e);
  }

  if (this.renderer && this.camera && this.originalSize) {
    this.camera.aspect = this.originalCameraAspect ?? window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.originalSize.width, this.originalSize.height);
  }

  this.controls.enabled = true;
  this.snackBar.open('Exited VR mode.', 'OK', { duration: 2000 });

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
    this.snackBar.open('Model placement mode active. Click to place.', 'OK', { duration: 3000 });
  }

//************* User Friendly UI Buttons ******************* */

setTransformMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.selectedTool = mode;
    if (this.transformControls) {
      this.transformControls.setMode(mode);
      this.snackBar.open(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode activated`, 'OK', {
        duration: 2000,
      });
    }
  }

onAddModel(): void {
  this.snackBar.open('Click anywhere to place a model!', 'OK', { duration: 3000 });
  this.enterModelPlacementMode();
}

onToggleGrid(): void {
  this.showGrid = !this.showGrid;
  this.gridHelper.visible = this.showGrid;
  this.snackBar.open(`Grid ${this.showGrid ? 'shown' : 'hidden'}`, 'OK', { duration: 2000 });
}

onClearScene(): void {
  const confirmClear = confirm('Are you sure you want to remove all models?');
  if (!confirmClear) return;

  this.scene.children
    .filter(obj => obj.userData?.['isLoadedModel'])
    .forEach(obj => {
      this.scene.remove(obj);
    });

  this.snackBar.open('Scene cleared!', 'OK', { duration: 2000 });
}

// ********************************
// ** NEW Fun Controls **

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
// ********************************

}

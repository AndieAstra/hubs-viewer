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
  imports: [],
  template: `<div #canvasContainer class="viewer-container"></div>`,
  styleUrls: ['./viewer.component.scss'],
})
export class ViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @Input() glbFile?: File;

  modelScale = 1;
  modelHeight = 0;
  uploadedModel: THREE.Object3D | null = null;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: PointerLockControls;
  private clock = new THREE.Clock();
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private objects: THREE.Object3D[] = [];
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;
  private gui!: GUI;
  public speed = 5.0;
  public cameraHeight = 1.6;
  private sceneLoaded = false;

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
  }

ngOnDestroy() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }

ngOnChanges(changes: SimpleChanges) {
    if (changes['glbFile'] && changes['glbFile'].currentValue) {
      if (this.sceneLoaded) {
        const confirmReplace = confirm('A scene is already loaded. Do you want to replace it with a new model?');
        if (!confirmReplace) return;
        this.clearScene();
      }
      this.loadGLB(changes['glbFile'].currentValue);
    } else if (!this.glbFile && !this.sceneLoaded) {
      alert('⚠️ No model file loaded or scene is empty. Please load a valid GLB model.');
    }
  }

ngAfterViewInit() {
    this.initScene();
    if (this.glbFile) this.loadGLB(this.glbFile);
    this.animate();

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

    // Auto save TBA NOT FUNCTIONAL YET

    // const saved = localStorage.getItem('autosavedScene');
    // if (saved) {
    //   const confirmRestore = confirm('🕘 Restore previously saved scene?');
    //   if (confirmRestore) {
    //     this.uploadSceneFromFile(new File([saved], 'autosavedScene.json', { type: 'application/json' }));
    //   }
    // }

  }

  //********* UI Controls for the ThreeJS Scene *********/

private initScene() {
    const container = this.containerRef.nativeElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, this.cameraHeight, 0);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    this.dirLight.position.set(5, 10, 7.5);
    this.scene.add(this.dirLight);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());

    this.gui = new GUI();
    const lightFolder = this.gui.addFolder('Lights');
    lightFolder.addColor({ ambientColor: this.ambientLight.color.getHex() }, 'ambientColor')
      .name('Ambient')
      .onChange((v: any) => this.ambientLight.color.setHex(Number(v)));
    lightFolder.add(this.ambientLight, 'intensity', 0, 2, 0.01).name('Ambient Intensity');
    lightFolder.addColor({ directionalColor: this.dirLight.color.getHex() }, 'directionalColor')
      .name('Directional')
      .onChange((v: any) => this.dirLight.color.setHex(Number(v)));
    lightFolder.add(this.dirLight, 'intensity', 0, 2, 0.01).name('Directional Intensity');
    lightFolder.open();

    const movementFolder = this.gui.addFolder('Movement');
    movementFolder.add(this, 'speed', 0.1, 20, 0.1).name('Walk Speed');
    movementFolder.add(this, 'cameraHeight', 0.1, 5, 0.01).name('Camera Height');
    movementFolder.open();

    const fileFolder = this.gui.addFolder('Scene');
    fileFolder.add({ export: () => this.saveScene() }, 'export').name('💾⬇️ Download Scene');
    fileFolder.add({ import: () => this.triggerSceneUpload() }, 'import').name('📂⬆️ Upload Scene');

    container.addEventListener('click', () => this.controls.lock());

    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData['collidable'] = true;
    this.scene.add(floor);
    this.objects.push(floor);

    const modelFolder = this.gui.addFolder('Model Controls');
    modelFolder.add(this, 'modelScale', 0.1, 5, 0.1)
      .name('Model Scale')
      .onChange(() => this.updateModelTransform());
    modelFolder.add(this, 'modelHeight', -10, 10, 0.1)
      .name('Model Height')
      .onChange(() => this.updateModelTransform());
    modelFolder.open();

    const gridHelper = new THREE.GridHelper(200, 200, 0x888888, 0x444444);
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

//************* Loading Models ******************* */

private triggerSceneUpload() {
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

private loadGLB(file: File): void {
  const loader = new GLTFLoader();
  const reader = new FileReader();

  reader.onload = () => {
    try {
      loader.parse(reader.result as ArrayBuffer, '', (gltf) => {
        const model = gltf.scene;

        // Traverse the model and set collidable properties
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).geometry.computeBoundingBox();
            this.objects.push(child);
            child.userData['collidable'] = true;
          }
        });

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
        //this.saveSceneToLocalStorage();
        //setInterval(() => this.saveSceneToLocalStorage(), 30000); // every 30s


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

        loadedModel.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            child.userData['collidable'] = true;
            this.objects.push(child);
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
      const blob = new Blob([JSON.stringify(sceneData)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'scene.json';
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const obj = objectsToExport[index];
    gltfExporter.parse(
      obj,
      (gltf) => {
        // gltf can be ArrayBuffer (binary .glb) or JSON object (text .gltf)
        // We expect binary export, but to be safe, handle both:
        let glbBlob: Blob;

        if (gltf instanceof ArrayBuffer) {
          glbBlob = new Blob([gltf], { type: 'model/gltf-binary' });
        } else {
          // JSON export fallback
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
      },
      { binary: true }
    );
  };

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
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      position.clone().setY(0.5),
      new THREE.Vector3(0.5, 1.6, 0.5)
    );
    for (const obj of this.objects) {
      const box = new THREE.Box3().setFromObject(obj);
      if (box.intersectsBox(playerBox)) return true;
    }
    return false;
  }

clearScene(): void {
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

          const mat = material as any; // for accessing optional maps
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

  // Optional: reset camera position/rotation
  this.camera.position.set(0, 0, 5);
  this.camera.rotation.set(0, 0, 0);
}

//************* Animation/ WSAD Keys ******************* */

private animate = () => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.direction.z = Number(this.keysPressed.forward) - Number(this.keysPressed.backward);
    this.direction.x = Number(this.keysPressed.right) - Number(this.keysPressed.left);
    this.direction.normalize();
    if (this.keysPressed.forward || this.keysPressed.backward)
      this.velocity.z -= this.direction.z * this.speed * delta;
    if (this.keysPressed.left || this.keysPressed.right)
      this.velocity.x -= this.direction.x * this.speed * delta;
    const moveX = -this.velocity.x * delta;
    const moveZ = -this.velocity.z * delta;
    const oldPosition = this.controls.getObject().position.clone();
    this.controls.moveRight(moveX);
    if (this.isColliding(this.controls.getObject().position)) {
      this.controls.getObject().position.x = oldPosition.x;
    }
    this.controls.moveForward(moveZ);
    if (this.isColliding(this.controls.getObject().position)) {
      this.controls.getObject().position.z = oldPosition.z;
    }
    this.camera.position.y = this.cameraHeight;
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
}

import { ChangeDetectorRef, Injectable } from '@angular/core';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

import { SceneData, ViewerComponent } from '../components/viewer/viewer.component';
import { TranslateService } from '@ngx-translate/core';

const STORAGE_KEY = 'lumion_project_data';
const EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface ProjectData {
  timestamp: number;
  scene?: SceneData;
  lights: { color: string; intensity: number }[];
  notes: string[];
  modelBase64?: string;
}


@Injectable({
  providedIn: 'root',
})

export class StorageService {
  private readonly expiration = EXPIRATION_MS;

  public viewerRef!: ViewerComponent;

  public consoleMessages: string[] = [];

  private cdRef?: ChangeDetectorRef;

  private _pendingJsonFile?: File;

  constructor(private translate: TranslateService) {}


// ---- Load Model ----

  loadProject(
      fileOrSceneData?:
        | File
        | {
            scene: THREE.Scene;
            camera: THREE.Camera;
            ambient: THREE.Light;
            directional: THREE.Light;
            onModelsLoaded: (m: THREE.Object3D[]) => void;
            onError?: (e: any) => void;
          }
    ): boolean {

      if (!fileOrSceneData) {
        return this._loadFromStorage() !== null;
      }

      if (fileOrSceneData instanceof File) {
        const file = fileOrSceneData;
        const ext  = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'glb' || ext === 'gltf') {
          this._loadGLTF(file, this.viewerRef, (msg: string) => this.logToConsole(msg));
          return true;
        }

        if (ext === 'json') {
          this._pendingJsonFile = file;
          return true;
        }

        console.warn('Unsupported file type:', ext);
        return false;
      }
      //----
      if (this._pendingJsonFile) {
        this._loadJsonScene(
          this._pendingJsonFile,
          fileOrSceneData.scene,
          fileOrSceneData.camera,
          fileOrSceneData.ambient,
          fileOrSceneData.directional,
          fileOrSceneData.onModelsLoaded,
          fileOrSceneData.onError
        );
        this._pendingJsonFile = undefined;
        return true;
      }

      console.warn('loadProject was called with unrecognised arguments.');
      return false;
    }

  private _loadFromStorage(): ProjectData | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw) as ProjectData;
      if (Date.now() - data.timestamp > this.expiration) {
        this.clear();
        return null;
      }
      return data;
    } catch {
      this.clear();
      return null;
    }
  }

  private _loadGLTF(file: File, viewerRef: ViewerComponent, log?: (m: string) => void): void {
    // re‑use your existing GLB implementation so nothing breaks
    this.loadGLB(file);
    log?.(`File loaded: ${file.name}`);
  }

  private _loadJsonScene(
    file: File,
    scene: THREE.Scene,
    camera: THREE.Camera,
    ambientLight: THREE.Light,
    dirLight: THREE.Light,
    onModelsLoaded: (models: THREE.Object3D[]) => void,
    onError?: (err: any) => void
  ): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sceneData = JSON.parse(reader.result as string);
        this._loadSceneFromJson(sceneData, scene, camera, ambientLight, dirLight, onModelsLoaded, onError);
      } catch (err) {
        console.error('Invalid JSON file:', err);
        onError?.(err);
      }
    };
    reader.readAsText(file);
  }

  private _loadSceneFromJson(
    sceneData: any,
    scene: THREE.Scene,
    camera: THREE.Camera,
    ambientLight: THREE.Light,
    dirLight: THREE.Light,
    onModelsLoaded: (models: THREE.Object3D[]) => void,
    onError?: (err: any) => void
  ): void {
    try {
      // ------- VALIDATE DATA
      if (!sceneData.camera) throw new Error("Scene data is missing 'camera' property.");
      this.clearScene(scene);

      // ------- RESTORE CAMERA
      const { position, rotation } = sceneData.camera;
      if (!position || !rotation) throw new Error("Camera position or rotation is missing in scene data.");
      camera.position.set(position.x, position.y, position.z);
      camera.rotation.set(rotation.x, rotation.y, rotation.z);

      // ------- RESTORE LIGHTING
      const { ambient, directional } = sceneData.lighting;
      ambientLight.color.setHex(ambient.color);
      ambientLight.intensity = ambient.intensity;
      dirLight.color.setHex(directional.color);
      dirLight.intensity = directional.intensity;
      dirLight.position.set(...(directional.position as [number, number, number]));

      // ------- LOAD MODELS (unchanged logic)
      const loader  = new GLTFLoader();
      const loaded: THREE.Object3D[] = [];
      const modelsArr = sceneData.models || [];
      let done = 0;

      if (!modelsArr.length) {
        onModelsLoaded([]); // nothing to load
        return;
      }

      modelsArr.forEach((md: any) => {
        if (!md.glbBase64) {
          done++;
          if (done === modelsArr.length) onModelsLoaded(loaded);
          return;
        }

        const binStr  = atob(md.glbBase64);
        const buffer  = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) buffer[i] = binStr.charCodeAt(i);

        loader.parse(buffer.buffer, '', (gltf) => {
          const model = gltf.scene;
          model.name  = md.name || 'Model';
          model.position.copy(md.position);
          model.rotation.set(md.rotation.x, md.rotation.y, md.rotation.z);
          model.scale.copy(md.scale);
          model.userData['isLoadedModel'] = true;
          model.userData['fileName']      = md.fileName || 'unknown.glb';

          scene.add(model);
          loaded.push(model);

          done++;
          if (done === modelsArr.length) onModelsLoaded(loaded);
        },
        (e) => {                                   // onError
          console.error('Parse error', e);
          done++;
          if (done === modelsArr.length) onModelsLoaded(loaded);
          onError?.(e);
        });
      });

    } catch (e) {
      console.error('Error loading scene:', e);
      onError?.(e);
    }
  }

 loadGLB(file: File): void {
  const reader = new FileReader();

  reader.onload = () => {
    const arrayBuffer = reader.result as ArrayBuffer;
    const loader = new GLTFLoader();

    loader.parse(arrayBuffer, '', (gltf: GLTF) => {


  const root = gltf.scene;

  // Tag root
  root.userData['isLoadedModel'] = true;
  root.userData['fileName'] = file.name;

  // Also optionally tag its children (if you want finer-grain filtering)
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData['isLoadedModel'] = true;
      child.userData['fileName'] = file.name;
    }
  });

  const scene = this.viewerRef?.scene;
  if (scene) {
    scene.add(root);
    this.viewerRef.uploadedModel = root;
    console.log('GLTF loaded and added to scene:', root);
  } else {
    console.error('Viewer scene is not available.');
  }


    },
    (error) => {
      console.error('Error loading GLB file:', error.message);
    });
  };

  reader.readAsArrayBuffer(file);
}


// ---- Clear Scene ----

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

clearSceneAndLoadFile(file: File): void {
  this.clearScene(this.viewerRef.scene, () => true, (msg) => {
    this.logToConsole(msg);
  });

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'glb' || ext === 'gltf') {
    this.loadGLB(file);
  } else if (ext === 'json') {
    this._pendingJsonFile = file;
  } else {
    console.warn('Unsupported file type:', ext);
  }
}

  clearScene(scene: THREE.Scene, confirmFn: () => boolean = () => true, logFn: (msg: string) => void = () => {}): void {
    if (!confirmFn()) return;
    const toRemove = scene.children.filter(o => o.userData?.['isLoadedModel']);
    toRemove.forEach(o => {
      scene.remove(o);
      o.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          const disposeMat = (mat?: THREE.Material) => {
            if (!mat) return;
            ['map', 'aoMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'envMap']
              .forEach(prop => (mat as any)[prop]?.dispose());
            mat.dispose?.();
          };
          Array.isArray(mesh.material) ? mesh.material.forEach(disposeMat) : disposeMat(mesh.material);
        }
      });
    });

    if (scene.background instanceof THREE.Texture) {
      scene.background.dispose?.();
      scene.background = null;
    }

    logFn('VIEWER.CLEAR_SCENE');
  }

// ---- Change Model / Update ----

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    if (this.viewerRef) {
      this.clearSceneAndLoadFile(file);
      this.logToConsole('VIEWER.LOAD_GLB_SUCCESS');
    } else {
      console.error('Viewer reference not found!');
      this.logToConsole('VIEWER.LOAD_GLB_FAIL');
    }
  }

// ---- Console ----

  registerChangeDetector(cd: ChangeDetectorRef) {  // call once from the page
    this.cdRef = cd;
  }

  logToConsole(key: string, params?: any): void {
    const time = new Date().toLocaleTimeString();
    const text = this.translate.instant(key, params);
    this.consoleMessages.push(`[${time}] ${text}`);
    if (this.consoleMessages.length > 50) this.consoleMessages.shift();
    this.cdRef?.markForCheck();
  }

// ---- Save and Features ----

async saveSceneAsJson(viewerRef: any, logToConsole?: (msgKey: string) => void): Promise<void> {
  try {
    const filename = prompt('Enter filename to save your scene:', 'scene.json');
    if (!filename) return;

    const safeFilename = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
    const exported = this.exportScene(
      viewerRef.scene,
      viewerRef.camera,
      viewerRef.ambientLight,
      viewerRef.dirLight,
      viewerRef.objects
    );

    const exporter = new GLTFExporter();
    console.log('saveSceneAsJson() called');

    const modelsToExport: THREE.Object3D[] = [];
    viewerRef.scene.traverse((obj: THREE.Object3D) => {
      if (obj.userData?.['isLoadedModel']) {
        modelsToExport.push(obj);
      }
    });

    console.log('Models to export:', modelsToExport);

    const collectedModels: SceneData['models'] = [];

    // helper to convert ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
      const binary = new Uint8Array(buffer);
      let binaryString = '';
      for (let i = 0; i < binary.byteLength; i++) {
        binaryString += String.fromCharCode(binary[i]);
      }
      return btoa(binaryString);
    };

    for (const model of modelsToExport) {
      // Wrap GLTFExporter.parse in a Promise to await it
      const gltfBuffer: ArrayBuffer = await new Promise((resolve, reject) => {
        exporter.parse(
          model,
          (gltf) => {
            resolve(gltf as ArrayBuffer);
          },
          (error) => {
            reject(error);
          },
          { binary: true }
        );
      });

      const base64 = arrayBufferToBase64(gltfBuffer);

      collectedModels.push({
        name: model.name,
        position: model.position.clone(),
        rotation: model.rotation.clone(),
        scale: model.scale.clone(),
        fileName:
          model.userData['fileName']?.endsWith('.glb') ||
          model.userData['fileName']?.endsWith('.gltf')
            ? model.userData['fileName']
            : 'unknown.glb',
        glbBase64: base64,
      });
    }

    const fullData: SceneData = { ...exported, models: collectedModels };
    console.log('Final scene data collected:', fullData);
    this.downloadJson(JSON.stringify(fullData), safeFilename);
    logToConsole?.('VIEWER.SAVE_SCENE');

  } catch (err) {
    console.error('Error saving scene:', err);
  }
}


exportScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera, ambientLight: THREE.AmbientLight, dirLight: THREE.DirectionalLight, models: THREE.Object3D[] = []): SceneData {
  const sceneData = {
    lighting: {
      ambient: { color: ambientLight.color.getHex(), intensity: ambientLight.intensity },
      directional: {
        color: dirLight.color.getHex(),
        intensity: dirLight.intensity,
        position: [dirLight.position.x, dirLight.position.y, dirLight.position.z] as [number, number, number],
      },
    },
    camera: {
      position: camera.position.clone(),
      rotation: new THREE.Euler().copy(camera.rotation),
    },
    models: [],
    lights: {
      ambientLightVisible: ambientLight.visible,
      dirLightVisible: dirLight.visible,
    },
    wireframe: models.map(model => model.userData?.['wireframe'] || false),
  };

  return sceneData;
}

// private downloadJson(json: string, filename: string): void {
//     const blob = new Blob([json], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     a.click();
//     URL.revokeObjectURL(url);
//   }

downloadJson(jsonString: string, filename: string) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


}

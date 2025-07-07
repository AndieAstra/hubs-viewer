import { Injectable } from '@angular/core';
import { ProjectData } from '../models/project-data.model';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SceneData } from '../components/types/scene.types';
import * as THREE from 'three';

const STORAGE_KEY = 'lumion_project_data';
const EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly expiration = EXPIRATION_MS;

  // Save project data to localStorage
  save(data: ProjectData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Load project data from localStorage
  load(): ProjectData | null {
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

  // Clear project data from localStorage
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Modify this method to call the callback after models are loaded
  loadJsonScene(file: File, scene: THREE.Scene, camera: THREE.Camera, ambientLight: THREE.Light, dirLight: THREE.Light, onModelsLoaded: (models: THREE.Object3D[]) => void, onError?: (err: any) => void): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sceneData = JSON.parse(reader.result as string);
        this.loadSceneFromJson(sceneData, scene, camera, ambientLight, dirLight, onModelsLoaded, onError);
      } catch (err) {
        console.error('Invalid JSON file:', err);
        onError?.(err);
      }
    };
    reader.readAsText(file);
  }

  // Modify loadGLTF to call the callback after loading GLTF files
  loadGLTF(file: File, viewerRef: any, logToConsole?: (msgKey: string) => void): void {
    console.log("GLB or GLTF file detected");
    if (typeof viewerRef['loadGLB'] === 'function') {
      viewerRef['loadGLB'](file);
      logToConsole?.(`File loaded: ${file.name}`);
    } else {
      console.error('loadGLB method not found on viewerRef');
      logToConsole?.('VIEWER.LOAD_MODEL_ERROR');
    }
  }

  // Save Scene as JSON
  saveSceneAsJson(viewerRef: any, logToConsole?: (msgKey: string) => void): void {
    try {
      const filename = prompt('Enter filename to save your scene:', 'scene.json');
      if (!filename) return;

      const safeFilename = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
      const exported = this.exportScene(viewerRef.scene, viewerRef.camera, viewerRef.ambientLight, viewerRef.dirLight, viewerRef.objects);

      const exporter = new GLTFExporter();
      const modelsToExport = viewerRef.scene.children.filter((obj: THREE.Object3D) => obj.userData?.['isLoadedModel']);
      const collectedModels: SceneData['models'] = [];

      const processModel = (index: number) => {
        if (index >= modelsToExport.length) {
          const fullData: SceneData = { ...exported, models: collectedModels };
          this.downloadJson(JSON.stringify(fullData), safeFilename);
          logToConsole?.('VIEWER.SAVE_SCENE');
          return;
        }

        const model = modelsToExport[index];
        exporter.parse(model, (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          const reader = new FileReader();
          reader.onload = () => {
            const bin = new Uint8Array(reader.result as ArrayBuffer);
            const base64 = btoa(String.fromCharCode(...bin));
            collectedModels.push({
              name: model.name,
              position: model.position.clone(),
              rotation: model.rotation,
              scale: model.scale.clone(),
              fileName: model.userData['fileName'] || 'unknown.glb',
              glbBase64: base64,
            });
            processModel(index + 1);
          };
          reader.readAsArrayBuffer(blob);
        }, () => {}, { binary: true });
      };

      processModel(0);
    } catch (err) {
      console.error('Error saving scene:', err);
    }
  }

  // Helper to download JSON
  private downloadJson(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Assemble scene structure
// Ensure light visibility and wireframe state are included in the scene data export
exportScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera, ambientLight: THREE.AmbientLight, dirLight: THREE.DirectionalLight, models: THREE.Object3D[]): SceneData {
  const sceneData = {
    lighting: {
      ambient: { color: ambientLight.color.getHex(), intensity: ambientLight.intensity },
      directional: {
        color: dirLight.color.getHex(),
        intensity: dirLight.intensity,
        position: [dirLight.position.x, dirLight.position.y, dirLight.position.z] as [number, number, number],  // Cast as tuple
      },
    },
    camera: { position: camera.position.clone(), rotation: new THREE.Euler().copy(camera.rotation) },
    models: [], // Add models
    lights: {
      ambientLightVisible: ambientLight.visible,
      dirLightVisible: dirLight.visible,
    },
    wireframe: models.map(model => model.userData?.['wireframe'] || false),

  };
  return sceneData;
}


  // Restore scene from JSON
private loadSceneFromJson(
  sceneData: any,
  scene: THREE.Scene,
  camera: THREE.Camera,
  ambientLight: THREE.Light,
  dirLight: THREE.Light,
  onModelsLoaded: (models: THREE.Object3D[]) => void,
  onError?: (err: any) => void
): void {
  try {
    // Validate if scene data contains necessary properties
    if (!sceneData.camera) throw new Error("Scene data is missing 'camera' property.");
    this.clearScene(scene);

    // Restore camera position and rotation
    const { position, rotation } = sceneData.camera;
    if (!position || !rotation) throw new Error("Camera position or rotation is missing in scene data.");
    camera.position.set(position.x, position.y, position.z);
    camera.rotation.set(rotation.x, rotation.y, rotation.z);

    // Restore lighting information
    const { ambient, directional } = sceneData.lighting;
    ambientLight.color.setHex(ambient.color);
    ambientLight.intensity = ambient.intensity;
    dirLight.color.setHex(directional.color);
    dirLight.intensity = directional.intensity;
    dirLight.position.set(...(directional.position as [number, number, number]));

    const loader = new GLTFLoader();
    const loaded: THREE.Object3D[] = []; // Define an array to hold the loaded models
    const modelsArr = sceneData.models || [];
    let done = 0;

    if (!modelsArr.length) {
      onModelsLoaded([]); // No models to load, so call the callback with an empty array
      return;
    }

    // Loop through all models and load them
    modelsArr.forEach((md: any) => {
      if (!md.glbBase64) {
        done++;
        if (done === modelsArr.length) onModelsLoaded(loaded); // Call the callback once all models are loaded
        return;
      }

      // Decode the Base64 string to binary
      const binStr = atob(md.glbBase64);
      const buffer = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) buffer[i] = binStr.charCodeAt(i);

      // Parse the GLTF model from the binary data
      loader.parse(buffer.buffer, '', (gltf) => {
        const model = gltf.scene;
        model.name = md.name || 'Model';
        model.position.copy(md.position);
        model.rotation.set(md.rotation.x, md.rotation.y, md.rotation.z);
        model.scale.copy(md.scale);
        model.userData['isLoadedModel'] = true;
        model.userData['fileName'] = md.fileName || 'unknown.glb';

        // Add the model to the scene and keep track of it
        scene.add(model);
        loaded.push(model); // Push the loaded model to the array

        done++;
        if (done === modelsArr.length) onModelsLoaded(loaded); // Once all models are loaded, call the callback
      }, (e) => {
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
  // Clear all models from the scene
clearScene(scene: THREE.Scene, confirmFn: () => boolean = () => true, logFn: (msg: string) => void = () => {}): void {
  if (!confirmFn()) return;

  // Now clear the scene as expected
  const toRemove = scene.children.filter(o => o.userData?.['isLoadedModel']);

  // Remove and dispose the models as needed
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

  // Clear background if necessary
  if (scene.background instanceof THREE.Texture) {
    scene.background.dispose?.();
    scene.background = null;
  }

  logFn('VIEWER.CLEAR_SCENE');
  // No saving logic here unless intended
}

}

import { Injectable, ElementRef } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { ViewerComponent } from '../components/viewer/viewer.component';
import { SceneData } from '../components/types/scene.types';

@Injectable({ providedIn: 'root' })

export class SceneControlsService {

  fileInput?: ElementRef<HTMLInputElement>;

  viewerRef!: ViewerComponent;

  logToConsole?: (msgKey: string, params?: any) => void;


// *******************************************************************************


  // Trigger the hidden file input
  onUploadClick(): void {
    this.fileInput?.nativeElement.click();
  }

  // Handle file selection
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.onFileLoaded(file);
  }

  // Load JSON or GLB/GLTF
onFileLoaded(file: File): void {
  const fileName = file.name.toLowerCase();
  console.log("Selected file:", fileName);

  if (fileName.endsWith('.json')) {
    // Handle JSON scene files
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sceneData = JSON.parse(reader.result as string);
        this.loadSceneFromJson(
          sceneData,
          this.viewerRef.scene,
          this.viewerRef.camera,
          this.viewerRef.ambientLight,
          this.viewerRef.dirLight,
          (models: THREE.Object3D[]) => {
            this.viewerRef.uploadedModel = models[0] || null;
            this.logToConsole?.('VIEWER.LOAD_SCENE');
          },
          (err: any) => {
            console.error('Error loading scene JSON:', err);
            this.logToConsole?.('VIEWER.LOAD_SCENE_ERROR');
          }
        );
      } catch (err) {
        console.error('Invalid JSON file:', err);
        this.logToConsole?.('VIEWER.LOAD_SCENE_ERROR');
      }
    };
    reader.readAsText(file);

  } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
    console.log("GLB or GLTF file detected");

    // Handle GLB/GLTF files
    if (typeof this.viewerRef['loadGLB'] === 'function') {
      this.viewerRef['loadGLB'](file);
      this.logToConsole?.(`File loaded: ${file.name}`);
    } else {
      console.error('loadGLB method not found on viewerRef');
      this.logToConsole?.('VIEWER.LOAD_MODEL_ERROR');
    }

  } else {
    console.warn('Unsupported file type:', file.name);
    this.logToConsole?.('VIEWER.UNSUPPORTED_FILE_TYPE');
  }
}



// *******************************************************************************

  // Export scene and download JSON including embedded models
saveSceneAsJson(): void {
  try {
    if (!this.viewerRef) {
      console.error('Viewer not initialized!');
      return;
    }

    const filename = prompt('Enter filename to save your scene:', 'scene.json');
    if (!filename) {
      // User cancelled prompt
      return;
    }
    // Make sure filename ends with .json
    const safeFilename = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;

    const exported = this.exportScene(
      this.viewerRef.scene,
      this.viewerRef.camera,
      this.viewerRef.ambientLight,
      this.viewerRef.dirLight,
      this.viewerRef.objects
    );

    const exporter = new GLTFExporter();
    const modelsToExport = this.viewerRef.scene.children.filter(
      obj => obj.userData?.['isLoadedModel']
    );

    const collectedModels: SceneData['models'] = [];
    const processModel = (index: number) => {
      if (index >= modelsToExport.length) {
        const fullData: SceneData = {
          ...exported,
          models: collectedModels,
        };
        this.downloadJson(JSON.stringify(fullData), safeFilename);
        this.logToConsole?.('VIEWER.SAVE_SCENE');
        return;
      }

      const model = modelsToExport[index];
      exporter.parse(
        model,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          const reader = new FileReader();
          reader.onload = () => {
            const bin = new Uint8Array(reader.result as ArrayBuffer);
            let str = '';
            for (let i = 0; i < bin.byteLength; i++) {
              str += String.fromCharCode(bin[i]);
            }
            const base64 = btoa(str);

            collectedModels.push({
              name: model.name,
              position: model.position.clone(),
              rotation: {
                x: model.rotation.x,
                y: model.rotation.y,
                z: model.rotation.z,
              },
              scale: model.scale.clone(),
              fileName: model.userData['fileName'] || 'unknown.glb',
              glbBase64: base64,
            });

            processModel(index + 1);
          };
          reader.readAsArrayBuffer(blob);
        },
        () => {},  // empty onError handler
        { binary: true }
      );
    };

    processModel(0);
  } catch (err) {
    console.error('Error saving scene:', err);
  }
}


  // Generic JSON download helper
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
  exportScene(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    ambientLight: THREE.AmbientLight,
    dirLight: THREE.DirectionalLight,
    models: THREE.Object3D[]
  ): SceneData {
    return {
      lighting: {
        ambient: {
          color: ambientLight.color.getHex(),
          intensity: ambientLight.intensity,
        },
        directional: {
          color: dirLight.color.getHex(),
          intensity: dirLight.intensity,
          position: [dirLight.position.x, dirLight.position.y, dirLight.position.z],
        },
      },
      camera: {
        position: camera.position.clone(),
        rotation: new THREE.Euler().copy(camera.rotation),
      },
      models: [], // fills later when saving
    };
  }

  // Restore scene from JSON
loadSceneFromJson(
  sceneData: any,
  scene: THREE.Scene,
  camera: THREE.Camera,
  ambientLight: THREE.Light,
  dirLight: THREE.Light,
  onModelsLoaded: (models: THREE.Object3D[]) => void,
  onError?: (err: any) => void
): void {
  try {
    if (!sceneData.camera) {
      throw new Error("Scene data is missing 'camera' property.");
    }

    this.clearScene(scene);
    const { position, rotation } = sceneData.camera;

    if (!position || !rotation) {
      throw new Error("Camera position or rotation is missing in scene data.");
    }

    // Set camera position and rotation
    camera.position.set(position.x, position.y, position.z);
    camera.rotation.set(rotation.x, rotation.y, rotation.z);

    // Log camera position for debugging
    console.log('Camera Position:', camera.position);
    console.log('Camera Rotation:', camera.rotation);

    const { ambient, directional } = sceneData.lighting;
    ambientLight.color.setHex(ambient.color);
    ambientLight.intensity = ambient.intensity;
    dirLight.color.setHex(directional.color);
    dirLight.intensity = directional.intensity;
    dirLight.position.set(...(directional.position as [number, number, number]));

    // Log lighting for debugging
    console.log('Ambient Light:', ambientLight);
    console.log('Directional Light:', dirLight);

    const loader = new GLTFLoader();
    const loaded: THREE.Object3D[] = [];
    const modelsArr = sceneData.models || [];
    let done = 0;

    if (!modelsArr.length) {
      onModelsLoaded([]);
      return;
    }

    modelsArr.forEach((md: any) => {
      if (!md.glbBase64) {
        done++;
        if (done === modelsArr.length) onModelsLoaded(loaded);
        return;
      }

      const binStr = atob(md.glbBase64);
      const buffer = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) buffer[i] = binStr.charCodeAt(i);

      loader.parse(buffer.buffer, '', (gltf) => {
        const model = gltf.scene;
        model.name = md.name || 'Model';
        model.position.copy(md.position);
        model.rotation.set(md.rotation.x, md.rotation.y, md.rotation.z);
        model.scale.copy(md.scale);
        model.userData['isLoadedModel'] = true;
        model.userData['fileName'] = md.fileName || 'unknown.glb';

        scene.add(model);
        loaded.push(model);
        done++;
        if (done === modelsArr.length) onModelsLoaded(loaded);
      }, (e) => {
        console.error('Parse error', e);
        done++;
        if (done === modelsArr.length) onModelsLoaded(loaded);
        onError?.(e);
      });
    });
  } catch (e) {
    onError?.(e);
  }
}








// *******************************************************************************



  toggleWireframe(model: THREE.Object3D, logFn: (msg: string) => void): void {
    model.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const mat = (c as THREE.Mesh).material;
        const toggle = (m: THREE.Material) => (m as any).wireframe = !(m as any).wireframe;
        Array.isArray(mat) ? mat.forEach(toggle) : toggle(mat);
      }
    });
    logFn('VIEWER.TOGGLE_WIREFRAME');
  }

  toggleRoomLight(light: THREE.Light): void {
    light.visible = !light.visible;
  }

  toggleLightColor(light: THREE.Light): void {
    const isWhite = light.color.equals(new THREE.Color('white'));
    light.color.set(isWhite ? 'yellow' : 'white');
  }

  clearScene(
    scene: THREE.Scene,
    confirmFn: () => boolean = () => true,
    logFn: (msg: string) => void = () => {}
  ): void {
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
            ['map','aoMap','emissiveMap','normalMap','roughnessMap','metalnessMap','envMap']
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

    logFn('MESSAGES.SCENE_CLEARED');
  }

  resetCameraView(
    camera: THREE.Camera,
    controls: any,
    defaultPos = new THREE.Vector3(0, 1.6, 3),
    defaultRot = new THREE.Euler(0, 0, 0)
  ): void {
    camera.position.copy(defaultPos);
    camera.rotation.copy(defaultRot);
    if (controls?.getObject) {
      controls.getObject().position.copy(defaultPos);
      controls.getObject().rotation.copy(defaultRot);
    }
  }
}

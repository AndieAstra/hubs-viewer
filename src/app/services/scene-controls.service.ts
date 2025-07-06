import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { ViewerComponent } from '../components/viewer/viewer.component';
import { ProjectData } from '../models/project-data.model';
import { SceneData } from '../components/types/scene.types';

@Injectable({ providedIn: 'root' })
export class SceneControlsService {
  private objects: THREE.Object3D[] = [];


  loadGLB(
    file: File,
    scene: THREE.Scene,
    modelScale: number,
    modelHeight: number,
    onModelLoaded: (model: THREE.Object3D) => void,
    onError?: () => void
  ): void {
    const loader = new GLTFLoader();
    const reader = new FileReader();

    reader.onload = () => {
      try {
        loader.parse(reader.result as ArrayBuffer, '', (gltf) => {
          const model = gltf.scene;

          model.userData['isLoadedModel'] = true;
          model.userData['fileName'] = file.name;
          model.userData['file'] = file;

          model.scale.setScalar(modelScale);
          model.position.y = modelHeight;

          scene.add(model);
          onModelLoaded(model);
        });
      } catch {
        onError?.();
      }
    };

    reader.onerror = () => onError?.();
    reader.readAsArrayBuffer(file);
  }

  saveScene(
    scene: THREE.Scene,
    camera: THREE.Camera,
    ambientLight: THREE.Light,
    dirLight: THREE.Light,
    onExportComplete: (sceneJson: string) => void,
    onError?: (err: any) => void
  ): void {
    const sceneData: SceneData = {
      models: [],
      camera: {
        position: camera.position.clone(),
        rotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
          z: camera.rotation.z,
        },
      },
      lighting: {
        ambient: {
          color: (ambientLight.color as any).getHex(),
          intensity: ambientLight.intensity,
        },
        directional: {
          color: (dirLight.color as any).getHex(),
          intensity: dirLight.intensity,
          position: dirLight.position.toArray(),
        },
      },
    };

    const gltfExporter = new GLTFExporter();
    const objectsToExport = scene.children.filter(obj => obj.userData?.['isLoadedModel']);

    const exportNextModel = (index: number) => {
      if (index >= objectsToExport.length) {
        onExportComplete(JSON.stringify(sceneData));
        return;
      }

      const obj = objectsToExport[index];

      gltfExporter.parse(
        obj,
        (gltf) => {
          let glbBlob: Blob = gltf instanceof ArrayBuffer
            ? new Blob([gltf], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(gltf)], { type: 'application/json' });

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
        () => exportNextModel(index + 1),
        { binary: true }
      );
    };

    exportNextModel(0);
  }

  createProjectData(sceneData: SceneData): ProjectData {
    return {
      timestamp: Date.now(),
      scene: sceneData,
    };
  }

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
      models: models.map((model) => ({
        name: model.name,
        position: model.position.clone(),
        rotation: model.rotation.clone(),
        scale: model.scale.clone(),
        glbBase64: model.userData?.['glbBase64'] || '',
        fileName: model.userData?.['fileName'] || 'unknown.glb',
      })),
    };
  }

  async uploadSceneFromData(
    sceneData: SceneData,
    viewer: ViewerComponent,
    log: (key: string, params?: any) => void
  ): Promise<void> {
    if (!sceneData) return;

    const { ambient, directional } = sceneData.lighting;

    if (ambient && viewer.ambientLight) {
      viewer.ambientLight.color.setHex(ambient.color);
      viewer.ambientLight.intensity = ambient.intensity;
    }

    if (directional && viewer.dirLight) {
      viewer.dirLight.color.setHex(directional.color);
      viewer.dirLight.intensity = directional.intensity;
      const pos = directional.position;
      viewer.dirLight.position.set(pos[0], pos[1], pos[2]);
    }

    if (sceneData.camera && viewer.camera) {
      viewer.camera.position.copy(sceneData.camera.position);
      viewer.camera.rotation.set(
        sceneData.camera.rotation.x,
        sceneData.camera.rotation.y,
        sceneData.camera.rotation.z
      );
    }

    viewer.clearScene();

    const loader = new GLTFLoader();

    for (const model of sceneData.models) {
      if (!model.glbBase64) continue;

      try {
        const binary = atob(model.glbBase64);
        const binaryArray = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          binaryArray[i] = binary.charCodeAt(i);
        }

        const blob = new Blob([binaryArray], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);

        const gltf = await loader.loadAsync(url);
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
            child.userData['collidable'] = false;
            viewer.objects.push(child);
          }
        });

        viewer.scene?.add(loadedModel);
        viewer.uploadedModel = loadedModel;
        viewer.applyModelTransform();
        URL.revokeObjectURL(url);

        log('MODEL_LOADED', { name: model.name });
      } catch (error) {
        log('ERRORS.FAILED_LOAD_MODEL', { fileName: model.fileName });
        console.error(error);
      }
    }

    viewer.sceneLoaded = true;
  }

  uploadSceneFromFile(
    file: File,
    viewer: ViewerComponent,
    log: (key: string, params?: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event: ProgressEvent<FileReader>) => {
        const contents = event.target?.result as string;
        try {
          const sceneData: SceneData = JSON.parse(contents);
          await this.uploadSceneFromData(sceneData, viewer, log);
          resolve();
        } catch (err) {
          log('ERRORS.FILE_READ_FAIL_ALERT');
          reject(err);
        }
      };

      reader.onerror = () => {
        log('ERRORS.FILE_READ_FAIL_ALERT');
        reject(reader.error);
      };

      reader.readAsText(file);
    });
  }

  loadFromLocal(
    data: ProjectData,
    viewer: ViewerComponent,
    log: (key: string, params?: any) => void
  ): Promise<void> {
    if (!data || !data.scene) return Promise.resolve();
    return this.uploadSceneFromData(data.scene, viewer, log);
  }

  loadSceneFromLocalStorage(
    scene: THREE.Scene,
    camera: THREE.Camera,
    ambientLight: THREE.Light,
    dirLight: THREE.Light,
    onModelsLoaded: (models: THREE.Object3D[]) => void,
    onError?: (err: any) => void
  ) {
    const raw = localStorage.getItem('autosavedScene');
    if (!raw) return;

    try {
      const sceneData = JSON.parse(raw);
      this.clearScene(scene);

      const { position, rotation } = sceneData.camera;
      camera.position.set(position.x, position.y, position.z);
      camera.rotation.set(rotation.x, rotation.y, rotation.z);

      const { ambient, directional } = sceneData.lighting;
      ambientLight.color.setHex(ambient.color);
      ambientLight.intensity = ambient.intensity;

      dirLight.color.setHex(directional.color);
      dirLight.intensity = directional.intensity;
      dirLight.position.set(...(directional.position as [number, number, number]));


      const loader = new GLTFLoader();
      const loadedModels: THREE.Object3D[] = [];

      for (const modelData of sceneData.models) {
        if (!modelData.glbBase64) continue;

        const binaryString = atob(modelData.glbBase64);
        const arrayBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          arrayBuffer[i] = binaryString.charCodeAt(i);
        }

        loader.parse(arrayBuffer.buffer, '', (gltf) => {
          const model = gltf.scene;
          model.name = modelData.name || 'Loaded Model';
          model.position.copy(modelData.position);
          model.rotation.set(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z);
          model.scale.copy(modelData.scale);

          model.userData['isLoadedModel'] = true;
          model.userData['fileName'] = modelData.fileName || 'unknown.glb';

          scene.add(model);
          loadedModels.push(model);
        });
      }

      onModelsLoaded(loadedModels);
    } catch (err) {
      onError?.(err);
    }
  }

  saveSceneToLocalStorage(
    scene: THREE.Scene,
    camera: THREE.Camera,
    ambientLight: THREE.Light,
    dirLight: THREE.Light
  ) {
    try {
      const models = scene.children
        .filter(obj => obj.userData?.['isLoadedModel'])
        .map(obj => ({
          name: obj.name || '',
          position: obj.position,
          rotation: obj.rotation,
          scale: obj.scale,
          fileName: obj.userData['fileName'] || 'unknown.glb',
        }));

      const sceneData = {
        models,
        camera: {
          position: camera.position,
          rotation: camera.rotation,
        },
        lighting: {
          ambient: {
            color: (ambientLight.color as any).getHex(),
            intensity: ambientLight.intensity,
          },
          directional: {
            color: (dirLight.color as any).getHex(),
            intensity: dirLight.intensity,
            position: dirLight.position,
          },
        },
      };

      localStorage.setItem('autosavedScene', JSON.stringify(sceneData));
    } catch (err) {
      console.error('Error saving scene to localStorage', err);
    }
  }

  isColliding(position: THREE.Vector3, objects: THREE.Object3D[]): boolean {
    const height = 1.6, halfHeight = height / 2;
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(position.x, position.y - halfHeight, position.z),
      new THREE.Vector3(0.5, height, 0.5)
    );

    return objects.some(obj => new THREE.Box3().setFromObject(obj).intersectsBox(playerBox));
  }

  toggleWireframe(model: THREE.Object3D, logFn: (msgKey: string) => void): void {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material;

        const toggle = (mat: THREE.Material) => {
          (mat as any).wireframe = !(mat as any).wireframe;
        };

        if (Array.isArray(material)) {
          material.forEach(toggle);
        } else if (material) {
          toggle(material);
        }
      }
    });
    logFn('VIEWER.TOGGLE_WIREFRAME');
  }

  toggleRoomLight(light: THREE.Light): void {
    light.visible = !light.visible;
  }

  toggleLightColor(light: THREE.Light): void {
    light.color.set(light.color.equals(new THREE.Color('white')) ? 'yellow' : 'white');
  }

  clearScene(
    scene: THREE.Scene,
    confirmFn: () => boolean = () => true,
    logFn: (msgKey: string) => void = () => {}
  ): void {
    if (!confirmFn()) return;

    if (scene.background instanceof THREE.Texture) {
      scene.background.dispose?.();
      scene.background = null;
    }

    const toRemove = scene.children.filter(obj => obj.userData?.['isLoadedModel']);
    toRemove.forEach(obj => {
      scene.remove(obj);
      obj.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose?.();

          const disposeMaterial = (material: THREE.Material | undefined) => {
            if (!material) return;

            const mat = material as any;
            [
              'map','lightMap','aoMap','emissiveMap','bumpMap','normalMap','displacementMap',
              'roughnessMap','metalnessMap','alphaMap','envMap'
            ].forEach(prop => mat[prop]?.dispose?.());

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

    logFn('MESSAGES.SCENE_CLEARED');
  }


resetCameraView(
    camera: THREE.Camera,
    controls: any, // Replace with actual type if available
    defaultPosition: THREE.Vector3 = new THREE.Vector3(0, 1.6, 3),
    defaultRotation: THREE.Euler = new THREE.Euler(0, 0, 0)
  ): void {
    camera.position.copy(defaultPosition);
    camera.rotation.copy(defaultRotation);

    if (controls && typeof controls.getObject === 'function') {
      controls.getObject().position.copy(defaultPosition);
      controls.getObject().rotation.copy(defaultRotation);
    }
  }

}

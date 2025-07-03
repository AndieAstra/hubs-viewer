import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ViewerComponent } from '../viewer/viewer.component';

import { SceneData } from '../../components/types/scene.types';
import { ProjectData } from '../../models/project-data.model';

export class SceneStorageHelper {
  static exportScene(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    ambientLight: THREE.AmbientLight,
    dirLight: THREE.DirectionalLight,
    models: THREE.Object3D[],
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
          position: dirLight.position.clone(),
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

  static createProjectData(sceneData: SceneData): ProjectData {
    return {
      timestamp: Date.now(),
      scene: sceneData,
    };
  }

  static async loadFromLocal(
    data: ProjectData,
    viewer: ViewerComponent,
    log: (key: string, params?: any) => void
  ) {
    if (!data || !data.scene) return;
    await SceneStorageHelper.uploadSceneFromData(data.scene, viewer, log);
  }

  static async uploadSceneFromData(
    sceneData: SceneData,
    viewer: ViewerComponent,
    log: (key: string, params?: any) => void
  ) {
    if (!sceneData) return;

    if (sceneData.lighting) {
      const { ambient, directional } = sceneData.lighting;
      if (ambient && viewer.ambientLight) {
        viewer.ambientLight.color.setHex(ambient.color);
        viewer.ambientLight.intensity = ambient.intensity;
      }
      if (directional && viewer.dirLight) {
        viewer.dirLight.color.setHex(directional.color);
        viewer.dirLight.intensity = directional.intensity;
        const pos = directional.position;
        if (Array.isArray(pos)) {
          viewer.dirLight.position.set(pos[0], pos[1], pos[2]);
        } else {
          viewer.dirLight.position.set(pos.x, pos.y, pos.z);
        }
      }
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

  static async uploadSceneFromFile(
    file: File,
    viewer: ViewerComponent,
    log: (key: string, params?: any) => void
  ): Promise<void> {
    const reader = new FileReader();

    reader.onload = async (event: ProgressEvent<FileReader>) => {
      viewer.clearScene();

      const contents = event.target?.result as string;
      const sceneData: SceneData = JSON.parse(contents);

      await SceneStorageHelper.uploadSceneFromData(sceneData, viewer, log);
    };

    reader.onerror = () => {
      log('ERRORS.FILE_READ_FAIL_ALERT');
    };

    reader.readAsText(file);
  }
}

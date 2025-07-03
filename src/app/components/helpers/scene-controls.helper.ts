import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

export interface SceneData {
  models: any[];
  camera: {
    position: THREE.Vector3;
    rotation: { x: number; y: number; z: number };
  };
  lighting: {
    ambient: { color: number; intensity: number };
    directional: { color: number; intensity: number; position: number[] };
  };
}

export class SceneControlsHelper {
  static objects: THREE.Object3D[] = [];

  /** Load GLB file into scene and track uploaded model */
  static loadGLB(
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

    reader.onerror = () => {
      onError?.();
    };

    reader.readAsArrayBuffer(file);
  }

  /** Save scene data as JSON (including camera, lighting, and models) */
  static async saveScene(
    scene: THREE.Scene,
    camera: THREE.Camera,
    ambientLight: THREE.Light,
    dirLight: THREE.Light,
    onExportComplete: (sceneJson: string) => void,
    onError?: (err: any) => void
  ) {
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
        // All done
        onExportComplete(JSON.stringify(sceneData));
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
          console.error('Model export error', error);
          exportNextModel(index + 1); // continue with next model
        },
        { binary: true }
      );
    };

    exportNextModel(0);
  }

  /** Load scene JSON from localStorage */
  static loadSceneFromLocalStorage(
    scene: THREE.Scene,
    camera: THREE.Camera,
    ambientLight: THREE.Light,
    dirLight: THREE.Light,
    onModelsLoaded: (models: THREE.Object3D[]) => void,
    onError?: (err: any) => void
  ) {
    const raw = localStorage.getItem('autosavedScene');
    if (!raw) {
      console.warn('No autosaved scene found');
      return;
    }

    try {
      const sceneData = JSON.parse(raw);

      this.clearScene(scene);

      // Restore camera
      if (sceneData.camera) {
        const { position, rotation } = sceneData.camera;
        camera.position.set(position.x, position.y, position.z);
        camera.rotation.set(rotation.x, rotation.y, rotation.z);
      }

      // Restore lighting
      if (sceneData.lighting) {
        const { ambient, directional } = sceneData.lighting;
        if (ambient) {
          ambientLight.color.setHex(ambient.color);
          ambientLight.intensity = ambient.intensity;
        }
        if (directional) {
          dirLight.color.setHex(directional.color);
          dirLight.intensity = directional.intensity;
          dirLight.position.set(
            directional.position[0],
            directional.position[1],
            directional.position[2]
          );
        }
      }

      // Load models
      const loader = new GLTFLoader();
      const loadedModels: THREE.Object3D[] = [];

      if (sceneData.models && Array.isArray(sceneData.models)) {
        sceneData.models.forEach((modelData: any) => {
          if (!modelData.glbBase64) {
            console.warn('Model missing base64 data:', modelData.name);
            return;
          }

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

            scene.add(model);
            loadedModels.push(model);
          });
        });
      }

      onModelsLoaded(loadedModels);
    } catch (err) {
      onError?.(err);
    }
  }

  /** Save scene JSON to localStorage */
  static saveSceneToLocalStorage(
    scene: THREE.Scene,
    camera: THREE.Camera,
    ambientLight: THREE.Light,
    dirLight: THREE.Light
  ) {
    try {
      const models = scene.children
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
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          },
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
            position: {
              x: dirLight.position.x,
              y: dirLight.position.y,
              z: dirLight.position.z,
            },
          },
        },
      };

      localStorage.setItem('autosavedScene', JSON.stringify(sceneData));
    } catch (err) {
      console.error('Error saving scene to localStorage', err);
    }
  }

  /** Check collision between player box and scene objects */
  static isColliding(position: THREE.Vector3, objects: THREE.Object3D[]): boolean {
    const playerHeight = 1.6;
    const playerHalfHeight = playerHeight / 2;

    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(position.x, position.y - playerHalfHeight, position.z),
      new THREE.Vector3(0.5, playerHeight, 0.5)
    );

    for (const obj of objects) {
      const box = new THREE.Box3().setFromObject(obj);
      if (box.intersectsBox(playerBox)) return true;
    }

    return false;
  }

 static toggleWireframe(model: THREE.Object3D, logFn: (msgKey: string) => void): void {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material;

        const toggleMaterialWireframe = (mat: THREE.Material) => {
          // Cast material to any to access wireframe (since not all materials have it)
          (mat as any).wireframe = !( (mat as any).wireframe ?? false );
        };

        if (Array.isArray(material)) {
          material.forEach(toggleMaterialWireframe);
        } else if (material) {
          toggleMaterialWireframe(material);
        }
      }
    });
    logFn('VIEWER.TOGGLE_WIREFRAME');
  }

   static toggleRoomLight(light: THREE.Light): void {
    light.visible = !light.visible;
  }

  static toggleLightColor(light: THREE.Light): void {
    if (light.color.equals(new THREE.Color('white'))) {
      light.color.set('yellow');
    } else {
      light.color.set('white');
    }
  }

/** Clear scene and dispose of models, textures, geometry */
  static clearScene(
    scene: THREE.Scene,
    confirmFn: () => boolean = () => true,
    logFn: (msgKey: string) => void = () => {}
  ): void {
    if (!confirmFn()) {
      return;
    }

    // Dispose of background texture if any
    if (scene.background instanceof THREE.Texture) {
      scene.background.dispose?.();
      scene.background = null;
    }

    // Remove loaded models and dispose of geometry/materials
    const toRemove = scene.children.filter(obj => obj.userData?.['isLoadedModel']);
    toRemove.forEach(obj => {
      scene.remove(obj);
      obj.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

          // Dispose geometry
          mesh.geometry?.dispose?.();

          // Dispose materials and textures
          const disposeMaterial = (material: THREE.Material | undefined) => {
            if (!material) return;

            const mat = material as any;
            [
              'map',
              'lightMap',
              'aoMap',
              'emissiveMap',
              'bumpMap',
              'normalMap',
              'displacementMap',
              'roughnessMap',
              'metalnessMap',
              'alphaMap',
              'envMap'
            ].forEach((prop) => {
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

    logFn('MESSAGES.SCENE_CLEARED');
  }



}

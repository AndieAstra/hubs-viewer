import { Injectable, ElementRef } from '@angular/core';
import * as THREE from 'three';
import { ViewerComponent } from '../components/viewer/viewer.component';


@Injectable({ providedIn: 'root' })
export class SceneControlsService {

  fileInput?: ElementRef<HTMLInputElement>;
  viewerRef!: ViewerComponent;
  logToConsole?: (msgKey: string, params?: any) => void;

  // Toggle wireframe mode on a model
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

  // Toggle visibility of a light
  toggleRoomLight(light: THREE.Light): void {
    light.visible = !light.visible;
  }

  // Toggle light color between white and yellow
  toggleLightColor(light: THREE.Light): void {
    const isWhite = light.color.equals(new THREE.Color('white'));
    light.color.set(isWhite ? 'yellow' : 'white');
  }

  // Reset camera to its default position and rotation
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

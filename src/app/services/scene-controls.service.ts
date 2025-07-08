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

  // Slider Controls for Model Size
  updateModelSize(model: THREE.Object3D, size: number): void {
    model.scale.set(size, size, size);
    console.log(`Model size updated to: ${size}`);
  }

  // Slider Controls for Model Height
  updateModelHeight(model: THREE.Object3D, height: number): void {
    model.position.y = height;
    console.log(`Model height updated to: ${height}`);
  }

  // Slider Controls for Camera Speed
  updateCameraSpeed(controls: any, speed: number): void {
    if (controls && controls.userData && controls.userData.movementSpeed) {
      controls.userData.movementSpeed = speed;
      console.log(`Camera speed updated to: ${speed}`);
    }
  }

  // Slider Controls for Sunlight Intensity
  updateSunlightIntensity(light: THREE.Light, intensity: number): void {
    if (light instanceof THREE.DirectionalLight || light instanceof THREE.PointLight) {
      light.intensity = intensity;
      console.log(`Sunlight intensity updated to: ${intensity}`);
    }
  }

  // Slider Controls for Eye Level (Camera Position Y-axis)
  updateEyeLevel(camera: THREE.Camera, eyeLevel: number): void {
    camera.position.y = eyeLevel;
    console.log(`Eye level updated to: ${eyeLevel}`);
  }
}

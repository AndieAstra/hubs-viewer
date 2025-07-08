// src/app/three/scene-manager.ts
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { GUI } from 'dat.gui';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  ambientLight: THREE.AmbientLight;
  dirLight: THREE.DirectionalLight;
  controls: PointerLockControls;
  gui: GUI = new GUI();
  objects: THREE.Object3D[] = [];

  constructor(private container: HTMLElement, private cameraHeight: number = 1.6) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, this.cameraHeight, 10);
    this.camera.lookAt(0, this.cameraHeight, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.style.touchAction = 'manipulation';
    this.renderer.domElement.style.pointerEvents = 'auto';
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.dirLight.position.set(5, 10, 7.5);
    this.scene.add(this.ambientLight, this.dirLight);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());

    this.initUI();
    this.initSceneObjects();
  }

  private initUI() {
    const escHint = document.createElement('div');
    escHint.classList.add('esc-hint');
    escHint.innerHTML = '🔙 Press <strong>ESC</strong> to exit fullscreen';
    escHint.style.display = 'none';
    escHint.style.position = 'relative';
    this.container.appendChild(escHint);

    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.top = '50%';
    instructions.style.left = '50%';
    instructions.style.transform = 'translate(-50%, -50%)';
    instructions.style.color = 'white';
    instructions.style.fontSize = '24px';
    instructions.style.padding = '10px';
    instructions.style.background = 'rgba(0,0,0,0.5)';
    instructions.style.borderRadius = '8px';

    this.container.appendChild(instructions);

    const lockHandler = () => {
      this.controls.lock();
      if (this.container.contains(instructions)) {
        this.container.removeChild(instructions);
      }
    };

    this.container.addEventListener('click', lockHandler);
    this.container.addEventListener('touchstart', lockHandler, { passive: true });

    this.gui = new GUI({ width: 280 });
    this.gui.domElement.style.display = 'none';
  }

  private initSceneObjects() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData['collidable'] = true;
    this.scene.add(floor);
    this.objects.push(floor);

    this.scene.add(new THREE.GridHelper(200, 200, 0xd453ff, 0x444ddd));
    this.scene.add(new THREE.AxesHelper(5));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

resize(width?: number, height?: number): void {
  const w = width ?? this.container.clientWidth;
  const h = height ?? this.container.clientHeight;

  this.camera.aspect = w / h;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(w, h);
}


}

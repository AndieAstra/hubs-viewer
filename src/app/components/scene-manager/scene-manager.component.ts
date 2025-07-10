import { Component, Input, OnInit, OnDestroy } from '@angular/core';

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { GUI } from 'dat.gui';
import { PlayerMovementHelper } from '../helpers/player-movement.helper';
import { VrControllerHelper } from '../helpers/vr-controller.helper';

@Component({
  selector: 'app-scene-manager',
  standalone: true,
  imports: [],
  templateUrl: './scene-manager.component.html',
  styleUrls: []  // fixed typo here
})
export class SceneManagerComponent implements OnInit, OnDestroy {

  @Input() container!: HTMLElement;
  @Input() cameraHeight: number = 1.6;

  playerObj: THREE.Object3D = new THREE.Object3D();
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  ambientLight!: THREE.AmbientLight;
  dirLight!: THREE.DirectionalLight;
  controls!: PointerLockControls;
  gui: GUI = new GUI();
  objects: THREE.Object3D[] = [];
  private playerMovementHelper!: PlayerMovementHelper;
  private prevTime = 0;
  public vrHelper = new VrControllerHelper(3.0);
  speed = 50;
  private escHintSprite!: THREE.Sprite;

  private escHintDiv!: HTMLDivElement;
  private instructionsDiv!: HTMLDivElement;

  private lockHandler = () => {
    this.controls.lock();
    if (this.container.contains(this.instructionsDiv)) {
      this.container.removeChild(this.instructionsDiv);
    }
  };

  ngOnInit(): void {
    if (!this.container) {
      throw new Error('Container HTMLElement is required as input!');
    }

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );

    this.camera.position.set(0, this.cameraHeight, 10);
    this.camera.lookAt(0, this.cameraHeight, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.style.touchAction = 'manipulation';
    this.renderer.domElement.style.pointerEvents = 'auto';

    this.container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.dirLight.position.set(5, 10, 7.5);
    this.scene.add(this.ambientLight, this.dirLight);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());

    this.escHintSprite = this.createEscHintSprite();
    this.scene.add(this.escHintSprite);

    this.initUI();
    this.initSceneObjects();

    this.playerMovementHelper = new PlayerMovementHelper(
      10,    // moveSpeed
      9.8,   // gravity
      10,    // jumpStrength
      this.cameraHeight // cameraHeight
    );

    // Add event listeners for locking controls
    this.container.addEventListener('click', this.lockHandler);
    this.container.addEventListener('touchstart', this.lockHandler, { passive: true });

    // Start animation loop
    requestAnimationFrame(this.animate);
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    this.container.removeEventListener('click', this.lockHandler);
    this.container.removeEventListener('touchstart', this.lockHandler);
    this.gui.destroy();
  }

  private initUI(): void {
    this.escHintDiv = document.createElement('div');
    this.escHintDiv.classList.add('esc-hint');
    this.escHintDiv.innerHTML = '🔙 Press <strong>ESC</strong> to exit fullscreen';
    this.escHintDiv.style.display = 'none';
    this.escHintDiv.style.position = 'relative';
    this.container.appendChild(this.escHintDiv);

    this.instructionsDiv = document.createElement('div');
    this.instructionsDiv.style.position = 'absolute';
    this.instructionsDiv.style.top = '50%';
    this.instructionsDiv.style.left = '50%';
    this.instructionsDiv.style.transform = 'translate(-50%, -50%)';
    this.instructionsDiv.style.color = 'white';
    this.instructionsDiv.style.fontSize = '24px';
    this.instructionsDiv.style.padding = '10px';
    this.instructionsDiv.style.background = 'rgba(0,0,0,0.5)';
    this.instructionsDiv.style.borderRadius = '8px';

    this.container.appendChild(this.instructionsDiv);

    this.gui = new GUI({ width: 280 });
    this.gui.domElement.style.display = 'none';
  }

  private initSceneObjects(): void {
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

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width?: number, height?: number): void {
    const w = width ?? this.container.clientWidth;
    const h = height ?? this.container.clientHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate = (time: number): void => {
    if (!this.scene || !this.controls) return;

    const delta = (time - this.prevTime) / 1000 || 0;
    this.prevTime = time;

    this.vrHelper?.update?.();
    this.playerMovementHelper?.applyFriction?.(delta, 5.0);
    this.playerMovementHelper.updateKeyboardMovement(delta, this.speed, this.playerObj, this.scene, this.camera);

    if (this.escHintSprite) {
      const isInFullscreen = document.fullscreenElement === this.renderer.domElement;
      this.escHintSprite.visible = isInFullscreen;

      if (isInFullscreen) {
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        const cameraPosition = this.camera.position.clone();

        this.escHintSprite.position.copy(cameraPosition).add(cameraDirection.multiplyScalar(2));
        this.escHintSprite.position.y -= 1.2;
        this.escHintSprite.quaternion.copy(this.camera.quaternion);
      }
    }

    this.render();

    requestAnimationFrame(this.animate);
  };

  private createEscHintSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔙 Press ESC to exit fullscreen', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    sprite.visible = false;
    sprite.scale.set(6, 0.8, 1);
    sprite.position.set(0, -0.8, -2.5);

    return sprite;
  }

  public setEscHintVisible(visible: boolean) {
  this.escHintSprite.visible = visible;
  }

}

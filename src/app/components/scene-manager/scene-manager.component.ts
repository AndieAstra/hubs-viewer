import {Component, Input, OnInit, OnDestroy, ElementRef, ViewChild} from '@angular/core';

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { VrControllerHelper } from '../../helpers/vr-controller.helper';
import { PlayerMovementHelper } from '../../helpers/player-movement.helper';

@Component({
  selector   : 'app-scene-manager',
  standalone : true,
  imports    : [],
  template   : `<div #sceneRoot class="scene-manager-root"></div>`
})
export class SceneManagerComponent implements OnInit, OnDestroy {

  @ViewChild('sceneRoot', { static: true }) sceneRootRef!: ElementRef<HTMLElement>;

  @Input() container!: HTMLElement;
  @Input() cameraHeight: number = 1.6;

  public isVRMode = false;

  private enterVRButton!: HTMLButtonElement;
  private exitVRButton!: HTMLButtonElement;

  playerObj: THREE.Object3D = new THREE.Object3D();        // will be overwritten by controls.getObject()
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  ambientLight!: THREE.AmbientLight;
  dirLight!: THREE.DirectionalLight;
  controls!: PointerLockControls;
  //gui: GUI = new GUI();
  objects: THREE.Object3D[] = [];
  public playerMovementHelper!: PlayerMovementHelper;
  private prevTime = 0;
  public  vrHelper = new VrControllerHelper(3.0);
  speed = 5;
  private escHintSprite!: THREE.Sprite;
  //private escHintDiv!: HTMLDivElement;
  private instructionsDiv!: HTMLDivElement;

  /* ---------- keyboard bindings ----------- */
  private boundKeyDown!: (e: KeyboardEvent) => void;
  private boundKeyUp!  : (e: KeyboardEvent) => void;

  private lockHandler = () => {
    this.controls.lock();
    if (this.container.contains(this.instructionsDiv)) {
      this.container.removeChild(this.instructionsDiv);
    }
  };

    private vrLockHandler = () => {
    if (!this.isVRMode && this.controls?.lock) {
      this.controls.lock();
    }
  };

  init(): void {
    console.log('Scene initialized.');

if (!this.enterVRButton) {
    this.enterVRButton = document.createElement('button');
    this.enterVRButton.innerText = 'Enter VR';
    this.enterVRButton.style.position = 'absolute';
    this.enterVRButton.style.bottom = '20px';
    this.enterVRButton.style.left = '20px';
    this.enterVRButton.style.zIndex = '999';
    this.enterVRButton.onclick = () => this.enterVR();
    this.container.appendChild(this.enterVRButton);
  }

  if (!this.exitVRButton) {
    this.exitVRButton = document.createElement('button');
    this.exitVRButton.innerText = 'Exit VR';
    this.exitVRButton.style.position = 'absolute';
    this.exitVRButton.style.bottom = '20px';
    this.exitVRButton.style.left = '100px';
    this.exitVRButton.style.zIndex = '999';
    this.exitVRButton.style.display = 'none';
    this.exitVRButton.onclick = () => this.exitVR();
    this.container.appendChild(this.exitVRButton);
  }

  // Set initial visibility
  this.updateUIForVR(false);

  // Use the class property 'isVRMode' here
  this.enterVRButton.style.display = this.isVRMode ? 'none' : 'block';
  this.exitVRButton.style.display = this.isVRMode ? 'block' : 'none';
  }


ngOnInit(): void {
  if (!this.container) {
    this.container = this.sceneRootRef.nativeElement;
  }
  if (!this.container) {
    throw new Error('Container HTMLElement is required as input!');
  }

  /* ---------- THREE‑JS BASICS ---------- */
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

  /* ---------- LIGHTS ---------- */
  this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  this.dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  this.dirLight.position.set(5, 10, 7.5);
  this.scene.add(this.ambientLight, this.dirLight);

  /* ---------- CONTROLS ---------- */
  this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
  this.scene.add(this.controls.getObject());
  this.playerObj = this.controls.getObject();

  /* ---------- ESC Hint Sprite ---------- */
  this.escHintSprite = this.createEscHintSprite();
  this.scene.add(this.escHintSprite);

  /* ---------- UI & Scene Setup ---------- */
  this.initUI();
  this.initSceneObjects();

  /* ---------- Player Movement ---------- */
  this.playerMovementHelper = new PlayerMovementHelper(
    10,
    9.8,
    10,
    this.cameraHeight
  );

  /* ---------- Input Listeners ---------- */
  this.container.addEventListener('click', this.lockHandler);
  this.container.addEventListener('touchstart', this.lockHandler, { passive: true });

  this.boundKeyDown = (e: KeyboardEvent) => this.playerMovementHelper.onKeyDown(e.code);
  this.boundKeyUp = (e: KeyboardEvent) => this.playerMovementHelper.onKeyUp(e.code);
  window.addEventListener('keydown', this.boundKeyDown);
  window.addEventListener('keyup', this.boundKeyUp);

  this.init();

  /* ---------- Add VR Buttons ---------- */
  this.enterVRButton = document.createElement('button');
  this.enterVRButton.innerText = 'Enter VR';
  Object.assign(this.enterVRButton.style, {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    padding: '10px 16px',
    background: '#222',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    zIndex: '999',
  });
  this.enterVRButton.onclick = () => this.enterVR();
  this.container.appendChild(this.enterVRButton);

  this.exitVRButton = document.createElement('button');
  this.exitVRButton.innerText = 'Exit VR';
  Object.assign(this.exitVRButton.style, {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    padding: '10px 16px',
    background: '#800',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'none',
    zIndex: '999',
  });
  this.exitVRButton.onclick = () => this.exitVR();
  this.container.appendChild(this.exitVRButton);

  /* ---------- THREE VR Setup ---------- */
  this.renderer.xr.enabled = true;
  this.renderer.setAnimationLoop(this.animate);

  // Add VR pointer-lock listener (does not interfere with instructionsDiv)
  this.renderer.domElement.addEventListener('click', this.vrLockHandler);
  this.renderer.domElement.addEventListener('touchstart', this.vrLockHandler, { passive: true });
}

  ngOnDestroy(): void {
    this.container.removeEventListener('click',       this.lockHandler);
    this.container.removeEventListener('touchstart',  this.lockHandler);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup',   this.boundKeyUp);
    //this.gui?.destroy();
  }

animate = (time: number): void => {
  if (!this.scene || !this.controls) return;

  const delta = (time - this.prevTime) / 1000 || 0;
  this.prevTime = time;

  if (this.isVRMode) {
    this.vrHelper?.update?.();
  } else {
    this.playerMovementHelper?.applyFriction?.(delta, 5.0);
    this.playerMovementHelper.updateKeyboardMovement(
      delta,
      this.speed,
      this.playerObj,
      this.scene,
      this.camera
    );
  }

  // Update ESC hint
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

  this.renderer.render(this.scene, this.camera); // always render manually
};

  private initUI(): void {
    // this.escHintDiv = document.createElement('div');
    // this.escHintDiv.classList.add('esc-hint');
    // this.escHintDiv.innerHTML = '🔙 Press <strong>ESC</strong> to exit fullscreen';
    // this.escHintDiv.style.display  = 'none';
    // this.escHintDiv.style.position = 'relative';
    // this.container.appendChild(this.escHintDiv);

    this.instructionsDiv = document.createElement('div');
    Object.assign(this.instructionsDiv.style, {
      position   : 'absolute',
      top        : '50%',
      left       : '50%',
      transform  : 'translate(-50%, -50%)',
      color      : 'white',
      fontSize   : '24px',
      padding    : '10px',
      background : 'rgba(0,0,0,0.5)',
      borderRadius: '8px'
    });
    this.container.appendChild(this.instructionsDiv);
    //this.gui.domElement.style.display = 'none';
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
    const w = width  ?? this.container.clientWidth;
    const h = height ?? this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private createEscHintSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width  = 1024;
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

    const texture  = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite   = new THREE.Sprite(material);

    sprite.visible = false;
    sprite.scale.set(6, 0.8, 1);
    sprite.position.set(0, -0.8, -2.5);
    return sprite;
  }

  public setEscHintVisible(visible: boolean) {
    this.escHintSprite.visible = visible;
  }

  setEyeLevel(y: number): void {
    this.camera.position.y = y;
    this.controls.getObject().position.y = y;
    this.playerMovementHelper.cameraHeight = y;
  }

  // private initVRButtons(): void {
  //   this.enterVR = document.createElement('button');
  //   this.enterVR.innerText = 'Enter VR';
  //   Object.assign(this.enterVR.style, {
  //     position: 'absolute',
  //     top: '16px',
  //     right: '16px',
  //     zIndex: '999',
  //     padding: '10px',
  //     background: 'rgba(0,0,0,0.8)',
  //     color: 'white',
  //     border: 'none',
  //     borderRadius: '4px',
  //     cursor: 'pointer'
  //   });
  //   this.enter.onclick = () => this.enterVR();
  //   this.container.appendChild(this.enterVR);

  //   this.exitVR = document.createElement('button');
  //   this.exitVR.innerText = 'Exit VR';
  //   Object.assign(this.exitVR.style, {
  //     position: 'absolute',
  //     top: '16px',
  //     right: '100px',
  //     zIndex: '999',
  //     padding: '10px',
  //     background: 'rgba(0,0,0,0.8)',
  //     color: 'white',
  //     border: 'none',
  //     borderRadius: '4px',
  //     cursor: 'pointer',
  //     display: 'none'
  //   });
  //   this.exitVR.onclick = () => this.exitVR();
  //   this.container.appendChild(this.exitVR);
  // }

  async enterVR(): Promise<void> {
      if (!navigator.xr) {
        alert('WebXR not supported');
        return;
      }

      try {
        const session = await navigator.xr.requestSession('immersive-vr');
        this.renderer.xr.setSession(session);
        this.isVRMode = true;
        this.updateUIForVR(true);

        session.addEventListener('end', () => {
          this.isVRMode = false;
          this.updateUIForVR(false);
        });
      } catch (err) {
        console.error('Failed to start VR session:', err);
      }
    }

  exitVR(): void {
    const session = this.renderer.xr.getSession();
    if (session) session.end();
  }

  private updateUIForVR(inVR: boolean): void {
    if (this.enterVRButton) this.enterVRButton.style.display = inVR ? 'none' : 'block';
    if (this.exitVRButton) this.exitVRButton.style.display = inVR ? 'block' : 'none';
  }

}

import {Component, Input, OnInit, OnDestroy, ElementRef, ViewChild} from '@angular/core';

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { VrControllerHelper } from '../../helpers/vr-controller.helper';
import { PlayerMovementHelper } from '../../helpers/player-movement.helper';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect';
import { StereoscopeHelper } from '../../helpers/stereoscope.helper';
import { FullscreenHelper } from '../../helpers/fullscreen.helper';

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

  public isStereoscopeEnabled = false;

  stereoscopeToggleBtn!: HTMLButtonElement;
  fullscreenHelper!: FullscreenHelper;
  public stereoscopeHelper!: StereoscopeHelper;

  public isVRMode = false;

  private enterVRButton!: HTMLButtonElement;
  private exitVRButton!: HTMLButtonElement;

  playerObj: THREE.Object3D = new THREE.Object3D();
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  ambientLight!: THREE.AmbientLight;
  dirLight!: THREE.DirectionalLight;
  controls!: PointerLockControls;
  objects: THREE.Object3D[] = [];
  public playerMovementHelper!: PlayerMovementHelper;
  private prevTime = 0;
  public vrHelper = new VrControllerHelper(3.0);
  speed = 5;
  private escHintSprite!: THREE.Sprite;
  private instructionsDiv!: HTMLDivElement;

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

    this.updateUIForVR(false);

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
    this.playerObj = this.controls.getObject();

    this.escHintSprite = this.createEscHintSprite();
    this.scene.add(this.escHintSprite);

    this.initUI();
    this.initSceneObjects();

    this.playerMovementHelper = new PlayerMovementHelper(
      10,
      9.8,
      10,
      this.cameraHeight
    );

    this.container.addEventListener('click', this.lockHandler);
    this.container.addEventListener('touchstart', this.lockHandler, { passive: true });

    this.boundKeyDown = (e: KeyboardEvent) => this.playerMovementHelper.onKeyDown(e.code);
    this.boundKeyUp = (e: KeyboardEvent) => this.playerMovementHelper.onKeyUp(e.code);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);

    this.init();

    // ** Initialize fullscreen helper & stereoscope helper **
    this.fullscreenHelper = new FullscreenHelper(this.container);
    this.stereoscopeHelper = new StereoscopeHelper(this.renderer, this.scene, this.camera);

    // ** Hook fullscreen change to enable/disable stereoscope **
    this.fullscreenHelper.onChange((isFullscreen) => {
      if (isFullscreen) {
        this.stereoscopeHelper.enable();
      } else {
        this.stereoscopeHelper.disable();
      }
    });

    // Add VR Buttons — already in init() but repeated here (optional, can remove duplication)
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

    this.renderer.xr.enabled = true;
    this.renderer.setAnimationLoop(this.animate);

    this.renderer.domElement.addEventListener('click', this.vrLockHandler);
    this.renderer.domElement.addEventListener('touchstart', this.vrLockHandler, { passive: true });
  }

  ngOnDestroy(): void {
    this.container.removeEventListener('click',       this.lockHandler);
    this.container.removeEventListener('touchstart',  this.lockHandler);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup',   this.boundKeyUp);
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

    // Use stereoscope helper to render stereo view only if enabled
    if (this.isStereoscopeEnabled) {
      this.stereoscopeHelper.render();
    }

    // Always render regular scene as fallback
    this.renderer.render(this.scene, this.camera);
  };

  private initUI(): void {
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

     // Stereoscope toggle button
    this.stereoscopeToggleBtn = document.createElement('button');
    this.stereoscopeToggleBtn.innerText = 'Toggle Stereoscope';
    Object.assign(this.stereoscopeToggleBtn.style, {
      position: 'absolute',
      bottom: '20px',
      left: '140px',
      padding: '10px 16px',
      background: '#008800',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      zIndex: '999',
    });
    this.stereoscopeToggleBtn.onclick = () => {
      if (this.isStereoscopeEnabled) {
        this.stereoscopeHelper.disable();
        this.isStereoscopeEnabled = false;
        this.stereoscopeToggleBtn.style.background = '#008800';
      } else {
        this.stereoscopeHelper.enable();
        this.isStereoscopeEnabled = true;
        this.stereoscopeToggleBtn.style.background = '#004400';
      }
    };
    this.container.appendChild(this.stereoscopeToggleBtn);
  }

  private createEscHintSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC to exit fullscreen', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 1.5, 1);
    sprite.renderOrder = 999;
    sprite.visible = false;
    return sprite;
  }

enterVR(): void {
  this.isVRMode = true;
  this.updateUIForVR(true);
  this.renderer.xr.enabled = true;
  this.renderer.xr.setSession(null);

  if (navigator.xr) {
    navigator.xr.requestSession('immersive-vr').then(session => {
      this.renderer.xr.setSession(session);
      this.enterVRButton.style.display = 'none';
      this.exitVRButton.style.display = 'block';
    }).catch(() => {
      this.isVRMode = false;
      this.updateUIForVR(false);
      alert('Failed to enter VR mode.');
    });
  } else {
    this.isVRMode = false;
    this.updateUIForVR(false);
    alert('WebXR not supported by this browser.');
  }
}

  exitVR(): void {
    this.isVRMode = false;
    this.updateUIForVR(false);
    const session = this.renderer.xr.getSession();
    if (session) {
      session.end();
    }
    this.enterVRButton.style.display = 'block';
    this.exitVRButton.style.display = 'none';
  }

  private updateUIForVR(inVR: boolean): void {
    this.isVRMode = inVR;
    if (this.enterVRButton) this.enterVRButton.style.display = inVR ? 'none' : 'block';
    if (this.exitVRButton) this.exitVRButton.style.display = inVR ? 'block' : 'none';
  }
// ---------------------------------


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

    setEyeLevel(y: number): void {
    this.camera.position.y = y;
    this.controls.getObject().position.y = y;
    this.playerMovementHelper.cameraHeight = y;
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


  public setEscHintVisible(visible: boolean) {
    this.escHintSprite.visible = visible;
  }

}

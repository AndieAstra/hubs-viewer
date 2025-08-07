// src/app/components/forest-vr/forest-vr.component.ts

import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  NgZone,
} from '@angular/core';
import * as THREE from 'three';
import { Subscription } from 'rxjs';

import { VrControllerHelper } from '../../helpers/vr-controller.helper';
import { GyroscopeService, OrientationData } from '../../services/gyroscope.service';

@Component({
  selector: 'app-forest-vr',
  templateUrl: './forest-vr.component.html',
  styleUrls: ['./forest-vr.component.scss'],
})
export class ForestVRComponent implements AfterViewInit, OnDestroy {
  @ViewChild('forestCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  // THREE.js core objects
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cameraLeft!: THREE.PerspectiveCamera;
  private cameraRight!: THREE.PerspectiveCamera;

  // movement & look state
  private keysPressed: Record<string, boolean> = {};
  private moveSpeed = 0.1;
  private lastMouseX: number | null = null;
  private yaw = 0;

  // Stereo / VR helper
  public useStereo = true;
  private vrHelper = new VrControllerHelper();

  // Gyro subscription
  public gyroSub: Subscription | null = null;
  public gyroEnabled = false;

  constructor(
    private ngZone: NgZone,
    public gyroService: GyroscopeService
  ) {}

  ngAfterViewInit(): void {
    this.initThree();
    this.animate();

    // standard input listeners
    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    const canvas = this.canvasRef.nativeElement;
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseleave', () => (this.lastMouseX = null));

    this.vrHelper.enableInteractions();

    // If on mobile, auto‑request gyro
    if (this.isMobileDevice()) {
      this.enableGyro();
    }
  }

  private isMobileDevice(): boolean {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /** Request permission & subscribe to gyroscope data */
  public async enableGyro(): Promise<void> {
    try {
      const perm = await this.gyroService.requestPermission();
      if (perm !== 'granted') {
        console.warn('Gyro permission denied');
        return;
      }

      // run subscription inside Angular zone so updates are picked up
      this.ngZone.run(() => {
        this.gyroSub = this.gyroService.observeOrientation().subscribe((o: OrientationData) => {
          // Convert degrees → radians, then hand to vrHelper
          const euler = new THREE.Euler(
            THREE.MathUtils.degToRad(o.beta),   // X‑axis rotation
            THREE.MathUtils.degToRad(o.alpha),  // Z‑axis rotation
            THREE.MathUtils.degToRad(o.gamma)   // Y‑axis rotation
          );
          this.vrHelper.applyRotationFromEuler(this.camera, euler);
          this.gyroEnabled = true;
        });
      });
    } catch (err) {
      console.error('Error enabling gyro:', err);
    }
  }

  ngOnDestroy(): void {
    // clean up gyro subscription
    if (this.gyroSub) {
      this.gyroSub.unsubscribe();
      this.gyroSub = null;
    }

    // remove input listeners
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.canvasRef.nativeElement.removeEventListener('mousemove', this.onMouseMove);
    this.vrHelper.stop();
  }

  // ——————————————————————————————————————————
  // Three.js setup & render loop
  // ——————————————————————————————————————————

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x88c98f);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);
    this.cameraLeft  = this.camera.clone();
    this.cameraRight = this.camera.clone();

    // ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x557755 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // grid + trees + lights...
    this.scene.add(new THREE.GridHelper(200, 40, 0x444444, 0x444444));
    for (let i = 0; i < 50; i++) {
      const tree = this.createTree();
      tree.position.set((Math.random() - 0.5) * 180, 0, (Math.random() - 0.5) * 180);
      this.scene.add(tree);
    }
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.vrHelper.update();

    // handle keyboard movement
    const dir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(this.camera.up, forward).normalize();

    if (this.keysPressed['w'] || this.keysPressed['arrowup'])    dir.add(forward);
    if (this.keysPressed['s'] || this.keysPressed['arrowdown'])  dir.sub(forward);
    if (this.keysPressed['a'] || this.keysPressed['arrowleft'])  dir.add(right);
    if (this.keysPressed['d'] || this.keysPressed['arrowright']) dir.sub(right);

    dir.add(this.vrHelper.movementVector).normalize().multiplyScalar(this.moveSpeed);
    this.camera.position.add(dir);

    // apply yaw + VR helper’s rotation
    this.camera.rotation.set(0, this.yaw, 0);
    this.vrHelper.applyRotation(this.camera);

    // stereo vs mono rendering
    const w = window.innerWidth, h = window.innerHeight;
    if (this.useStereo) {
      this.renderer.setScissorTest(true);
      const eyeOff = 0.03;
      [this.cameraLeft, this.cameraRight].forEach((cam, i) => {
        cam.position.copy(this.camera.position).add(new THREE.Vector3((i?1:-1)*eyeOff, 0, 0));
        cam.quaternion.copy(this.camera.quaternion);
        this.renderer.setViewport(i? w/2: 0, 0, w/2, h);
        this.renderer.setScissor(i? w/2: 0, 0, w/2, h);
        this.renderer.render(this.scene, cam);
      });
      this.renderer.setScissorTest(false);
    } else {
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.render(this.scene, this.camera);
    }
  };

  private createTree(): THREE.Object3D {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 2),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    trunk.position.y = 1; tree.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57, flatShading: true })
    );
    leaves.position.y = 3; tree.add(leaves);
    return tree;
  }

  private onWindowResize = (): void => {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private onMouseMove = (evt: MouseEvent): void => {
    if (this.lastMouseX !== null) {
      this.yaw -= (evt.clientX - this.lastMouseX) * 0.002;
    }
    this.lastMouseX = evt.clientX;
  };

  private onKeyDown = (evt: KeyboardEvent) => {
    this.keysPressed[evt.key.toLowerCase()] = true;
  };

  private onKeyUp = (evt: KeyboardEvent) => {
    this.keysPressed[evt.key.toLowerCase()] = false;
  };

  toggleStereo(): void {
    this.useStereo = !this.useStereo;
  }

  async startVR(): Promise<void> {
    await this.vrHelper.enableInteractions();
  }
}

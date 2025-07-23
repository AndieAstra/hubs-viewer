import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { VrControllerHelper } from '../../helpers/vr-controller.helper';

@Component({
  selector: 'app-forest-vr',
  templateUrl: './forest-vr.component.html',
  styleUrls: ['./forest-vr.component.scss']
})
export class ForestVRComponent implements AfterViewInit, OnDestroy {
  @ViewChild('forestCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cameraLeft!: THREE.PerspectiveCamera;
  private cameraRight!: THREE.PerspectiveCamera;

  private keysPressed: { [key: string]: boolean } = {};
  private moveSpeed = 0.1;

  private lastMouseX: number | null = null;
  private yaw = 0;

  public useStereo: boolean = true;

  private vrHelper = new VrControllerHelper();

  ngAfterViewInit(): void {
    this.initThree();
    this.animate();

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    const canvas = this.canvasRef.nativeElement;
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseleave', () => (this.lastMouseX = null));

    // Start gyroscope support
    this.vrHelper.enableInteractions();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);

    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('mousemove', this.onMouseMove);

    this.vrHelper.stop();
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x88c98f);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);

    this.cameraLeft = this.camera.clone();
    this.cameraRight = this.camera.clone();

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x557755 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(200, 40, 0x444444, 0x444444);
    this.scene.add(grid);

    for (let i = 0; i < 50; i++) {
      const tree = this.createTree();
      tree.position.set((Math.random() - 0.5) * 180, 0, (Math.random() - 0.5) * 180);
      this.scene.add(tree);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    this.vrHelper.update();

    // Movement (keyboard or controller)
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(this.camera.up, forward).normalize();

    if (this.keysPressed['w'] || this.keysPressed['arrowup']) direction.add(forward);
    if (this.keysPressed['s'] || this.keysPressed['arrowdown']) direction.sub(forward);
    if (this.keysPressed['a'] || this.keysPressed['arrowleft']) direction.add(right);
    if (this.keysPressed['d'] || this.keysPressed['arrowright']) direction.sub(right);

    direction.add(this.vrHelper.movementVector);
    direction.normalize().multiplyScalar(this.moveSpeed);
    this.camera.position.add(direction);

    // Desktop mouse rotation (affects yaw)
    this.camera.rotation.set(0, this.yaw, 0);

    // Gyroscope orientation (slerped)
    this.vrHelper.applyRotation(this.camera);

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.useStereo) {
      this.renderer.setScissorTest(true);
      const eyeOffset = 0.03;

      this.cameraLeft.position.copy(this.camera.position).add(new THREE.Vector3(-eyeOffset, 0, 0));
      this.cameraLeft.quaternion.copy(this.camera.quaternion);
      this.renderer.setViewport(0, 0, width / 2, height);
      this.renderer.setScissor(0, 0, width / 2, height);
      this.renderer.render(this.scene, this.cameraLeft);

      this.cameraRight.position.copy(this.camera.position).add(new THREE.Vector3(eyeOffset, 0, 0));
      this.cameraRight.quaternion.copy(this.camera.quaternion);
      this.renderer.setViewport(width / 2, 0, width / 2, height);
      this.renderer.setScissor(width / 2, 0, width / 2, height);
      this.renderer.render(this.scene, this.cameraRight);

      this.renderer.setScissorTest(false);
    } else {
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.setScissorTest(false);
      this.renderer.render(this.scene, this.camera);
    }
  };

  private createTree(): THREE.Object3D {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 2),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    trunk.position.y = 1;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57, flatShading: true })
    );
    leaves.position.y = 3;
    tree.add(leaves);

    return tree;
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (this.lastMouseX !== null) {
      const deltaX = event.clientX - this.lastMouseX;
      this.yaw -= deltaX * 0.002; // mouse look speed
    }
    this.lastMouseX = event.clientX;
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keysPressed[event.key.toLowerCase()] = true;
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysPressed[event.key.toLowerCase()] = false;
  };

  toggleStereo(): void {
    this.useStereo = !this.useStereo;
  }
}

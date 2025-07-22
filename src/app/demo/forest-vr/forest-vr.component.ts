import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';

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
  public isPointerLocked = false;

  private yaw = 0;
  private moveSpeed = 0.1;
  private lookSpeed = 0.002;

  public useStereo: boolean = true;

  ngAfterViewInit(): void {
    this.initThree();
    this.animate();

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x88c98f); // Forest green

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);

    this.cameraLeft = this.camera.clone();
    this.cameraRight = this.camera.clone();

    const groundMat = new THREE.MeshStandardMaterial({ color: 0x557755 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
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

    direction.normalize().multiplyScalar(this.moveSpeed);
    this.camera.position.add(direction);

    // Yaw-only rotation
    this.camera.rotation.set(0, this.yaw, 0);

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.useStereo) {
      this.renderer.setScissorTest(true);

      const eyeOffset = 0.03;

      // Left Eye
      this.cameraLeft.position.copy(this.camera.position).add(new THREE.Vector3(-eyeOffset, 0, 0));
      this.cameraLeft.rotation.copy(this.camera.rotation);
      this.renderer.setViewport(0, 0, width / 2, height);
      this.renderer.setScissor(0, 0, width / 2, height);
      this.renderer.render(this.scene, this.cameraLeft);

      // Right Eye
      this.cameraRight.position.copy(this.camera.position).add(new THREE.Vector3(eyeOffset, 0, 0));
      this.cameraRight.rotation.copy(this.camera.rotation);
      this.renderer.setViewport(width / 2, 0, width / 2, height);
      this.renderer.setScissor(width / 2, 0, width / 2, height);
      this.renderer.render(this.scene, this.cameraRight);

      this.renderer.setScissorTest(false);
    } else {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, width, height);
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

  private onPointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.canvasRef.nativeElement;
    if (this.isPointerLocked) {
      document.addEventListener('mousemove', this.onMouseMove);
    } else {
      document.removeEventListener('mousemove', this.onMouseMove);
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isPointerLocked) return;
    this.yaw -= event.movementX * this.lookSpeed;
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

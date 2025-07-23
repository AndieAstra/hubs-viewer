import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';

@Component({
  selector: 'app-stereoscope-test',
  templateUrl: './stereoscope-test.component.html',
  styleUrls: ['./stereoscope-test.component.scss']
})
export class StereoscopeTestComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stereoCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private cameraLeft!: THREE.PerspectiveCamera;
  private cameraRight!: THREE.PerspectiveCamera;
  private monoCamera!: THREE.PerspectiveCamera;
  public useStereo: boolean = true;

  private controls!: DeviceOrientationControls;

  private suzanne!: THREE.Mesh;

ngAfterViewInit(): void {
  this.initThree();
  this.animate();
  window.addEventListener('resize', this.onWindowResize);
}

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
  }

  initThree(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0xC98888); // Old rose background

    this.scene = new THREE.Scene();

    const geometry = new THREE.IcosahedronGeometry(1.5, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x6699ff,
      metalness: 0.5,
      roughness: 0.3,
      flatShading: false,
    });

    const suzanne = new THREE.Mesh(geometry, material);
    suzanne.position.z = -5;
    this.scene.add(suzanne);
    this.suzanne = suzanne;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffaa00, 0.8, 15);
    pointLight.position.set(-3, 2, 3);
    this.scene.add(pointLight);

    const spotLight = new THREE.SpotLight(0xffffff, 0.5);
    spotLight.position.set(0, 5, 5);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.2;
    this.scene.add(spotLight);

    const aspect = 0.5 * window.innerWidth / window.innerHeight;

    this.cameraLeft = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    this.cameraRight = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    this.monoCamera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.cameraLeft.position.set(-0.05, 0, 0);
    this.cameraRight.position.set(0.05, 0, 0);
    this.monoCamera.position.z = 5;

    this.cameraLeft.lookAt(0, 0, -5);
    this.cameraRight.lookAt(0, 0, -5);
    this.monoCamera.lookAt(0, 0, -5);

    this.controls = new DeviceOrientationControls(this.monoCamera);
  }

animate = (): void => {
  requestAnimationFrame(this.animate);

  if (this.suzanne) {
    this.suzanne.rotation.y += 0.005;
    this.suzanne.rotation.x += 0.002;

    if (this.useStereo) {
      this.suzanne.scale.set(1, 1, 1); // normal size in stereo mode
    } else {
      this.suzanne.scale.set(2, 2, 2); // bigger in mono mode
    }
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  if (this.useStereo) {
    this.controls.update();

    this.renderer.setScissorTest(true);

    // Left eye
    this.renderer.setScissor(0, 0, width / 2, height);
    this.renderer.setViewport(0, 0, width / 2, height);
    this.renderer.render(this.scene, this.cameraLeft);

    // Right eye
    this.renderer.setScissor(width / 2, 0, width / 2, height);
    this.renderer.setViewport(width / 2, 0, width / 2, height);
    this.renderer.render(this.scene, this.cameraRight);

    this.renderer.setScissorTest(false);
  } else {
    // In mono mode, reset mono camera every frame
    this.monoCamera.position.set(0, 0, 5);
    this.monoCamera.lookAt(0, 0, -5);

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.render(this.scene, this.monoCamera);
  }
};


  onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);

    const stereoAspect = 0.5 * width / height;
    const monoAspect = width / height;

    this.cameraLeft.aspect = stereoAspect;
    this.cameraRight.aspect = stereoAspect;
    this.monoCamera.aspect = monoAspect;

    this.cameraLeft.updateProjectionMatrix();
    this.cameraRight.updateProjectionMatrix();
    this.monoCamera.updateProjectionMatrix();
  };

  toggleStereo(): void {
    this.useStereo = !this.useStereo;
  }
}

import { Component, ElementRef, Input, ViewChild, AfterViewInit } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { OrbitControls } from 'three-stdlib';
import * as CANNON from 'cannon-es';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [],
template: `<div #rendererContainer class="viewer-container"></div>`,
  styles: [`
    .viewer-container {
      width: 50%;
      height: 50vh;
      display: block;
    }
  `],
})
export class ViewerComponent implements AfterViewInit {
  @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef;
  @Input() glbFile?: File;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  private world!: CANNON.World;
  private clock = new THREE.Clock();

  ngAfterViewInit() {
    this.initThree();
    this.animate();
  }

  ngOnChanges() {
    if (this.glbFile) {
      this.loadGLBModel(this.glbFile);
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeeeeee);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Basic ambient light
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(light);

    // Setup Cannon-es physics world
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);

    // Add ground plane for collisions
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
  }

  private loadGLBModel(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const loader = new GLTFLoader();
      loader.parse(arrayBuffer, '', (gltf) => {
        this.scene.add(gltf.scene);
      });
    };
    reader.readAsArrayBuffer(file);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    this.world.step(1 / 60, delta);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

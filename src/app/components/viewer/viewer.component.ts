import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import GUI from 'lil-gui';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [],
  template: `<div #canvasContainer class="viewer-container"></div>`,
  styleUrls: ['./viewer.component.scss']
})
export class ViewerComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef;
  @Input() glbFile?: File;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: PointerLockControls;
  private clock = new THREE.Clock();
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private objects: THREE.Object3D[] = [];
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;
  private gui!: GUI;

  public speed = 5.0;

  private keysPressed = {
    forward: false,
    backward: false,
    left: false,
    right: false
  };

  ngOnInit() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['glbFile'] && changes['glbFile'].currentValue) {
      this.loadGLB(changes['glbFile'].currentValue);
    }
  }

  ngAfterViewInit() {
    this.initScene();
    if (this.glbFile) {
      this.loadGLB(this.glbFile);
    }
    this.animate();

    // Optional: make renderer responsive
    window.addEventListener('resize', () => {
      const container = this.containerRef.nativeElement;
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  private initScene() {
    const container = this.containerRef.nativeElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);


    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 5);
    this.camera.lookAt(0, 0, 0);


    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    this.dirLight.position.set(5, 10, 7.5);
    this.scene.add(this.dirLight);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject()); // Correct usage

    container.addEventListener('click', () => {
      this.controls.lock();
    });

    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.objects.push(floor);

    // lil-gui controls
    this.gui = new GUI();

    const lightFolder = this.gui.addFolder('Lights');

    lightFolder.addColor({ color: this.ambientLight.color.getHex() }, 'color')
      .name('Ambient')
      .onChange((value: number) => this.ambientLight.color.setHex(Number(value)));

    lightFolder.add(this.ambientLight, 'intensity', 0, 2, 0.01).name('Ambient Intensity');

    lightFolder.addColor({ color: this.dirLight.color.getHex() }, 'color')
      .name('Directional')
      .onChange((value: number) => this.dirLight.color.setHex(Number(value)));


    lightFolder.add(this.dirLight, 'intensity', 0, 2, 0.01).name('Directional Intensity');

    lightFolder.open();

    const movementFolder = this.gui.addFolder('Movement');
    movementFolder.add(this, 'speed', 0.1, 20, 0.1).name('Walk Speed');
    movementFolder.open();

    // Add camera height control
    const cameraFolder = this.gui.addFolder('Camera');
    cameraFolder.add(this.camera.position, 'y', 0.5, 3, 0.01).name('Height');
    cameraFolder.open();
  }

  private loadGLB(file: File) {
    const loader = new GLTFLoader();
    const reader = new FileReader();
    reader.onload = () => {
      loader.parse(reader.result as ArrayBuffer, '', gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            this.objects.push(child);
          }
        });
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, 0);
        this.scene.add(model);
        console.log('Model position:', model.position);
      });
    };
    reader.readAsArrayBuffer(file);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.keysPressed.forward) - Number(this.keysPressed.backward);
    this.direction.x = Number(this.keysPressed.right) - Number(this.keysPressed.left);
    this.direction.normalize();

    if (this.keysPressed.forward || this.keysPressed.backward) {
      this.velocity.z -= this.direction.z * this.speed * delta;
    }
    if (this.keysPressed.left || this.keysPressed.right) {
      this.velocity.x -= this.direction.x * this.speed * delta;
    }

    // 💥 COLLISION CHECK HERE
    const moveVector = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize();
    const moveDistance = this.speed * delta;

    const raycaster = new THREE.Raycaster(
      this.controls.getObject().position,
      moveVector
    );

    const intersections = raycaster.intersectObjects(this.objects, true);

    if (intersections.length > 0 && intersections[0].distance < moveDistance + 0.5) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Move if not blocked
    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);

    this.renderer.render(this.scene, this.camera);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keysPressed.forward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keysPressed.left = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keysPressed.backward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keysPressed.right = true;
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keysPressed.forward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keysPressed.left = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keysPressed.backward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keysPressed.right = false;
        break;
    }
  };
}

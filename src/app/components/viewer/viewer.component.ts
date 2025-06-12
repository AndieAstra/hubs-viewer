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

interface SavedScene {
  camera: { position: THREE.Vector3 };
  models: {
    name: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  }[];
  lights?: {
    ambient: number;
    directional: number;
  };
}

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
  public cameraHeight = 1.6;
  private sceneLoaded = false;

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
        if (this.sceneLoaded) {
          const confirmReplace = confirm('A scene is already loaded. Do you want to replace it with a new model?');
          if (!confirmReplace) return;
          this.clearScene();
        }
        this.loadGLB(changes['glbFile'].currentValue);
      } else if (!this.glbFile && !this.sceneLoaded) {
        alert('⚠️ No model file loaded or scene is empty. Please load a valid GLB model.');
      }
    }

  ngAfterViewInit() {
    this.initScene();
    if (this.glbFile) this.loadGLB(this.glbFile);
    this.animate();
  }

  private initScene() {
    const container = this.containerRef.nativeElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, this.cameraHeight, 0);
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
    this.scene.add(this.controls.getObject());

    // GUI setup
    this.gui = new GUI();
    const lightFolder = this.gui.addFolder('Lights');
    lightFolder.addColor({ ambientColor: this.ambientLight.color.getHex() }, 'ambientColor').name('Ambient').onChange((v: any) => this.ambientLight.color.setHex(Number(v)));
    lightFolder.add(this.ambientLight, 'intensity', 0, 2, 0.01).name('Ambient Intensity');
    lightFolder.addColor({ directionalColor: this.dirLight.color.getHex() }, 'directionalColor').name('Directional').onChange((v: any) => this.dirLight.color.setHex(Number(v)));
    lightFolder.add(this.dirLight, 'intensity', 0, 2, 0.01).name('Directional Intensity');
    lightFolder.open();

    const movementFolder = this.gui.addFolder('Movement');
    movementFolder.add(this, 'speed', 0.1, 20, 0.1).name('Walk Speed');
    movementFolder.add(this, 'cameraHeight', 0.1, 5, 0.01).name('Camera Height');
    movementFolder.open();

    const fileFolder = this.gui.addFolder('Scene');
    // fileFolder.add({ save: () => this.saveScene() }, 'save').name('💾 Save Scene');
    // fileFolder.add({ load: () => this.loadScene() }, 'load').name('📂 Load Scene');
    // fileFolder.open();


    fileFolder.add({ export: () => this.saveScene() }, 'export').name('💾⬇️ Download Scene');


    fileFolder.add({ import: () => this.triggerSceneUpload() }, 'import').name('📂⬆️ Upload Scene');


    container.addEventListener('click', () => this.controls.lock());

    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData['collidable'] = true;
    this.scene.add(floor);
    this.objects.push(floor);
  }

  private triggerSceneUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event: any) => {
    const file = event.target.files[0];
    if (file) this.uploadSceneFromFile(file);
  };
  input.click();
}

private loadGLB(file: File) {
    const loader = new GLTFLoader();
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loader.parse(reader.result as ArrayBuffer, '', gltf => {
          const model = gltf.scene;
          model.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).geometry.computeBoundingBox();
              this.objects.push(child);
              child.userData['collidable'] = true;
            }
          });
          model.userData['isLoadedModel'] = true;
          this.scene.add(model);
          model.scale.set(1, 1, 1);
          model.position.set(0, 0, 0);
          this.sceneLoaded = true;
        });
      } catch (err) {
        alert('❌ Error loading model. Please try again with a proper GLB format.');
      }
    };
    reader.onerror = () => {
      alert('❌ Failed to read file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  }



  private saveScene() {
  const sceneData: SavedScene = {
    camera: { position: this.camera.position.clone() },
    models: [],
    lights: {
      ambient: this.ambientLight.intensity,
      directional: this.dirLight.intensity,
    }
  };

  this.scene.traverse((obj) => {
    if (obj.userData['isLoadedModel']) {
      sceneData.models.push({
        name: obj.name || 'model',
        position: obj.position.clone(),
        rotation: obj.rotation.clone(),
        scale: obj.scale.clone(),
      });
    }
  });

  const json = JSON.stringify(sceneData, (key, value) =>
    value instanceof THREE.Vector3 || value instanceof THREE.Euler
      ? { x: value.x, y: value.y, z: value.z }
      : value,
    2
  );

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'threejs-scene.json';
  a.click();

  URL.revokeObjectURL(url);

  console.log('✅ Scene exported as downloadable file.');
}

public uploadSceneFromFile(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const sceneData: SavedScene = JSON.parse(reader.result as string);

      if (!sceneData || !sceneData.models) {
        alert('❌ Invalid scene file.');
        return;
      }

      const hasLoadedModels = this.objects.some(obj => obj.userData['isLoadedModel']);
      if (hasLoadedModels) {
        const proceed = confirm('⚠️ This will replace the current scene. Continue?');
        if (!proceed) return;
      }

      this.camera.position.set(
        sceneData.camera.position.x,
        sceneData.camera.position.y,
        sceneData.camera.position.z
      );

      if (sceneData.lights) {
        this.ambientLight.intensity = sceneData.lights.ambient;
        this.dirLight.intensity = sceneData.lights.directional;
      }

      // Clear old models
      this.objects = this.objects.filter(obj => {
        if (obj.userData['isLoadedModel']) {
          this.scene.remove(obj);
          return false;
        }
        return true;
      });

      // Load models
      sceneData.models.forEach(modelData => {
        const loader = new GLTFLoader();
        loader.load(
          'assets/default.glb',
          gltf => {
            const model = gltf.scene;
            model.position.set(modelData.position.x, modelData.position.y, modelData.position.z);
            model.rotation.set(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z);
            model.scale.set(modelData.scale.x, modelData.scale.y, modelData.scale.z);
            model.userData['isLoadedModel'] = true;
            this.scene.add(model);
            this.objects.push(model);
          },
          undefined,
          () => {
            alert('❌ Failed to load model. Ensure the correct GLB is referenced.');
          }
        );
      });

      console.log('✅ Scene loaded from file.');
    } catch (e) {
      alert('❌ Error parsing scene file.');
    }
  };

  reader.readAsText(file);
}



  private loadScene() {
  const raw = localStorage.getItem('savedScene');
  if (!raw) {
    alert('⚠️ No saved scene found.');
    return;
  }

  const hasLoadedModels = this.objects.some(obj => obj.userData['isLoadedModel']);
  if (hasLoadedModels) {
    const proceed = confirm('⚠️ A scene is already loaded. Loading a new scene will replace it. Continue?');
    if (!proceed) return;
  }

  const sceneData: SavedScene = JSON.parse(raw);

  this.camera.position.copy(sceneData.camera.position);

  if (sceneData.lights) {
    this.ambientLight.intensity = sceneData.lights.ambient;
    this.dirLight.intensity = sceneData.lights.directional;
  }

  // Remove only loaded models (keep static objects like floor)
  this.objects = this.objects.filter(obj => {
    if (obj.userData['isLoadedModel']) {
      this.scene.remove(obj);
      return false;
    }
    return true;
  });

  sceneData.models.forEach((modelData) => {
    const loader = new GLTFLoader();
    loader.load(
      'assets/default.glb',
      (gltf) => {
        const model = gltf.scene;
        model.position.copy(modelData.position);
        model.rotation.copy(modelData.rotation);
        model.scale.copy(modelData.scale);
        model.userData['isLoadedModel'] = true;
        this.scene.add(model);
        this.objects.push(model);
      },
      undefined,
      () => {
        alert('❌ Error loading model. Please check the GLB file format and try again.');
      }
    );
  });

  console.log('✅ Scene loaded from localStorage.');
}

  private isColliding(position: THREE.Vector3): boolean {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      position.clone().setY(0.5),
      new THREE.Vector3(0.5, 1.6, 0.5)
    );

    for (const obj of this.objects) {
      const box = new THREE.Box3().setFromObject(obj);
      if (box.intersectsBox(playerBox)) return true;
    }

    return false;
  }

   private clearScene() {
    for (const obj of this.objects) {
      this.scene.remove(obj);
    }
    this.objects = [];
    this.sceneLoaded = false;
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.keysPressed.forward) - Number(this.keysPressed.backward);
    this.direction.x = Number(this.keysPressed.right) - Number(this.keysPressed.left);
    this.direction.normalize();

    if (this.keysPressed.forward || this.keysPressed.backward)
      this.velocity.z -= this.direction.z * this.speed * delta;

    if (this.keysPressed.left || this.keysPressed.right)
      this.velocity.x -= this.direction.x * this.speed * delta;

    const moveX = -this.velocity.x * delta;
    const moveZ = -this.velocity.z * delta;

    const oldPosition = this.controls.getObject().position.clone();

    this.controls.moveRight(moveX);
    if (this.isColliding(this.controls.getObject().position)) {
      this.controls.getObject().position.x = oldPosition.x;
    }

    this.controls.moveForward(moveZ);
    if (this.isColliding(this.controls.getObject().position)) {
      this.controls.getObject().position.z = oldPosition.z;
    }

    this.camera.position.y = this.cameraHeight;
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

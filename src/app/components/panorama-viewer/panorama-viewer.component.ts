import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, HostListener } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  templateUrl: './panorama-viewer.component.html',
  styleUrls: ['./panorama-viewer.component.scss']
})
export class PanoramaViewerComponent implements OnInit, OnDestroy {
  @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId = 0;
  private sphereMesh!: THREE.Mesh;

  private keys = new Set<string>();

  // Rotation angles
  private yaw = 0;   // horizontal rotation
  private pitch = 0; // vertical rotation
  private ROTATION_SPEED = 0.02; // radians per frame

  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;

  constructor(private ngZone: NgZone) {}

ngOnInit(): void {
  this.initThree();
  this.ngZone.runOutsideAngular(() => this.animate());

  const canvas = this.renderer.domElement;
  canvas.addEventListener('mousedown', this.onMouseDown);
  canvas.addEventListener('mousemove', this.onMouseMove);
  canvas.addEventListener('mouseup', this.onMouseUp);
  canvas.addEventListener('mouseleave', this.onMouseUp);

  canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
  canvas.addEventListener('touchend', this.onTouchEnd);
}

ngOnDestroy(): void {
  cancelAnimationFrame(this.animationFrameId);
  this.renderer.dispose();
  this.scene.clear();
  this.keys.clear();

  const canvas = this.renderer.domElement;
  canvas.removeEventListener('mousedown', this.onMouseDown);
  canvas.removeEventListener('mousemove', this.onMouseMove);
  canvas.removeEventListener('mouseup', this.onMouseUp);
  canvas.removeEventListener('mouseleave', this.onMouseUp);

  canvas.removeEventListener('touchstart', this.onTouchStart);
  canvas.removeEventListener('touchmove', this.onTouchMove);
  canvas.removeEventListener('touchend', this.onTouchEnd);
}

  initThree(): void {
    const container = this.rendererContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1100);
    this.camera.position.set(0, 0, 0); // Fixed at center

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // Create inverted sphere for panorama
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // invert to look inside
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.sphereMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphereMesh);
  }

  private onMouseDown = (event: MouseEvent) => {
  this.isDragging = true;
  this.previousMouseX = event.clientX;
  this.previousMouseY = event.clientY;
};

private onMouseMove = (event: MouseEvent) => {
  if (!this.isDragging) return;

  const deltaX = event.clientX - this.previousMouseX;
  const deltaY = event.clientY - this.previousMouseY;

  this.previousMouseX = event.clientX;
  this.previousMouseY = event.clientY;

  this.yaw -= deltaX * 0.002;
  this.pitch -= deltaY * 0.002;
  this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2, Math.PI / 2);
};

private onMouseUp = () => {
  this.isDragging = false;
};

private onTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 1) {
    this.isDragging = true;
    this.previousMouseX = event.touches[0].clientX;
    this.previousMouseY = event.touches[0].clientY;
  }
};

private onTouchMove = (event: TouchEvent) => {
  if (!this.isDragging || event.touches.length !== 1) return;

  const touch = event.touches[0];
  const deltaX = touch.clientX - this.previousMouseX;
  const deltaY = touch.clientY - this.previousMouseY;

  this.previousMouseX = touch.clientX;
  this.previousMouseY = touch.clientY;

  this.yaw -= deltaX * 0.002;
  this.pitch -= deltaY * 0.002;
  this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2, Math.PI / 2);

  event.preventDefault(); // Prevent scrolling
};

private onTouchEnd = () => {
  this.isDragging = false;
};


animate = () => {
  this.handleKeyLook(); // handle keyboard input

  // Calculate direction vector from yaw and pitch
  const direction = new THREE.Vector3();
  direction.x = Math.cos(this.pitch) * Math.sin(this.yaw);
  direction.y = Math.sin(this.pitch);
  direction.z = Math.cos(this.pitch) * Math.cos(this.yaw);

  // Apply the look direction — from camera center outward
  this.camera.lookAt(this.camera.position.clone().add(direction));

  // Render scene
  this.renderer.render(this.scene, this.camera);
  this.animationFrameId = requestAnimationFrame(this.animate);
};


  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(reader.result as string, (texture) => {
        if (Array.isArray(this.sphereMesh.material)) {
          this.sphereMesh.material.forEach((mat) => mat.dispose());
        } else {
          this.sphereMesh.material.dispose();
        }

        this.sphereMesh.material = new THREE.MeshBasicMaterial({ map: texture });
      });
    };

    reader.readAsDataURL(file);
  }

  private handleKeyLook(): void {
    let updated = false;

    if (this.keys.has('arrowleft') || this.keys.has('a')) {
      this.yaw += this.ROTATION_SPEED;
      updated = true;
    }
    if (this.keys.has('arrowright') || this.keys.has('d')) {
      this.yaw -= this.ROTATION_SPEED;
      updated = true;
    }
    if (this.keys.has('arrowup') || this.keys.has('w')) {
      this.pitch += this.ROTATION_SPEED;
      updated = true;
    }
    if (this.keys.has('arrowdown') || this.keys.has('s')) {
      this.pitch -= this.ROTATION_SPEED;
      updated = true;
    }

    // Clamp pitch between straight up and straight down (to avoid flipping)
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2, Math.PI / 2);

    if (updated) {
      // No need to do anything here because updateCameraRotation will run every frame
    }
  }

  private updateCameraRotation(): void {
    // Calculate the direction vector from yaw and pitch
    const x = Math.cos(this.pitch) * Math.sin(this.yaw);
    const y = Math.sin(this.pitch);
    const z = Math.cos(this.pitch) * Math.cos(this.yaw);

    const lookDirection = new THREE.Vector3(x, y, z);
    lookDirection.add(this.camera.position);

    this.camera.lookAt(lookDirection);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.key.toLowerCase());
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key.toLowerCase());
  }
}

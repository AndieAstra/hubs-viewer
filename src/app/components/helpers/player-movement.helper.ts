import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class PlayerMovementHelper {
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private keysPressed = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
  private canJump = true;
  friction = 6; // You can tweak this value as needed
  readonly EPSILON = 0.001;

  constructor(
    private moveSpeed: number,
    private gravity: number,
    private jumpStrength: number,
    private cameraHeight: number
  ) {}

  applyFriction(delta: number, friction: number) {
    this.velocity.x -= this.velocity.x * friction * delta;
    this.velocity.z -= this.velocity.z * friction * delta;
  }

  updateKeyboardMovement(delta: number, speed: number) {
    this.direction.set(0, 0, 0);
    if (this.keysPressed.forward) this.direction.z += 1;
    if (this.keysPressed.backward) this.direction.z -= 1;
    if (this.keysPressed.left) this.direction.x -= 1;
    if (this.keysPressed.right) this.direction.x += 1;
    this.direction.normalize();

    if (this.direction.length() > 0) {
      this.velocity.x += this.direction.x * speed * delta;
      this.velocity.z += this.direction.z * speed * delta;
    }
  }

  applyGravity(delta: number) {
    this.velocity.y -= this.gravity * delta;
  }

  applyMovement(
    playerObj: THREE.Object3D,
    delta: number,
    controls: PointerLockControls,
    isColliding: (pos: THREE.Vector3) => boolean
  ) {
    const moveX = this.velocity.x * delta;
    const moveZ = this.velocity.z * delta;

    const oldX = playerObj.position.x;
    const oldZ = playerObj.position.z;

    controls.moveRight(moveX);
    if (isColliding(playerObj.position)) {
      playerObj.position.x = oldX;
    }

    controls.moveForward(moveZ);
    if (isColliding(playerObj.position)) {
      playerObj.position.z = oldZ;
    }

    playerObj.position.y += this.velocity.y * delta;
  }

applyVRMovement(
  delta: number,
  movementVector: THREE.Vector3,
  cameraQuat: THREE.Quaternion
) {

  // Apply deadzone filtering here BEFORE anything else
  const DEADZONE = 0.15;
  if (Math.abs(movementVector.x) < DEADZONE) movementVector.x = 0;
  if (Math.abs(movementVector.z) < DEADZONE) movementVector.z = 0;

   // If after deadzone filtering the vector is zero, no movement
  if (movementVector.lengthSq() === 0) {
    // Also optionally zero velocity here to prevent drift
    this.velocity.x = 0;
    this.velocity.z = 0;
    return;
  }

  // Apply friction/damping
  this.velocity.x *= Math.max(0, 1 - this.friction * delta);
  this.velocity.z *= Math.max(0, 1 - this.friction * delta);

  // Clamp small values to zero to stop drifting
  if (Math.abs(this.velocity.x) < this.EPSILON) this.velocity.x = 0;
  if (Math.abs(this.velocity.z) < this.EPSILON) this.velocity.z = 0;

  if (movementVector.lengthSq() > 0) {
    const moveDir = movementVector.clone().applyQuaternion(cameraQuat).setY(0).normalize();
    this.velocity.x += moveDir.x * this.moveSpeed * delta;
    this.velocity.z += moveDir.z * this.moveSpeed * delta;
  }
}

  enforceGround(playerObj: THREE.Object3D) {
    if (playerObj.position.y < this.cameraHeight) {
      this.velocity.y = 0;
      playerObj.position.y = this.cameraHeight;
      this.canJump = true;
    }
  }

  onKeyDown(code: string) {
    switch (code) {
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
      case 'Space':
        if (this.canJump) {
          this.velocity.y = this.jumpStrength;
          this.canJump = false;
        }
        break;
    }
  }

  onKeyUp(code: string) {
    switch (code) {
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
  }
}

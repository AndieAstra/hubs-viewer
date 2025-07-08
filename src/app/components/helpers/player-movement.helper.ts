import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

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
  private isJumping = false;  // Added isJumping flag
  friction = 6;
  readonly EPSILON = 0.001;

  private isGrounded: boolean = false;

  constructor(
    public moveSpeed: number,
    private gravity: number,
    private jumpStrength: number,
    private cameraHeight: number
  ) {}

  applyFriction(delta: number, friction: number) {
    this.velocity.x -= this.velocity.x * friction * delta;
    this.velocity.z -= this.velocity.z * friction * delta;
  }

updateKeyboardMovement(delta: number, speed: number, playerObj: THREE.Object3D, scene: THREE.Scene) {
  // Check if the player is on the ground (collisions with the ground surface)
  this.isGrounded = this.checkIfGrounded(playerObj, scene);

  // Gravity: only apply gravity if the player is not grounded
  if (!this.isGrounded) {
    this.velocity.y -= this.gravity * delta;  // Apply gravity when not grounded
  } else {
    // Reset Y velocity when grounded
    this.velocity.y = 0;
  }

  // Jump logic (triggered by spacebar or other controls)
  if (this.isJumping && this.isGrounded) {
    this.velocity.y = this.jumpStrength;  // Apply jump strength (positive Y velocity)
    this.isJumping = false;  // Reset jumping flag after jump
  }

  // Update movement direction based on keys
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

  // Update the player's position
  playerObj.position.add(this.velocity);
}


private checkIfGrounded(playerObj: THREE.Object3D, scene: THREE.Scene): boolean {
  const raycaster = new THREE.Raycaster(playerObj.position, new THREE.Vector3(0, -1, 0));
  const intersects = raycaster.intersectObject(scene);  // Check intersection with the scene (ground)
  return intersects.length > 0 && intersects[0].distance < this.cameraHeight + 1; // Consider player as grounded if distance is small
}


  applyCombinedMovement(
    delta: number,
    playerObj: THREE.Object3D,
    controls: PointerLockControls,
    keyboardInput: { forward: boolean; backward: boolean; left: boolean; right: boolean },
    vrVector: THREE.Vector3,
    cameraQuat: THREE.Quaternion,
    isColliding: (pos: THREE.Vector3) => boolean
  ) {
    const inputVelocity = new THREE.Vector3();

    // 🎮 VR joystick input (if VR is enabled)
    if (vrVector.lengthSq() > 0.001) {
      const DEADZONE = 0.15;
      const filteredVR = vrVector.clone();

      if (Math.abs(filteredVR.x) < DEADZONE) filteredVR.x = 0;
      if (Math.abs(filteredVR.z) < DEADZONE) filteredVR.z = 0;

      const moveDir = filteredVR.applyQuaternion(cameraQuat);
      moveDir.y = 0;  // Keep the movement along the XZ plane
      moveDir.normalize();

      inputVelocity.add(moveDir.multiplyScalar(this.moveSpeed));
    }

    // ⌨️ Keyboard input
    const direction = new THREE.Vector3();
    if (keyboardInput.forward) direction.z -= 1;
    if (keyboardInput.backward) direction.z += 1;
    if (keyboardInput.left) direction.x -= 1;
    if (keyboardInput.right) direction.x += 1;

    if (direction.lengthSq() > 0) {
      direction.normalize();
      const rotated = direction.applyQuaternion(cameraQuat);
      rotated.y = 0;
      inputVelocity.add(rotated.multiplyScalar(this.moveSpeed));
    }

    // ➕ Add blended velocity
    this.velocity.addScaledVector(inputVelocity, delta);

    // 🧼 Apply friction after velocity update
    this.velocity.x *= Math.max(0, 1 - this.friction * delta);
    this.velocity.z *= Math.max(0, 1 - this.friction * delta);

    // Clamp small velocity to zero to stop drift
    const EPSILON = 0.001;
    if (Math.abs(this.velocity.x) < EPSILON) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < EPSILON) this.velocity.z = 0;

    // 🚶 Move with collision checks
    const moveX = this.velocity.x * delta;
    const moveZ = this.velocity.z * delta;
    const oldPos = playerObj.position.clone();

    controls.moveRight(moveX);
    if (isColliding(playerObj.position)) playerObj.position.x = oldPos.x;

    controls.moveForward(moveZ);
    if (isColliding(playerObj.position)) playerObj.position.z = oldPos.z;

    // Apply gravity and Y-axis movement
    playerObj.position.y += this.velocity.y * delta;
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
          //this.isJumping = true;
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

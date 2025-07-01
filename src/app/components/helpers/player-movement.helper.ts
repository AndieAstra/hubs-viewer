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
    public moveSpeed: number,
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

  // 🎮 VR joystick input
  if (vrVector.lengthSq() > 0.001) {
    const DEADZONE = 0.15;
    const filteredVR = vrVector.clone();

    // Deadzone filter
    if (Math.abs(filteredVR.x) < DEADZONE) filteredVR.x = 0;
    if (Math.abs(filteredVR.z) < DEADZONE) filteredVR.z = 0;

    // Rotate joystick movement to camera direction
    const moveDir = filteredVR.applyQuaternion(cameraQuat);
    moveDir.y = 0;
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
    // Rotate direction to camera
    const rotated = direction.applyQuaternion(cameraQuat);
    rotated.y = 0;
    inputVelocity.add(rotated.multiplyScalar(this.moveSpeed));
  }

  // 🧼 Apply friction
  this.velocity.x *= Math.max(0, 1 - this.friction * delta);
  this.velocity.z *= Math.max(0, 1 - this.friction * delta);

  // ➕ Add blended velocity
  this.velocity.addScaledVector(inputVelocity, delta);

  // 🚶 Move with collision checks
  const moveX = this.velocity.x * delta;
  const moveZ = this.velocity.z * delta;
  const oldPos = playerObj.position.clone();

  playerObj.position.x += moveX;
  if (isColliding(playerObj.position)) playerObj.position.x = oldPos.x;

  playerObj.position.z += moveZ;
  if (isColliding(playerObj.position)) playerObj.position.z = oldPos.z;

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

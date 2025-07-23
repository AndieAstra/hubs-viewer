import * as THREE from 'three';

export class VrControllerHelper {
  private deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
  public enabled = false;
  private targetQuaternion = new THREE.Quaternion();
  public movementVector = new THREE.Vector3(0, 0, 0);
  public moveSpeed: number;

  constructor(moveSpeed = 3.0) {
    this.moveSpeed = moveSpeed;
  }

  /** Starts listening to deviceorientation (with iOS permission flow) */
  async start() {
    if (this.enabled) return;
    this.enabled = true;

    if ((DeviceOrientationEvent as any).requestPermission) {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        if (res === 'granted') {
          window.addEventListener('deviceorientation', this.handleDeviceOrientation);
        } else {
          console.warn('DeviceOrientation permission denied');
        }
      } catch (err) {
        console.error('DeviceOrientation permission error', err);
      }
    } else {
      window.addEventListener('deviceorientation', this.handleDeviceOrientation);
    }
  }

  /** Stops gyroscope listening */
  stop() {
    this.enabled = false;
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
  }

  /** Internal handler updates raw alpha/beta/gamma */
  private handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    this.deviceOrientation.alpha = event.alpha ?? 0;
    this.deviceOrientation.beta  = event.beta  ?? 0;
    this.deviceOrientation.gamma = event.gamma ?? 0;
  };

  /** Converts the last orientation to a quaternion */
  getDeviceQuaternion(): THREE.Quaternion {
    const x = THREE.MathUtils.degToRad(this.deviceOrientation.beta);
    const y = THREE.MathUtils.degToRad(this.deviceOrientation.alpha);
    const z = THREE.MathUtils.degToRad(this.deviceOrientation.gamma);
    const euler = new THREE.Euler(x, y, z, 'ZXY');
    return new THREE.Quaternion().setFromEuler(euler);
  }

  /** To be called every frame: updates movementVector & targetQuaternion */
  update() {
    if (!this.enabled) return;
    // Gamepad fallback movement
    const gp = navigator.getGamepads?.()[0];
    if (gp) {
      const DEADZONE = 0.15;
      const axisX = Math.abs(gp.axes[0]) < DEADZONE ? 0 : gp.axes[0];
      const axisY = Math.abs(gp.axes[1]) < DEADZONE ? 0 : gp.axes[1];
      this.movementVector.set(axisX, 0, axisY);
    } else {
      this.movementVector.set(0, 0, 0);
    }
    // Prepare target quaternion from device
    this.targetQuaternion.copy(this.getDeviceQuaternion());
  }

  /**
   * Slerp camera toward the last device quaternion.
   * @param camera  The THREE.PerspectiveCamera to rotate
   * @param lerpFactor  How quickly to slerp (0–1)
   */
  applyRotation(camera: THREE.PerspectiveCamera, lerpFactor = 0.3) {
    camera.quaternion.slerp(this.targetQuaternion, lerpFactor);
  }

  /**
   * Immediately set camera rotation from a given Euler (in radians).
   * @param camera  The THREE.PerspectiveCamera to rotate
   * @param euler   The THREE.Euler containing rotation angles
   */
  public applyRotationFromEuler(
    camera: THREE.PerspectiveCamera,
    euler: THREE.Euler
  ): void {
    camera.quaternion.setFromEuler(euler);
  }

  /** Alias for start() to match your previous `enableInteractions` */
  public async enableInteractions(): Promise<void> {
    await this.start();
  }
}

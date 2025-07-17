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

  stop() {
    this.enabled = false;
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
  }

  private handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    this.deviceOrientation.alpha = event.alpha ?? 0;
    this.deviceOrientation.beta = event.beta ?? 0;
    this.deviceOrientation.gamma = event.gamma ?? 0;
  };


  getDeviceQuaternion(): THREE.Quaternion {
    const x = THREE.MathUtils.degToRad(this.deviceOrientation.beta);
    const y = THREE.MathUtils.degToRad(this.deviceOrientation.alpha);
    const z = THREE.MathUtils.degToRad(this.deviceOrientation.gamma);
    const euler = new THREE.Euler(x, y, z, 'ZXY');
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    return q;
  }


update() {
  if (!this.enabled) return;
  const gp = navigator.getGamepads?.()[0];
  if (gp) {
    const axisX = gp.axes[0] || 0;
    const axisY = gp.axes[1] || 0;

    const DEADZONE = 0.15;
    const x = Math.abs(axisX) < DEADZONE ? 0 : axisX;
    const y = Math.abs(axisY) < DEADZONE ? 0 : axisY;

    this.movementVector.set(x, 0, -y);
  } else {
    this.movementVector.set(0, 0, 0);
  }
  this.targetQuaternion.copy(this.getDeviceQuaternion());
}


  applyRotation(camera: THREE.PerspectiveCamera, lerpFactor = 0.3) {
    camera.quaternion.slerp(this.targetQuaternion, lerpFactor);
  }

  public async enableInteractions(): Promise<void> {
  await this.start();
}
}

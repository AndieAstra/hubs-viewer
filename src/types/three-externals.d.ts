declare module 'three/examples/jsm/controls/DeviceOrientationControls' {
  import { Camera, Event } from 'three';

  export class DeviceOrientationControls {
    constructor(camera: Camera);

    update(): void;
    connect(): void;
    disconnect(): void;
    dispose(): void;

    // Other methods and properties if needed
  }
}

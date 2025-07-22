declare module 'three/examples/jsm/controls/DeviceOrientationControls.js' {
  import { Camera } from 'three';
  export class DeviceOrientationControls {
    constructor(object: Camera);
    connect(): void;
    disconnect(): void;
    update(): void;
    dispose(): void;
    enabled: boolean;
  }
}

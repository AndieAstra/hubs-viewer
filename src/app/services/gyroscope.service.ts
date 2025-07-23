import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

// Declare Generic Sensor API types if they aren't in TS lib
declare class Gyroscope {
  constructor(options?: { frequency?: number });
  x: number;
  y: number;
  z: number;
  start(): void;
  stop(): void;
  addEventListener(event: 'reading', listener: () => void): void;
  removeEventListener(event: 'reading', listener: () => void): void;
}

export interface OrientationData {
  alpha: number;
  beta: number;
  gamma: number;
}

@Injectable({ providedIn: 'root' })
export class GyroscopeService implements OnDestroy {
  public cleanup: () => void = () => {};

  constructor(private ngZone: NgZone) {}

  requestPermission(): Promise<'granted' | 'denied'> {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      return (DeviceOrientationEvent as any).requestPermission();
    }
    return Promise.resolve('granted');
  }

  observeOrientation(): Observable<OrientationData> {
    return new Observable((subscriber: Subscriber<OrientationData>) => {
      const onData = (data: OrientationData) => subscriber.next(data);

      const initDeviceOrientation = () => {
        const handler = (evt: DeviceOrientationEvent) => {
          this.ngZone.run(() => {
            onData({
              alpha: evt.alpha ?? 0,
              beta: evt.beta ?? 0,
              gamma: evt.gamma ?? 0,
            });
          });
        };
        window.addEventListener('deviceorientation', handler);
        this.cleanup = () => window.removeEventListener('deviceorientation', handler);
      };

      const initGenericGyro = () => {
        try {
          const gyro = new (window as any).Gyroscope({ frequency: 60 });
          const listener = () => {
            this.ngZone.run(() => {
              onData({
                alpha: gyro.x,
                beta: gyro.y,
                gamma: gyro.z,
              });
            });
          };
          gyro.addEventListener('reading', listener);
          gyro.start();
          this.cleanup = () => {
            gyro.removeEventListener('reading', listener);
            gyro.stop();
          };
        } catch {
          initDeviceOrientation();
        }
      };

      // Permission + init
      this.requestPermission().then(resp => {
        if (resp === 'granted') {
          if ('Gyroscope' in window) initGenericGyro();
          else initDeviceOrientation();
        } else {
          subscriber.error('Permission denied');
        }
      }).catch(err => subscriber.error(err));

      return () => this.cleanup();
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}

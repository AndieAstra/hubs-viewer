import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { GyroscopeService, OrientationData } from '../../services/gyroscope.service';

@Component({
  selector: 'app-device-orientation-test',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './device-orientation-test.component.html',
  styleUrls: ['./device-orientation-test.component.scss']
})
export class DeviceOrientationTestComponent implements OnInit, OnDestroy {
  alpha = 0;
  beta = 0;
  gamma = 0;
  supported = false;
  listening = false;
  errorMsg = '';

  private sub!: Subscription;

  constructor(private gyroService: GyroscopeService) {}

  ngOnInit(): void {
    // Detect only in secure contexts
    this.supported = typeof DeviceOrientationEvent !== 'undefined';
  }

  async start(): Promise<void> {
    this.errorMsg = '';
    try {
      const perm = await this.gyroService.requestPermission();
      if (perm !== 'granted') {
        this.errorMsg = 'Permission denied';
        return;
      }

      if (!this.supported) {
        this.errorMsg = 'Gyroscope not supported';
        return;
      }

      this.listening = true;
      this.sub = this.gyroService.observeOrientation().subscribe({
        next: ({ alpha, beta, gamma }: OrientationData) => {
          this.alpha = alpha;
          this.beta = beta;
          this.gamma = gamma;
        },
        error: (err: any) => {
          this.errorMsg = 'Sensor error: ' + err;
          this.listening = false;
        }
      });
    } catch (err: any) {
      this.errorMsg = 'Error: ' + err;
    }
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.listening = false;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}

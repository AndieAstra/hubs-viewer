import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lighting',
  standalone: true,
  imports: [
    FormsModule
  ],
template: `
    <div>
      <label>Light Color: <input type="color" [(ngModel)]="color" /></label>
      <label>Intensity: <input type="range" min="0" max="2" step="0.1" [(ngModel)]="intensity" /></label>
      <button (click)="addLight()">Add Light</button>
    </div>
  `,
  styleUrl: './lighting.component.scss'
})
export class LightingComponent {
  color: string = '#ffffff';
  intensity: number = 1;

  @Output() lightAdded = new EventEmitter<{ color: string; intensity: number }>();

  addLight() {
    this.lightAdded.emit({
      color: this.color,
      intensity: this.intensity,
    });
  }
}

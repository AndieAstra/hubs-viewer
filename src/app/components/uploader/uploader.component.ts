import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [],
template: `
    <input type="file" (change)="onFileSelected($event)" accept=".glb,.gltf" />
  `,
  styleUrl: './uploader.component.scss'
})
export class UploaderComponent {
  @Output() fileLoaded = new EventEmitter<File>();

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileLoaded.emit(input.files[0]);
    }
  }
}

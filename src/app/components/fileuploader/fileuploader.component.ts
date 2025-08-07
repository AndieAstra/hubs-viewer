import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-fileuploader',
  standalone: true,
  imports: [],
  // Use either template or templateUrl, NOT both:
  template: `
    <input type="file" (change)="onFileSelected($event)" accept=".glb,.gltf" />
  `,
  styleUrls: ['./fileuploader.component.scss']  // plural!
})
export class FileuploaderComponent {
  @Output() fileLoaded = new EventEmitter<File>();

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileLoaded.emit(input.files[0]);
    }
  }
}

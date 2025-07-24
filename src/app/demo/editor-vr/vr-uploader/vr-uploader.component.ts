import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-vr-uploader',
  standalone: true,
  imports: [],
  templateUrl: './vr-uploader.component.html',
  styleUrl: './vr-uploader.component.scss'
})
export class VrUploaderComponent {

  @Output() fileLoaded = new EventEmitter<File>();

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileLoaded.emit(input.files[0]);
    }
  }
}

import { Component, ViewChild, ElementRef, HostListener, AfterViewInit } from '@angular/core';
import { UploaderComponent } from '../../components/uploader/uploader.component';
import { ViewerComponent } from '../../components/viewer/viewer.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [UploaderComponent, ViewerComponent, FormsModule],
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.scss']
})
export class ViewerPageComponent implements AfterViewInit {

  @ViewChild('viewerCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild(ViewerComponent) viewerComponent!: ViewerComponent;

  selectedFile?: File;

  ngAfterViewInit() {
    this.resizeCanvas();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;

    if (container) {
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width;
      canvas.height = height;

      // Inform viewer component to update renderer and camera
      if (this.viewerComponent && this.viewerComponent.onResize) {
        this.viewerComponent.onResize(width, height);
      }
    }
  }

  onFileLoaded(file: File): void {
    this.selectedFile = file;
  }
}

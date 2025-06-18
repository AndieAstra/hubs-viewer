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
   @ViewChild(ViewerComponent) viewer!: ViewerComponent;

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

  resetView() {
    this.viewer.resetView();
  }

  toggleWireframe() {
    this.viewer.toggleWireframe();
  }

  clearModel() {
    this.viewer.clearModel();
  }

// Rest of the button controls for ThreeJS

  lightColor() {
    this.viewer.onLightcolor();
  }

  // roomLight() {
  //   this.viewer.
  // }

  // sunLight() {
  //   this.viewer.
  // }

  // Speed() {
  //   this.viewer.
  // }

  // eyeLevel() {
  //   this.viewer.
  // }

   Save() {
     this.viewer.saveScene();
   }

  //  Load(file: File) {
  //     this.selectedFile = uploadSceneFromFile();
  //  }

  // Size() {
  //   this.viewer.
  // }

   Height() {
     this.viewer.updateCameraHeight();
   }

  // ************************************************************

// updateSunlight() {
//   // Update Three.js light intensity or direction
// }

// updateSpeed() {
//   // Update model movement speed
// }

// updateEyeLevel() {
//   // Adjust camera Y position
// }

// updateModelSize() {
//   // Scale the model
// }

// updateModelHeight() {
//   // Move model up/down
// }


}

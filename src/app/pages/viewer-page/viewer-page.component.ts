import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit
} from '@angular/core';
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

  @ViewChild('viewerCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild(ViewerComponent) viewer!: ViewerComponent;

  selectedFile?: File;
  sidebarCollapsed = false;

  ngAfterViewInit() {
    this.resizeCanvas();

  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);


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

    if (this.viewer?.onResize) {
      this.viewer.onResize(width, height);
    }
  }
}


   onFileLoaded(file: File): void {
    this.selectedFile = file;
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.onFileLoaded(file);
    }
  }

  // Scene Buttons
  resetView(): void {
    this.viewer?.resetView?.();
  }

  toggleWireframe(): void {
    this.viewer?.toggleWireframe?.();
  }

  clearModel(): void {
    this.viewer?.clearModel?.();
  }

  save(): void {
    this.viewer?.save?.();
  }

  load(): void {
    this.viewer?.load?.();
  }

  // Light Controls
  toggleRoomLight(): void {
    this.viewer?.toggleRoomLight?.();
  }

// *****************************************
// These buttons are not working yet

  toggleLightcolor(): void {
    this.viewer?.toggleLightcolor?.();
  }

 updateSunlight(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.viewer?.updateSunlight?.(input.valueAsNumber);
}

updateSpeed(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.viewer?.updateSpeed?.(input.valueAsNumber);
}

updateEyeLevel(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.viewer?.updateEyeLevel?.(input.valueAsNumber);
}

updateModelSize(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.viewer?.updateModelSize?.(input.valueAsNumber);
}

updateModelHeight(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.viewer?.updateModelHeight?.(input.valueAsNumber);
}

// *****************************************

}

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

  toggleLightcolor(): void {
    this.viewer?.toggleLightcolor?.();
  }

//
//
onSunlightInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = input.valueAsNumber;
  this.updateSunlight(value); // pass number to actual update method
}

updateSunlight(value: number): void {
  // Do something with the numeric value
  console.log('Updated sunlight value:', value);
}
//
//
onSpeedInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.updateSpeed(input.valueAsNumber);
}

updateSpeed(value: number): void {
  this.viewer?.updateSpeed?.(value);
}
//
//

onEyeLevelInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.updateEyeLevel(input.valueAsNumber);
}

updateEyeLevel(value: number): void {
  this.viewer?.updateEyeLevel?.(value);
}
//
//

onModelSizeInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.updateModelSize(input.valueAsNumber);
}

updateModelSize(value: number): void {
  this.viewer?.updateModelSize?.(value);
}
//
//
onModelHeightInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.updateModelHeight(input.valueAsNumber);
}

updateModelHeight(value: number): void {
  this.viewer?.updateModelHeight?.(value);
}
//
//

// *****************************************

}

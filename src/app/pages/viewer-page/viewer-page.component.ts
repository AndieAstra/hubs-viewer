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

  showConsole = true;

  // Console log messages
  consoleMessages: string[] = [];

  ngAfterViewInit() {
    this.resizeCanvas();

  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
  }

  // Log messages to UI console
  logToConsole(message: string): void {
    this.consoleMessages.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    // Keep only the last 50 messages to prevent overflow
    if (this.consoleMessages.length > 50) {
      this.consoleMessages.shift();
    }
  }

  toggleConsole(): void {
  this.showConsole = !this.showConsole;
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
    this.logToConsole(`File loaded: ${file.name}`);
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
    this.logToConsole('Reset camera view.');
  }

  toggleWireframe(): void {
    this.viewer?.toggleWireframe?.();
    this.logToConsole('Toggled wireframe.');
  }

  clearModel(): void {
    this.viewer?.clearModel?.();
    this.logToConsole('Cleared model.');
  }

  save(): void {
    this.viewer?.save?.();
    this.logToConsole('Saved scene.');
  }

  load(): void {
    this.viewer?.load?.();
    this.logToConsole('Loaded scene.');
  }

  // Light Controls
  toggleRoomLight(): void {
    this.viewer?.toggleRoomLight?.();
    this.logToConsole('Toggled room light.');
  }

  toggleLightcolor(): void {
    this.viewer?.toggleLightcolor?.();
    this.logToConsole('Toggled sunlight color.');
  }

//
//
onSunlightInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = input.valueAsNumber;
  this.updateSunlight(value); // pass number to actual update method
}

updateSunlight(value: number): void {
  this.viewer?.updateSunlight?.(value);
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
  this.logToConsole(`Updated camera speed to ${value}`);
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
  this.logToConsole(`Updated eye level to ${value}`);
}
//
//
onModelHeightInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.updateModelHeight(input.valueAsNumber);
}

updateModelHeight(value: number): void {
  this.viewer?.updateModelHeight?.(value);
  this.logToConsole(`Updated model height to ${value}`);
}
//

// *****************************************

}

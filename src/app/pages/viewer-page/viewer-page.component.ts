
  import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit,
  ApplicationModule
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { Router } from '@angular/router';
import { ViewerComponent } from '../../components/viewer/viewer.component';
import { TranslateModule } from '@ngx-translate/core';
import { FileuploaderComponent } from '../../components/fileuploader/fileuploader.component';
import { SceneControlsService } from '../../services/scene-controls.service';
import { FullscreenHelper } from '../../helpers/fullscreen.helper';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [
    FormsModule,
    ApplicationModule,
    ViewerComponent,
    TranslateModule,
    FileuploaderComponent
  ],
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.scss'],
})
export class ViewerPageComponent implements AfterViewInit {

  constructor(
    private router: Router,
     private sceneControls: SceneControlsService,
     private storageService: StorageService,
  ) {}

  @HostListener('window:resize')
  onWindowResize() {
    this.resizeCanvas();
  }

  @ViewChild('viewerCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild(ViewerComponent) viewer!: ViewerComponent;

    get isPortrait(): boolean {
    return window.matchMedia("(orientation: portrait)").matches;
  }

 showRotateWarning = false;

 get fs(): FullscreenHelper | undefined { return this.fs; }

  selectedFile?: File;
  sidebarCollapsed = false;
  showConsole = true;
  consoleMessages: string[] = [];

  sunIntensity = 1;
  sunlightColor = '#ffffff';

  ngAfterViewInit() {
    this.resizeCanvas();

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);

    if (!localStorage.getItem('hasSeenTutorial')) {
      this.startTutorial();
      localStorage.setItem('hasSeenTutorial', 'true');
    }
  }

  logToConsole(message: string): void {
    this.consoleMessages.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    if (this.consoleMessages.length > 50) {
      this.consoleMessages.shift();
    }
  }

  toggleConsole(): void {
    this.showConsole = !this.showConsole;
  }

    onResize(): void {
    this.resizeCanvas();

    if (this.isPortrait) {
      this.showRotateWarning = true;
      if (this.fs?.isActive()) {
      }
    } else {
      this.showRotateWarning = false;
    }
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

  // likes to be a specific button
onFileLoaded(file: File): void {
  this.selectedFile = file;
  this.logToConsole(`File loaded: ${file.name}`);

  // Assuming you have a loadGLB method in ViewerComponent
  if (this.viewer?.loadGLB) {
    this.viewer.loadGLB(file);
  } else {
    this.logToConsole('Error: loadGLB method not found.');
  }
}

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.onFileLoaded(file);
    }
  }

  // resetView(): void {
  //   this.viewer?.resetView?.();
  //   this.logToConsole('Reset camera view.');
  // }

  resetView(): void {
    if (!this.viewer) return;
    const { camera, controls } = this.viewer;
    this.sceneControls.resetCameraView(camera, controls);
    this.storageService.logToConsole('VIEWER.RESET_VIEW');
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

  toggleRoomLight(): void {
    this.viewer?.toggleRoomLight?.();
    this.logToConsole('Toggled room light.');
  }

  // toggleLightcolor(): void {
  //   this.viewer?.toggleLightcolor?.();
  //   this.logToConsole('Toggled sunlight color.');
  // }

  // onSunlightInput(event: Event): void {
  //   const input = event.target as HTMLInputElement;
  //   const value = input.valueAsNumber;
  //   this.updateSunlight(value);
  // }

    onSunlightInput(evt: Event): void {
      const val = +(evt.target as HTMLInputElement).value;
      this.sunIntensity = val;
      if (this.viewer?.directional) {
        this.sceneControls.updateSunlightIntensity(this.viewer.directional, val);
      }
    }

  onLightColorChange(evt: Event): void {
  const hex = (evt.target as HTMLInputElement).value;
  this.sceneControls.changeSunlightColor(hex);
  this.logToConsole(`Sunlight colour → ${hex}`);
}

  updateSunlight(value: number): void {
    this.viewer?.updateSunlight?.(value);
    console.log('Updated sunlight value:', value);
  }

  onSpeedInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateSpeed(input.valueAsNumber);
  }

  updateSpeed(value: number): void {
    this.viewer?.updateSpeed?.(value);
    this.logToConsole(`Updated camera speed to ${value}`);
  }

  onEyeLevelInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateEyeLevel(input.valueAsNumber);
  }

  updateEyeLevel(value: number): void {
    this.viewer?.updateEyeLevel?.(value);
  }

  onModelSizeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateModelSize(input.valueAsNumber);
  }

  updateModelSize(value: number): void {
    this.viewer?.updateModelSize?.(value);
    this.logToConsole(`Updated eye level to ${value}`);
  }

  onModelHeightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateModelHeight(input.valueAsNumber);
  }

  updateModelHeight(value: number): void {
    this.viewer?.updateModelHeight?.(value);
    this.logToConsole(`Updated model height to ${value}`);
  }


// ************* Bug Report **********************

openBugReport() {
  // Navigate to the bug report page or open a modal
  this.router.navigate(['/bug-report']); // Make sure route exists
}

// ============================
// Shepherd Tutorial
// ============================
startTutorial(): void {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: {
        enabled: true
      },
      scrollTo: { behavior: 'smooth', block: 'center' },
      classes: 'shepherd-theme-default',
      modalOverlayOpeningPadding: 8,
      modalOverlayOpeningRadius: 8,
      canClickTarget: false,
      when: {
        show() {
          if (this.el) {
            document.body.appendChild(this.el);
          }
        }
      }
    }
  });

  tour.addStep({
    id: 'welcome',
    text: 'Welcome! Let’s take a quick tour of this 3D playground.',
    buttons: [{ text: 'Next', action: tour.next }]
  });

  tour.addStep({
    id: 'upload',
    attachTo: {
      element: '.upload-instructions',
      on: 'bottom'
    },
    text: 'Start by uploading a 3D model here.',
    buttons: [
      { text: 'Back', action: tour.back },
      { text: 'Next', action: tour.next }
    ]
  });

  tour.addStep({
    id: 'scene-controls',
    attachTo: {
      element: '.sidebar-left',
      on: 'right'
    },
    text: 'Use these buttons to save, load, and reset your scene.',
    buttons: [
      { text: 'Back', action: tour.back },
      { text: 'Next', action: tour.next }
    ]
  });

  tour.addStep({
    id: 'canvas',
    attachTo: {
      element: '.canvas-container',
      on: 'top'
    },
    text: 'Here’s where your 3D model will appear.',
    buttons: [
      { text: 'Back', action: tour.back },
      { text: 'Next', action: tour.next }
    ]
  });

  tour.addStep({
    id: 'console',
    attachTo: {
      element: '.bottom-bar',
      on: 'top'
    },
    text: 'Console logs and messages appear here.',
    buttons: [
      { text: 'Back', action: tour.back },
      { text: 'Next', action: tour.next }
    ]
  });

  tour.addStep({
    id: 'model-camera-controls',
    attachTo: {
      element: '.sidebar-right',
      on: 'left'
    },
    text: 'Change your model and camera settings here.',
    buttons: [
      { text: 'Back', action: tour.back },
      { text: 'Done', action: tour.complete }
    ]
  });

  // Set localStorage when the tour completes or is cancelled
  const markTutorialSeen = () => localStorage.setItem('hasSeenTutorial', 'true');
  tour.on('complete', markTutorialSeen);
  tour.on('cancel', markTutorialSeen);

  // Highlight the current step's target element
  tour.on('show', () => {
    const currentStep = tour.getCurrentStep();
    const el = currentStep?.options.attachTo?.element;
    if (typeof el === 'string') {
      document.querySelector(el)?.classList.add('shepherd-highlight');
    }
  });

  // Remove highlight from all elements
  tour.on('hide', () => {
    document.querySelectorAll('.shepherd-highlight')
      .forEach(el => el.classList.remove('shepherd-highlight'));
  });

  tour.start();
}

// -------------------------------------------------

toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

enterVRMode() {
  this.viewer?.toggleVRMode(true);
}

exitVRMode() {
  this.viewer?.toggleVRMode(false);
}


}

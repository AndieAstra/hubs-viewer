import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { ViewerComponent } from '../../components/viewer/viewer.component';
import { FormsModule } from '@angular/forms';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SceneControlsService } from '../../services/scene-controls.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [ViewerComponent, FormsModule, TranslateModule],
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.scss'],
})
export class ViewerPageComponent implements AfterViewInit {
  @ViewChild('viewerCanvas', { static: false }) viewerCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewer', { static: false }) viewer?: ViewerComponent;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  selectedFile?: File;
  sidebarCollapsed = false;
  showConsole = true;
  consoleMessages: string[] = [];

  currentLang: 'en' | 'es' = 'en';

  sunIntensity = 1;

  constructor(
    private router: Router,
    private translate: TranslateService,
    private storageService: StorageService,
    private sceneControls: SceneControlsService
  ) {
    const savedLang = (localStorage.getItem('preferredLang') as 'en' | 'es') || 'en';
    this.currentLang = savedLang;
    this.translate.setDefaultLang('en');
    this.translate.use(this.currentLang);
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.resizeCanvas();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeCanvas();
  }

  ngAfterViewInit(): void {

    this.consoleMessages = this.storageService.consoleMessages;

    if (!this.viewer) {
      console.error('Viewer reference is missing.');
      return;
    }

    // Resize canvas inside the viewer component or its container
    this.resizeCanvas();

    // Provide viewer ref to sceneControls service
    this.sceneControls.viewerRef = this.viewer;

    // Sync storage service references
    this.storageService.viewerRef = this.viewer;

    // Just in case trigger a window resize event
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  // ----- UI Console -----

  toggleConsole(): void {
    this.showConsole = !this.showConsole;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  // ----- Canvas Sizing -----

  resizeCanvas(): void {
    if (!this.viewer) {
      console.error('Viewer reference is missing.');
      return;
    }

    // Assume the viewer component exposes a container for Three.js canvas
    // and has a resize method on it (as your viewer component seems to have)

    // If you want to resize based on the viewer container's size:
    const container = this.viewer.sceneContainerRef?.nativeElement ?? null;
    if (!container) {
      console.error('Viewer container element is missing.');
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    console.log(`Resizing viewer canvas to: ${width}x${height}`);

    // Call viewer's resize handler to update camera, renderer, etc.
    this.viewer.onResize?.(width, height);

    // Also try to update the renderer size if exposed
    if (this.viewer.renderer) {
      this.viewer.renderer.setSize(width, height);
    }
  }

  exitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.warn('Failed to exit fullscreen:', err);
      });
    }
  }

  onUploadClick(): void {
    this.fileInput?.nativeElement.click();
  }

  saveScene(): void {
    if (!this.viewer) {
      console.error('Viewer reference is missing.');
      return;
    }
    this.storageService.saveSceneAsJson(this.viewer);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.viewer) return;

  /* was: storageService.clearSceneAndLoadFile(file) */
    this.viewer.loadFile(file);                 // 👈 hand it straight to the viewer
    this.storageService.logToConsole(`Loaded file: ${file.name}`);
  }

  // ----- Model & Viewer controls -----

  onModelSizeInput(event: Event): void {
    this.viewer?.onModelSizeChange(event);
  }

  onModelHeightInput(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    if (this.viewer?.uploadedModel) {
      this.sceneControls.updateModelHeight(this.viewer.uploadedModel, val);
    }
  }

  onSpeedInput(evt: Event): void {
    const value = +(evt.target as HTMLInputElement).value;   // to number
    this.viewer?.setWalkSpeed(value);
  }

  onEyeLevelInput(event: Event): void {
    this.viewer?.onEyeLevelChange(event);
  }

  resetView(): void {
    if (!this.viewer) return;

    const { camera, controls } = this.viewer;
    this.sceneControls.resetCameraView(camera, controls);
    this.storageService.logToConsole('VIEWER.RESET_VIEW');
  }

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
  this.storageService.logToConsole(`Sunlight colour → ${hex}`);
}

  toggleRoomLight() {
    const amb = this.viewer?.sceneManager?.ambientLight;
    if (amb) this.sceneControls.toggleRoomLight(amb);
  }

  toggleWireframe(): void {
    const model = this.viewer?.uploadedModel;
    if (!model) return;

    this.sceneControls.toggleWireframe(model, (msgKey) => {
      this.storageService.logToConsole(msgKey);
    });
  }

  // ---- Bug Report Button -------

  openBugReport(): void {
    this.router.navigate(['/bug-report']);
  }

  // ---- Tutorial -------

  startTutorial(): void {
    const t = (key: string) => this.translate.instant(key);

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: 'smooth', block: 'center' },
        classes: 'shepherd-theme-default',
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8,
        canClickTarget: false,
      },
    });

    tour.addStep({
      id: 'welcome',
      text: t('START_TUTORIAL'),
      buttons: [{ text: 'Next', action: tour.next }],
    });
    tour.addStep({
      id: 'upload',
      attachTo: { element: '.upload-instructions', on: 'bottom' },
      text: t('UPLOAD_INSTRUCTION'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Next', action: tour.next },
      ],
    });
    tour.addStep({
      id: 'scene-controls',
      attachTo: { element: '.sidebar-left', on: 'right' },
      text: t('SCENE_SETTINGS'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Next', action: tour.next },
      ],
    });
    tour.addStep({
      id: 'canvas',
      attachTo: { element: '.canvas-container', on: 'top' },
      text: t('MODEL_SETTINGS'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Next', action: tour.next },
      ],
    });
    tour.addStep({
      id: 'console',
      attachTo: { element: '.bottom-bar', on: 'top' },
      text: t('CONSOLE_SHEPHARD'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Next', action: tour.next },
      ],
    });
    tour.addStep({
      id: 'finish',
      attachTo: { element: '.sidebar-right', on: 'left' },
      text: t('FINISH_TUTORIAL'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Done', action: tour.complete },
      ],
    });

    const markTutorialSeen = () => localStorage.setItem('hasSeenTutorial', 'true');
    tour.on('complete', markTutorialSeen);
    tour.on('cancel', markTutorialSeen);

    tour.on('show', () => {
      const currentStep = tour.getCurrentStep();
      const el = currentStep?.options.attachTo?.element;
      if (typeof el === 'string') {
        document.querySelector(el)?.classList.add('shepherd-highlight');
      }
    });

    tour.on('hide', () => {
      document.querySelectorAll('.shepherd-highlight').forEach((el) => el.classList.remove('shepherd-highlight'));
    });

    tour.start();
  }

  // ----- Language -----

  switchLanguage(lang: 'en' | 'es'): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('preferredLang', lang);
  }

  // ----- VR Mode -----

  enterVRMode(): void {
    this.viewer?.enterVR();

    // If you want to resize the viewer canvas to fullscreen here,
    // you should do it through the viewer component or container, not a separate canvas
    const container = this.viewer?.sceneContainerRef?.nativeElement;
    if (container) {
      Object.assign(container.style, {
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: '0',
        left: '0',
        display: 'block',
      });
    }

    setTimeout(() => this.resizeCanvas(), 200);
  }

  exitVRMode(): void {
    this.viewer?.exitVR();
  }
}

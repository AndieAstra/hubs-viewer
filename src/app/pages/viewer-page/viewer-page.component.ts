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
  // Only define these once
  @ViewChild('viewerCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('viewer', { static: true }) viewerRef!: ViewerComponent;

  selectedFile?: File;
  sidebarCollapsed = false;
  showConsole = true;
  consoleMessages: string[] = [];

  currentLang: 'en' | 'es' = 'en';

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
    if (!this.canvasRef || !this.viewerRef) {
      console.error('Canvas reference or Viewer reference is missing.');
      return;
    }

    this.resizeCanvas();
    this.sceneControls.viewerRef = this.viewerRef;

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);

    if (!localStorage.getItem('hasSeenTutorial')) {
      // Tutorial prompt logic if needed
    }
  }

  // ----- UI Console Methods -----

  logToConsole(key: string, params?: any): void {
    const timeStamp = new Date().toLocaleTimeString();
    const message = this.translate.instant(key, params);
    this.consoleMessages.push(`[${timeStamp}] ${message}`);
    if (this.consoleMessages.length > 50) {
      this.consoleMessages.shift();
    }
  }

  toggleConsole(): void {
    this.showConsole = !this.showConsole;
  }

  // ----- Canvas Sizing -----

  resizeCanvas(): void {
    if (!this.canvasRef || !this.viewerRef) {
      console.error('Canvas reference or Viewer reference is missing.');
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) {
      console.error('Canvas container not found.');
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    console.log(`Resizing canvas to: ${width}x${height}`);

    canvas.width = width;
    canvas.height = height;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    this.viewerRef.onResize?.(width, height);
    this.viewerRef.renderer?.setSize?.(width, height);
  }

  exitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.warn('Failed to exit fullscreen:', err);
      });
    }
  }

  // ----- Input Binding Handlers -----

  onModelSizeInput(event: Event): void {
    this.viewerRef.onModelSizeChange(event);
  }

  onModelHeightInput(event: Event): void {
    this.viewerRef.onModelHeightChange(event);
  }

  onSpeedInput(event: Event): void {
    this.viewerRef.onCameraSpeedChange(event);
  }

  onSunlightInput(event: Event): void {
    this.viewerRef.onSunlightIntensityChange(event);
  }

  onEyeLevelInput(event: Event): void {
    this.viewerRef.onEyeLevelChange(event);
  }

  resetView(): void {
    const { camera, controls } = this.viewerRef;
    this.sceneControls.resetCameraView(camera, controls);
    this.logToConsole('VIEWER.RESET_VIEW');
  }

  onLightColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    this.sceneControls.changeLightColorByValue(color);
    this.logToConsole(`Changed light color to ${color}`);
  }

  toggleRoomLight(): void {
    const light = this.viewerRef?.ambientLight;
    if (!light) return;

    this.sceneControls.toggleRoomLight(light);
    this.logToConsole('VIEWER.TOGGLE_ROOM_LIGHT');
  }

  toggleWireframe(): void {
    const model = this.viewerRef?.uploadedModel;
    if (!model) return;

    this.sceneControls.toggleWireframe(model, (msgKey) => {
      this.logToConsole(msgKey);
    });
  }

  // ---- Bug Report Button -------

  openBugReport(): void {
    this.router.navigate(['/bug-report']);
  }

  // ---- Tutorial -------

  startTutorial(): void {
    console.log('Tutorial started');
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
    this.viewerRef?.enterVR();

    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      Object.assign(canvas.style, {
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
    this.viewerRef?.exitVR();
  }
}

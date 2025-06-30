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
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [
    UploaderComponent,
    ViewerComponent,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.scss']
})
export class ViewerPageComponent implements AfterViewInit {

  constructor(
    private router: Router,
    private translate: TranslateService
  ) {
    const savedLang = localStorage.getItem('preferredLang') as 'en' | 'es' || 'en';
    this.currentLang = savedLang;
    this.translate.setDefaultLang('en');
    this.translate.use(this.currentLang);
  }

  @ViewChild(ViewerComponent) viewerRef!: ViewerComponent;
  @ViewChild('viewerCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild(ViewerComponent) viewer!: ViewerComponent;


  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    this.resizeCanvas();
  }

  selectedFile?: File;
  sidebarCollapsed = false;
  showConsole = true;
  consoleMessages: string[] = [];

  currentLang: 'en' | 'es' = 'en';

  ngAfterViewInit() {
    this.resizeCanvas();

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);

    if (!localStorage.getItem('hasSeenTutorial')) {
      this.startTutorial();
    }

    console.log('ViewerComponent initialized:', this.viewerRef);
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

  @HostListener('window:resize')
  onWindowResize() {
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvasRef || !this.viewer) return;

    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;

    if (container) {
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width;
      canvas.height = height;

      this.viewer.onResize?.(width, height);
      this.viewer.renderer?.setSize?.(width, height); // ✅ Ensures Three.js resizes properly
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

// ******************* Buttons ***********************

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

  toggleRoomLight(): void {
    this.viewer?.toggleRoomLight?.();
    this.logToConsole('Toggled room light.');
  }

  toggleLightcolor(): void {
    this.viewer?.toggleLightcolor?.();
    this.logToConsole('Toggled sunlight color.');
  }

  onSunlightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.valueAsNumber;
    this.updateSunlight(value);
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
    this.logToConsole(`Updated model size to ${value}`);
  }

  onModelHeightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateModelHeight(input.valueAsNumber);
  }

  updateModelHeight(value: number): void {
    this.viewer?.updateModelHeight?.(value);
    this.logToConsole(`Updated model height to ${value}`);
  }

  openBugReport() {
    this.router.navigate(['/bug-report']);
  }


//  ****************** Shephard Tutorial ********************

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
      text: t('TITLE_SHEPHARD'),
      buttons: [{ text: 'Next', action: tour.next }]
    });

    tour.addStep({
      id: 'upload',
      attachTo: { element: '.upload-instructions', on: 'bottom' },
      text: t('UPLOAD_INSTRUCTION') + '. ' + t('MOVEMENT_TIPS'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Next', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'scene-controls',
      attachTo: { element: '.sidebar-left', on: 'right' },
      text: t('SCENE_SETTINGS'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Next', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'canvas',
      attachTo: { element: '.canvas-container', on: 'top' },
      text: t('MODEL_SETTINGS'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Next', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'console',
      attachTo: { element: '.bottom-bar', on: 'top' },
      text: t('CONSOLE_SHEPHARD'),
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Next', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'model-camera-controls',
      attachTo: { element: '.sidebar-right', on: 'left' },
      text: `${t('CAMERA_MOVEMENT')}, ${t('SIZE')}, ${t('HEIGHT')}`,
      buttons: [
        { text: 'Back', action: tour.back },
        { text: 'Done', action: tour.complete }
      ]
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
      document.querySelectorAll('.shepherd-highlight')
        .forEach(el => el.classList.remove('shepherd-highlight'));
    });

    tour.start();
  }

    switchLanguage(lang: 'en' | 'es'): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('preferredLang', lang);
  }

// ************* VR Mode *********************

  enterVRMode() {
  this.viewerRef?.enterVR();

  // Apply forced styles if necessary
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

  // Resize again after small delay (some mobile browsers need this)
  setTimeout(() => this.resizeCanvas(), 200);
  }

  exitVRMode() {
    this.viewerRef?.exitVR();
  }

}

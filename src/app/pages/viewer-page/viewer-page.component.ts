import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit,
  Input
} from '@angular/core';
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

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @HostListener('document:fullscreenchange', )
  onFullscreenChange() {
    this.resizeCanvas();
  }

  @HostListener('window:resize')

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
  }

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

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

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
      this.viewer.renderer?.setSize?.(width, height);
    }
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.onFileLoaded(file);
    }
  }





    onUploadClick(): void {
      this.fileInput?.nativeElement.click();
    }

    onFileChange(event: Event): void {
      const input = event.target as HTMLInputElement;
      const file = input?.files?.[0];

      if (file) {
        this.onFileLoaded(file);
      }
    }

    onFileLoaded(file: File): void {
      this.selectedFile = file;
      this.logToConsole(`File loaded: ${file.name}`);
    }

    resetView(): void {
      this.viewer?.resetView?.();
      this.logToConsole('VIEWER.RESET_VIEW');
    }

    toggleWireframe(): void {
      this.viewer?.toggleWireframe?.();
      this.logToConsole('VIEWER.TOGGLE_WIREFRAME');
    }

    clearModel(): void {
      this.viewer?.clearModel?.();
      this.logToConsole('VIEWER.CLEAR_MODEL');
    }

    save(): void {
      this.viewer?.save?.();
      this.logToConsole('VIEWER.SAVE_SCENE');
    }

    load(): void {
      this.viewer?.load?.();
      this.logToConsole('VIEWER.LOAD_SCENE');
    }

    toggleRoomLight(): void {
      this.viewer?.toggleRoomLight?.();
      this.logToConsole('VIEWER.TOGGLE_ROOM_LIGHT');
    }

    toggleLightcolor(): void {
      this.viewer?.toggleLightcolor?.();
      this.logToConsole('VIEWER.TOGGLE_SUNLIGHT_COLOR');
    }

    onSunlightInput(event: Event): void {
      const input = event.target as HTMLInputElement;
      const value = input.valueAsNumber;
      this.updateSunlight(value);
    }

    updateSunlight(value: number): void {
      this.viewer?.updateSunlight?.(value);
      this.logToConsole('VIEWER.UPDATED_SUNLIGHT_VALUE', { value });
    }

    onSpeedInput(event: Event): void {
      const input = event.target as HTMLInputElement;
      this.updateSpeed(input.valueAsNumber);
    }

    updateSpeed(value: number): void {
      this.viewer?.updateSpeed?.(value);
      this.logToConsole('VIEWER.UPDATED_CAMERA_SPEED', { value });
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
      this.logToConsole('VIEWER.UPDATED_MODEL_SIZE', { value });
    }

    onModelHeightInput(event: Event): void {
      const input = event.target as HTMLInputElement;
      this.updateModelHeight(input.valueAsNumber);
    }

    updateModelHeight(value: number): void {
      this.viewer?.updateModelHeight?.(value);
      this.logToConsole('VIEWER.UPDATED_MODEL_HEIGHT', { value });
    }

    openBugReport() {
      this.router.navigate(['/bug-report']);
    }

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
        text: t('START_TUTORIAL'),
        buttons: [{ text: 'Next', action: tour.next }]
      });

      tour.addStep({
        id: 'upload',
        attachTo: { element: '.upload-instructions', on: 'bottom' },
        text: t('UPLOAD_INSTRUCTION'),
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
        id: 'finish',
        attachTo: { element: '.sidebar-right', on: 'left' },
        text: `${t('FINISH_TUTORIAL')}`,
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

    enterVRMode() {
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

    exitVRMode() {
      this.viewerRef?.exitVR();
    }

}

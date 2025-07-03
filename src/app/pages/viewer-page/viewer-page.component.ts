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
import { SceneControlsHelper } from '../../components/helpers/scene-controls.helper';
import { StorageService } from '../../services/storage.service';
import { SceneStorageHelper } from '../../components/helpers/scene-storage.helper';


@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [
    ViewerComponent,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.scss'],
})
export class ViewerPageComponent implements AfterViewInit {
  @ViewChild(ViewerComponent) viewerRef!: ViewerComponent;
  @ViewChild('viewerCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile?: File;
  sidebarCollapsed = false;
  showConsole = true;
  consoleMessages: string[] = [];

  currentLang: 'en' | 'es' = 'en';

  constructor(
    private router: Router,
    private translate: TranslateService,
    private storageService: StorageService
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
    this.resizeCanvas();

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);

    if (!localStorage.getItem('hasSeenTutorial')) {
      this.startTutorial();
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

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  resizeCanvas(): void {
    if (!this.canvasRef || !this.viewerRef) return;

    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width;
    canvas.height = height;

    this.viewerRef.onResize?.(width, height);
    this.viewerRef.renderer?.setSize?.(width, height);
  }

  openBugReport(): void {
    this.router.navigate(['/bug-report']);
  }

  // ----- Scene & Model Controls -----

  toggleWireframe(): void {
    const model = this.viewerRef?.uploadedModel;
    if (!model) return;

    SceneControlsHelper.toggleWireframe(model, (msgKey) => {
      this.logToConsole(msgKey);
    });
  }

  toggleRoomLight(): void {
    const light = this.viewerRef?.ambientLight;
    if (!light) return;

    SceneControlsHelper.toggleRoomLight(light);
    this.logToConsole('VIEWER.TOGGLE_ROOM_LIGHT');
  }

  toggleLightcolor(): void {
    const light = this.viewerRef?.ambientLight;
    if (!light) return;

    SceneControlsHelper.toggleLightColor(light);
    this.logToConsole('VIEWER.TOGGLE_SUNLIGHT_COLOR');
  }

  clearModel(): void {
    const scene = this.viewerRef?.scene;
    if (!scene) return;

    SceneControlsHelper.clearScene(scene);
    this.logToConsole('MESSAGES.SCENE_CLEARED');
  }

  clear(): void {
    this.viewerRef?.clearScene();
  }

  load(): void {
  this.viewerRef?.loadSceneFromLocalStorage?.();
  this.logToConsole('VIEWER.LOAD_SCENE');
}

save(): void {
  this.viewerRef?.saveScene?.();
  this.logToConsole('VIEWER.SAVE_SCENE');
}


  loadLocal(): void {
    this.viewerRef?.loadSceneFromLocalStorage();
  }

  resetView(): void {
    this.viewerRef?.resetView?.();
    this.logToConsole('VIEWER.RESET_VIEW');
  }

  // ----- File Input Handlers -----

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
    const file = input.files?.[0];
    if (file) {
      this.onFileLoaded(file);
    }
  }

  onFileLoaded(file: File): void {
    this.selectedFile = file;
    this.viewerRef.loadGLB(file);
    this.logToConsole(`File loaded: ${file.name}`);
  }

  saveScene() {
    const sceneData = SceneStorageHelper.exportScene(
      this.viewerRef.scene,
      this.viewerRef.camera,
      this.viewerRef.ambientLight,
      this.viewerRef.dirLight,
      this.viewerRef.objects
    );
    const projectData = SceneStorageHelper.createProjectData(sceneData);
    this.storageService.saveProject(projectData);
    this.logToConsole('VIEWER.SAVE_SCENE');
  }

  loadScene() {
    const projectData = this.storageService.loadProject();
    if (projectData) {
      SceneStorageHelper.uploadSceneFromData(projectData.scene, this.viewerRef, this.logToConsole.bind(this));
      this.logToConsole('VIEWER.LOAD_SCENE');
    } else {
      this.logToConsole('VIEWER.NO_SAVED_SCENE');
    }
  }

  // ----- Slider/Range Inputs -----

  onSunlightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateSunlight(input.valueAsNumber);
  }

  updateSunlight(value: number): void {
    this.viewerRef?.updateSunlight?.(value);
    this.logToConsole('VIEWER.UPDATED_SUNLIGHT_VALUE', { value });
  }

  onSpeedInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateSpeed(input.valueAsNumber);
  }

  updateSpeed(value: number): void {
    this.viewerRef?.updateSpeed?.(value);
    this.logToConsole('VIEWER.UPDATED_CAMERA_SPEED', { value });
  }

  onEyeLevelInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateEyeLevel(input.valueAsNumber);
  }

  updateEyeLevel(value: number): void {
    this.viewerRef?.updateEyeLevel?.(value);
  }

  onModelSizeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateModelSize(input.valueAsNumber);
  }

  updateModelSize(value: number): void {
    this.viewerRef?.updateModelSize?.(value);
    this.logToConsole('VIEWER.UPDATED_MODEL_SIZE', { value });
  }

  onModelHeightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateModelHeight(input.valueAsNumber);
  }

  updateModelHeight(value: number): void {
    this.viewerRef?.updateModelHeight?.(value);
    this.logToConsole('VIEWER.UPDATED_MODEL_HEIGHT', { value });
  }

  // ----- Tutorial -----

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
      document
        .querySelectorAll('.shepherd-highlight')
        .forEach((el) => el.classList.remove('shepherd-highlight'));
    });

    tour.start();
  }

  // ----- Language Switch -----

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

  exitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.warn('Failed to exit fullscreen:', err);
      });
    }
  }
}

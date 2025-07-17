import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { ViewerComponent } from '../../components/viewer/viewer.component';
import { FormsModule } from '@angular/forms';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SceneControlsService } from '../../services/scene-controls.service';
import { StorageService } from '../../services/storage.service';
import { FullscreenHelper } from '../../helpers/fullscreen.helper';


@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [ViewerComponent, FormsModule, TranslateModule],
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.scss'],
})
export class ViewerPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewerCanvas', { static: false }) viewerCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewer', { static: false }) viewer?: ViewerComponent;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('viewerShell', { static: true }) shell!: ElementRef<HTMLElement>;

  selectedFile?: File;
  sidebarCollapsed = false;
  showConsole = true;
  consoleMessages: string[] = [];
  currentLang: 'en' | 'es' = 'en';
  sunIntensity = 1;

  //fs!: FullscreenHelper;
  showRotateWarning = false;

  get fs(): FullscreenHelper | undefined { return this._fs; }
  private _fs!: FullscreenHelper;

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

  get isPortrait(): boolean {
    return window.matchMedia("(orientation: portrait)").matches;
  }

 @HostListener('window:resize')
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

  // @HostListener('window:resize')
  // onWindowResize(): void {
  //   this.resizeCanvas();
  // }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    const container = this.viewer?.sceneContainerRef?.nativeElement;
    if (container) {
      const isFullscreen = !!document.fullscreenElement;
      container.classList.toggle('fullscreen-enabled', isFullscreen);
      this.resizeCanvas();
    }
  }

  ngAfterViewInit(): void {
    this.consoleMessages = this.storageService.consoleMessages;

    if (!this.viewer) {
      console.error('Viewer reference is missing.');
      return;
    }
    //
    this._fs = new FullscreenHelper(this.viewer.sceneContainerRef.nativeElement);
    //
    this.resizeCanvas();
    this.sceneControls.viewerRef = this.viewer;
    this.storageService.viewerRef = this.viewer;
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  ngOnDestroy() {
    this.fs?.dispose();
  }

  // ----- UI Console -----

  toggleConsole(): void {
    this.showConsole = !this.showConsole;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onToggleFullscreen() {
  this._fs?.toggle();
}

  // ----- Canvas Sizing -----

  resizeCanvas(): void {
    const container = this.viewer?.sceneContainerRef?.nativeElement;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    console.log(`Resizing viewer canvas to: ${width}x${height}`);
    this.viewer?.onResize?.(width, height);
    this.viewer?.renderer?.setSize(width, height);
  }

  onUploadClick(): void {
    this.fileInput?.nativeElement.click();
  }

async saveScene(): Promise<void> {
  console.log('saveScene() triggered');
  if (!this.viewer) {
    console.error('Viewer reference is missing.');
    return;
  }

  try {
    await this.storageService.saveSceneAsJson(this.viewer);
    this.storageService.logToConsole('Scene saved successfully.');
  } catch (error) {
    console.error('Failed to save scene:', error);
    this.storageService.logToConsole('Error saving scene.');
  }
}

  // onFileChange(event: Event): void {
  //   const input = event.target as HTMLInputElement;
  //   const file = input.files?.[0];
  //   if (!file || !this.viewer) return;
  //   this.viewer.loadFile(file);
  //   this.storageService.logToConsole(`Loaded file: ${file.name}`);
  //   //
  //   if (this.fileInput?.nativeElement) {
  //     this.fileInput.nativeElement.value = '';
  //   }
  //   //
  // }

  async onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !this.viewer) return;

  try {
    await this.viewer.loadFile(file);  // Await if loadFile returns a Promise
    this.storageService.logToConsole(`Loaded file: ${file.name}`);
  } catch (error) {
    console.error('Failed to load file:', error);
    this.storageService.logToConsole('Error loading file.');
  }

  // Reset input so user can upload same file again
  if (this.fileInput?.nativeElement) {
    this.fileInput.nativeElement.value = '';
  }
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
    const value = +(evt.target as HTMLInputElement).value;
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
    const t = (k: string) => this.translate.instant(k);

    /* Helper: reusable buttons ---------------------------------------- */
    const next = { text: t('BUTTONS_NEXT') || 'Next', action: () => tour.next() };
    const back = { text: t('BUTTONS_BACK') || 'Back', action: () => tour.back() };

    /* Shepherd tour ---------------------------------------------------- */
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: 'smooth', block: 'center' },
        classes: 'shepherd-theme-default',
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8,
        canClickTarget: false,
        // highlight class we’ll toggle below
        highlightClass: 'shepherd-highlight'
      }
    });

    /* 1 ─ Welcome */
    tour.addStep({
      id: 'welcome',
      text: t('START_TUTORIAL'),
      buttons: [next]
    });

    /* 2 ─ Scene controls */
    tour.addStep({
      id: 'scene-controls',
      attachTo: { element: '.sidebar-left', on: 'right' },
      text: t('SCENE_SETTINGS'),
      buttons: [back, next]
    });

    /* 3 ─ 3‑D viewer */
    tour.addStep({
      id: 'canvas',
      attachTo: { element: '#canvas-tour-target', on: 'right' },
      text: t('MODEL_SETTINGS'),
      buttons: [back, next],
       when: {
    show: () => {
      setTimeout(() => {
        document.querySelector('.shepherd-element')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }
    });

    /* 4 ─ Console */
    tour.addStep({
      id: 'console',
      attachTo: { element: '.bottom-bar', on: 'top' },
      text: t('CONSOLE_SHEPHARD'),
      buttons: [back, next]
    });

    /* 5 ─ Finish */
    tour.addStep({
      id: 'finish',
      text: t('FINISH_TUTORIAL'),
      buttons: [back,

      { text: t('BUTTONS_DONE') || 'Done', action: () => tour.complete() }]
    });

    /* Mark tutorial as seen ------------------------------------------- */
    const markSeen = () => localStorage.setItem('hasSeenTutorial', 'true');
    tour.on('complete', markSeen);
    tour.on('cancel',   markSeen);
    tour.on('show', () => {
      const el = tour.getCurrentStep()?.options.attachTo?.element as string | undefined;
      if (el) document.querySelector(el)?.classList.add('shepherd-highlight');
    });
    tour.on('hide', () =>
      document
        .querySelectorAll('.shepherd-highlight')
        .forEach(el => el.classList.remove('shepherd-highlight'))
    );

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
    this._fs?.enter();
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
    this._fs?.exit();
    setTimeout(() => this.resizeCanvas(), 200);
  }

  // ----- Fullscreen -----

  enterFullscreen() {
    this.fs?.enter();
  }

  exitFullscreen() {
    this.fs?.exit();
  }

}

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
import { FullscreenHelper } from '../../helpers/fullscreen.helper';


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
  @ViewChild('viewerShell', { static: true }) shell!: ElementRef<HTMLElement>;

  selectedFile?: File;
  sidebarCollapsed = false;
  showConsole = true;
  consoleMessages: string[] = [];
  currentLang: 'en' | 'es' = 'en';
  sunIntensity = 1;

  fs!: FullscreenHelper;
  showRotateWarning = false;

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
      if (this.fs.isActive()) {
      }
    } else {
      this.showRotateWarning = false;
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    const container = this.viewer?.sceneContainerRef?.nativeElement;
    if (container) {
      const isFullscreen = !!document.fullscreenElement;
      container.classList.toggle('fullscreen-enabled', isFullscreen);
      this.resizeCanvas();
    }
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

    this.fs = new FullscreenHelper(this.shell.nativeElement);
  }

  ngOnDestroy() {
    this.fs.dispose();
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

    /* 1 ─ Welcome (floating, no target) */
    tour.addStep({
      id: 'welcome',
      text: t('START_TUTORIAL'),
      buttons: [next]
    });

    /* 2 ─ Upload hint (toolbar strip) */
    tour.addStep({
      id: 'upload',
      attachTo: { element: '.upload-instructions', on: 'bottom' },
      text: t('UPLOAD_INSTRUCTION'),
      buttons: [back, next]
    });

    /* 3 ─ Scene controls (left sidebar) */
    tour.addStep({
      id: 'scene-controls',
      attachTo: { element: '.sidebar-left', on: 'right' },
      text: t('SCENE_SETTINGS'),
      buttons: [back, next]
    });

    /* 4 ─ 3‑D viewer (canvas area) – anchor on **left** so card isn’t
          hidden by fullscreen canvas; the modal overlay still surrounds
          the viewer to draw attention. */
    tour.addStep({
      id: 'canvas',
      attachTo: { element: '.canvas-container', on: 'left' },
      text: t('MODEL_SETTINGS'),
      buttons: [back, next]
    });

    /* 5 ─ Console (bottom bar) */
    tour.addStep({
      id: 'console',
      attachTo: { element: '.bottom-bar', on: 'top' },
      text: t('CONSOLE_SHEPHARD'),
      buttons: [back, next]
    });

    /* 6 ─ Finish – point to the ☰ toggle so users know how to reopen
          the sidebar when it’s collapsed on mobile. */
    tour.addStep({
      id: 'finish',
      attachTo: { element: '.sidebar-toggle', on: 'bottom' },
      text: t('FINISH_TUTORIAL'),
      buttons: [back,

      { text: t('BUTTONS_DONE') || 'Done', action: () => tour.complete() }]
    });

    /* Mark tutorial as seen ------------------------------------------- */
    const markSeen = () => localStorage.setItem('hasSeenTutorial', 'true');
    tour.on('complete', markSeen);
    tour.on('cancel',   markSeen);

    /* Highlight target element while its step is visible -------------- */
    tour.on('show', () => {
      // Shepherd adds `is-active` class to the current step element, so
      // we can query the attachTo target via API:
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

  enterFullscreen() {
    this.fs.enter();
  }

  exitFullscreen() {
    this.fs.exit();
  }

}

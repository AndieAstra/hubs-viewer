import {
  Component, ElementRef, NgZone, OnDestroy, OnInit,
  ViewChild, HostListener
} from '@angular/core';
import * as THREE from 'three';

interface PanoNote {
  position: THREE.Vector3;
  title: string;
  text: string;
  element: HTMLDivElement;
}

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  templateUrl: './panorama-viewer.component.html',
  styleUrls: ['./panorama-viewer.component.scss']
})
export class PanoramaViewerComponent implements OnInit, OnDestroy {
  @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId = 0;
  private sphereMesh!: THREE.Mesh;

  private keys = new Set<string>();
  private yaw = 0; private pitch = 0;
  private ROTATION_SPEED = 0.02;
  private isDragging = false;
  private previousMouseX = 0; private previousMouseY = 0;

  // Pano notes
  panoNotes: PanoNote[] = [];
  placingNote = false;
  mouseScreen = { x: 0, y: 0 };
  pointerX = 0;
  pointerY = 0;

  constructor(private ngZone: NgZone) {}

@HostListener('window:keydown', ['$event'])
onKeyDown(e: KeyboardEvent) {
  this.keys.add(e.key.toLowerCase());
}

@HostListener('window:keyup', ['$event'])
onKeyUp(e: KeyboardEvent) {
  this.keys.delete(e.key.toLowerCase());
}

@HostListener('document:keydown', ['$event'])
blockArrowKeysWhenTyping(e: KeyboardEvent) {
  const activeEl = document.activeElement;
  if (
    activeEl && (
      activeEl.classList.contains('note-title') ||
      activeEl.classList.contains('note-body')
    )
  ) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.stopPropagation();
    }
  }
}

ngOnInit(): void {
  this.initThree();
  this.ngZone.runOutsideAngular(() => this.animate());
  const c = this.renderer.domElement;
  this.onDoubleClick = this.onDoubleClick.bind(this);

    c.addEventListener('mousedown', this.onMouseDown.bind(this));
    c.addEventListener('mousemove', this.onMouseMove);
    c.addEventListener('mouseup', this.onMouseUp);
    c.addEventListener('mouseleave', this.onMouseLeave);

  ['touchstart','touchmove','touchend'].forEach(ev =>
    c.addEventListener(ev, (this as any)[`on${ev.charAt(0).toUpperCase()+ev.slice(1)}`], { passive: ev==='touchmove'?false:true })
  );

  c.addEventListener('dblclick', this.onDoubleClick);

  this.renderer.domElement.addEventListener('mousemove', e => {
  this.mouseScreen.x = e.clientX;
  this.mouseScreen.y = e.clientY;

  const circle = document.querySelector('.note-pointer-circle') as HTMLElement;
    if (circle) {
      circle.style.left = `${e.clientX}px`;
      circle.style.top = `${e.clientY}px`;
    }
  });

  this.renderer.domElement.addEventListener('click', this.onCanvasClick);

  this.loadNotes();
}


  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.renderer.dispose();
    this.scene.clear();
    this.keys.clear();

    const c = this.renderer.domElement;
    ['mousedown','mousemove','mouseup','mouseleave','dblclick'].forEach(ev =>
      c.removeEventListener(ev, (this as any)[`on${ev.charAt(0).toUpperCase()+ev.slice(1)}`])
    );
    ['touchstart','touchmove','touchend'].forEach(ev =>
      c.removeEventListener(ev, (this as any)[`on${ev.charAt(0).toUpperCase()+ev.slice(1)}`])
    );

    this.renderer.domElement.removeEventListener('dblclick', this.onDoubleClick);
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
  }

  initThree(): void {
    const el = this.rendererContainer.nativeElement as HTMLElement;
    const width = el.clientWidth, height = el.clientHeight;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1100);
    this.camera.position.set(0,0,0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.pointerEvents = 'all';

    el.appendChild(this.renderer.domElement);

    const geo = new THREE.SphereGeometry(500,60,40);
    geo.scale(-1,1,1);
    const mat = new THREE.MeshBasicMaterial({ color:0x000000 });
    this.sphereMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.sphereMesh);
  }

  // --------------- Input handlers ---------------

onMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.closest('.pano-note')) return; // prevent dragging scene when clicking note
  this.isDragging = true;
  this.previousMouseX = e.clientX;
  this.previousMouseY = e.clientY;
}

  onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.previousMouseX;
    const dy = e.clientY - this.previousMouseY;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
    this.yaw  -= dx * 0.002;
    this.pitch-= dy * 0.002;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI/2, Math.PI/2);
  };
  onMouseUp = () => this.isDragging = false;
  onMouseLeave = () => this.isDragging = false;

  onTouchStart = (e: TouchEvent) => {
    if (e.touches.length===1) {
      this.isDragging = true;
      this.previousMouseX = e.touches[0].clientX;
      this.previousMouseY = e.touches[0].clientY;
    }
  };
  onTouchMove = (e: TouchEvent) => {
    if (!this.isDragging || e.touches.length!==1) return;
    const t = e.touches[0];
    const dx = t.clientX - this.previousMouseX;
    const dy = t.clientY - this.previousMouseY;
    this.previousMouseX = t.clientX;
    this.previousMouseY = t.clientY;
    this.yaw  -= dx * 0.002;
    this.pitch-= dy * 0.002;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI/2, Math.PI/2);
    e.preventDefault();
  };
  onTouchEnd = () => this.isDragging = false;

  onDoubleClick = (e: MouseEvent) => {
    const mouse = new THREE.Vector2(
      (e.offsetX/this.renderer.domElement.clientWidth)*2-1,
      -(e.offsetY/this.renderer.domElement.clientHeight)*2+1
    );
    const rc = new THREE.Raycaster();
    rc.setFromCamera(mouse, this.camera);
    const it = rc.intersectObject(this.sphereMesh);
    if (it.length) this.addNoteAt(it[0].point);
  };

  // ---------------- Pano Notes -------------------

onCanvasClick = (e: MouseEvent) => {
  if (!this.placingNote) return;

  const mouse = new THREE.Vector2(
    (e.offsetX / this.renderer.domElement.clientWidth) * 2 - 1,
    -(e.offsetY / this.renderer.domElement.clientHeight) * 2 + 1
  );
  const rc = new THREE.Raycaster();
  rc.setFromCamera(mouse, this.camera);
  const intersects = rc.intersectObject(this.sphereMesh);
  if (intersects.length) {
    this.addNoteAt(intersects[0].point);
    this.placingNote = false;
  }
};

prepareNotePlacement(): void {
  this.placingNote = true;
}

onPointerMove(e: MouseEvent) {
  if (this.placingNote) {
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
  }
}

placeNoteAtPointer() {
  const rect = this.renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((this.pointerX - rect.left) / rect.width) * 2 - 1,
    -((this.pointerY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, this.camera);

  const intersects = raycaster.intersectObject(this.sphereMesh);
  if (intersects.length > 0) {
    this.addNoteAt(intersects[0].point);
    this.placingNote = false;
  }
}

addNoteAtCenter(): void {
  const dir = new THREE.Vector3(
    Math.cos(this.pitch) * Math.sin(this.yaw),
    Math.sin(this.pitch),
    Math.cos(this.pitch) * Math.cos(this.yaw)
  );
  const notePosition = this.camera.position.clone().add(dir.multiplyScalar(10)); // 10 units in front
  this.addNoteAt(notePosition);
}

addNoteAt(pos: THREE.Vector3) {
  const container = this.rendererContainer.nativeElement as HTMLElement;
  const el = document.createElement('div');
  el.className = 'pano-note';
  el.innerHTML = `
    <div class="note-title">New Note</div>
    <div class="note-body">Write text...</div>
    <div class="note-controls">
      <button class="note-edit">✎ Edit</button>
      <button class="note-remove">✖ Delete</button>
    </div>
  `;
  container.appendChild(el);

  const note: PanoNote = {
    position: pos.clone(),
    title: 'New Note',
    text: 'Write text...',
    element: el
  };
  this.panoNotes.push(note);

  // Editable controls
  const titleEl = el.querySelector('.note-title') as HTMLElement;
  const bodyEl = el.querySelector('.note-body') as HTMLElement;
  const editBtn = el.querySelector('.note-edit') as HTMLButtonElement;

  let editing = false;
  editBtn.addEventListener('click', () => {
    editing = !editing;
    if (editing) {
      titleEl.setAttribute('contenteditable', 'true');
      bodyEl.setAttribute('contenteditable', 'true');
      titleEl.focus();
      editBtn.textContent = '💾 Save';
    } else {
      titleEl.removeAttribute('contenteditable');
      bodyEl.removeAttribute('contenteditable');
      editBtn.textContent = '✎ Edit';
      this.saveNotes();
    }
  });

  // Remove button
  el.querySelector('.note-remove')!
    .addEventListener('click', () => this.removeNote(note));

  this.saveNotes();
}

  removeNote(note: PanoNote) {
    note.element.remove();
    this.panoNotes = this.panoNotes.filter(n=>n!==note);
    this.saveNotes();
  }

  saveNotes() {
    const data = this.panoNotes.map(n=>({
      pos: n.position.toArray(),
      title: n.element.querySelector('.note-title')!.textContent,
      text: n.element.querySelector('.note-body')!.textContent
    }));
    localStorage.setItem('panoNotes', JSON.stringify(data));
  }

  loadNotes() {
    const raw = localStorage.getItem('panoNotes');
    if(!raw) return;
    try {
      const arr = JSON.parse(raw);
      for(const o of arr) {
        const vec = new THREE.Vector3().fromArray(o.pos);
        this.addNoteAt(vec);
        const note = this.panoNotes[this.panoNotes.length-1];
        note.element.querySelector('.note-title')!.textContent = o.title;
        note.element.querySelector('.note-body')!.textContent = o.text;
      }
    } catch(e) {}
  }

  // ---------------- Main animation loop ----------------

  animate = () => {
    this.handleKeyLook();

    const dir = new THREE.Vector3(
      Math.cos(this.pitch)*Math.sin(this.yaw),
      Math.sin(this.pitch),
      Math.cos(this.pitch)*Math.cos(this.yaw)
    );
    this.camera.lookAt(this.camera.position.clone().add(dir));

    // project notes to 2D and position elements
    this.panoNotes.forEach(n => {
      const p = n.position.clone().project(this.camera);
      const x = (p.x*0.5+0.5)*this.renderer.domElement.clientWidth;
      const y = (-p.y*0.5+0.5)*this.renderer.domElement.clientHeight;
      n.element.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
    });

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  handleKeyLook() {
    if (this.keys.has('a')||this.keys.has('arrowleft')) this.yaw += this.ROTATION_SPEED;
    if (this.keys.has('d')||this.keys.has('arrowright')) this.yaw -= this.ROTATION_SPEED;
    if (this.keys.has('w')||this.keys.has('arrowup'))    this.pitch += this.ROTATION_SPEED;
    if (this.keys.has('s')||this.keys.has('arrowdown'))  this.pitch -= this.ROTATION_SPEED;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI/2, Math.PI/2);
  }

  // ---------------- File input ----------------

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if(!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      new THREE.TextureLoader().load(reader.result as string, tex=>{
        const mats = Array.isArray(this.sphereMesh.material) ?
          this.sphereMesh.material : [this.sphereMesh.material as THREE.Material];
        mats.forEach(m=>m.dispose());
        this.sphereMesh.material = new THREE.MeshBasicMaterial({ map: tex });
      });
    };
    reader.readAsDataURL(file);
  }
}

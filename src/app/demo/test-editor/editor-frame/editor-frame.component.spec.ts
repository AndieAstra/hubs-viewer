import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorFrameComponent } from './editor-frame.component';

describe('EditorFrameComponent', () => {
  let component: EditorFrameComponent;
  let fixture: ComponentFixture<EditorFrameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorFrameComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditorFrameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

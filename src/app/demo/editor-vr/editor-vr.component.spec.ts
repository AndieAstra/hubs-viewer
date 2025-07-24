import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorVrComponent } from './editor-vr.component';

describe('EditorVrComponent', () => {
  let component: EditorVrComponent;
  let fixture: ComponentFixture<EditorVrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorVrComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditorVrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

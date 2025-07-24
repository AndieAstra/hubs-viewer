import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VrFrameComponent } from './vr-frame.component';

describe('VrFrameComponent', () => {
  let component: VrFrameComponent;
  let fixture: ComponentFixture<VrFrameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VrFrameComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VrFrameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

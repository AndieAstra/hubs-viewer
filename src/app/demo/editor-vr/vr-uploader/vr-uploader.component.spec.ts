import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VrUploaderComponent } from './vr-uploader.component';

describe('VrUploaderComponent', () => {
  let component: VrUploaderComponent;
  let fixture: ComponentFixture<VrUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VrUploaderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VrUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

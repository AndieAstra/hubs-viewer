import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StereoscopeTestComponent } from './stereoscope-test.component';

describe('StereoscopeTestComponent', () => {
  let component: StereoscopeTestComponent;
  let fixture: ComponentFixture<StereoscopeTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StereoscopeTestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StereoscopeTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

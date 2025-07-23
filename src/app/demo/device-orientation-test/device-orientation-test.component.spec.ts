import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceOrientationTestComponent } from './device-orientation-test.component';

describe('DeviceOrientationTestComponent', () => {
  let component: DeviceOrientationTestComponent;
  let fixture: ComponentFixture<DeviceOrientationTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceOrientationTestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DeviceOrientationTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

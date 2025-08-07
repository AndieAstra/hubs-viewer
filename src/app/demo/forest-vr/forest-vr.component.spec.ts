import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForestVrComponent } from './forest-vr.component';

describe('ForestVrComponent', () => {
  let component: ForestVrComponent;
  let fixture: ComponentFixture<ForestVrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForestVrComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ForestVrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

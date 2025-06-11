import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectManagerComponent } from './project-manager.component';

describe('ProjectManagerComponent', () => {
  let component: ProjectManagerComponent;
  let fixture: ComponentFixture<ProjectManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectManagerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProjectManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

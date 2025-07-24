import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestEditorComponent } from './test-editor.component';

describe('TestEditorComponent', () => {
  let component: TestEditorComponent;
  let fixture: ComponentFixture<TestEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TestEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

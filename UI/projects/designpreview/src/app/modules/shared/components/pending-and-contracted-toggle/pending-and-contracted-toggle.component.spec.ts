import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingAndContractedToggleComponent } from './pending-and-contracted-toggle.component';

describe('PendingAndContractedToggleComponent', () => {
  let component: PendingAndContractedToggleComponent;
  let fixture: ComponentFixture<PendingAndContractedToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PendingAndContractedToggleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingAndContractedToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

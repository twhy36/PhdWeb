import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockedChoiceModalComponent } from './blocked-choice-modal.component';

describe('BlockedChoiceModalComponent', () => {
  let component: BlockedChoiceModalComponent;
  let fixture: ComponentFixture<BlockedChoiceModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BlockedChoiceModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BlockedChoiceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

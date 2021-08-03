import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HiddenChoicePriceModalComponent } from './hidden-choice-price-modal.component';

describe('HiddenChoicePriceModalComponent', () => {
  let component: HiddenChoicePriceModalComponent;
  let fixture: ComponentFixture<HiddenChoicePriceModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HiddenChoicePriceModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HiddenChoicePriceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

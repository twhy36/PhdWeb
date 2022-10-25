import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { TermsAndConditionsComponent } from './terms-and-conditions.component';
import * as fromApp from '../../../ngrx-store/app/reducer';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

fdescribe('TermsAndConditionsComponent', () => {
  let component: TermsAndConditionsComponent;
  let fixture: ComponentFixture<TermsAndConditionsComponent>;

  let mockStore: MockStore;
  const { initialState } = fromApp;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TermsAndConditionsComponent ],
      providers: [ NgbModal, NgbActiveModal, provideMockStore({ initialState }), ]
    })
    .compileComponents();

    mockStore = TestBed.inject(MockStore);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TermsAndConditionsComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return the default state', () => {
    const state = fromApp.reducer(undefined, { type: null });

    expect(state.termsAndConditionsAcknowledged).toBe(initialState.termsAndConditionsAcknowledged);
  })
});

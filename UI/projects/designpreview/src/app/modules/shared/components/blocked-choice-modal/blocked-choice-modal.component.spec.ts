import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { instance, mock } from 'ts-mockito';
import { AdobeService } from '../../../core/services/adobe.service';

import { BlockedChoiceModalComponent } from './blocked-choice-modal.component';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

describe('BlockedChoiceModalComponent', () => {
  let component: BlockedChoiceModalComponent;
  let fixture: ComponentFixture<BlockedChoiceModalComponent>;
  let mockStore: MockStore;
  const initialState = {
		scenario: fromScenario.initialState
	};
	const mockAdobeService = mock(AdobeService);

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BlockedChoiceModalComponent ],
			providers: [
        provideMockStore({ initialState }),
        { provide: AdobeService, useFactory: () => instance(mockAdobeService) }
      ]
    })
    .compileComponents();

    mockStore = TestBed.inject(MockStore);
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

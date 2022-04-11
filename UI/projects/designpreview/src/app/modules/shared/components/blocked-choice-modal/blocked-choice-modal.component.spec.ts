import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { instance, mock } from 'ts-mockito';
import { AdobeService } from '../../../core/services/adobe.service';

import { BlockedChoiceModalComponent } from './blocked-choice-modal.component';

describe('BlockedChoiceModalComponent', () => {
  let component: BlockedChoiceModalComponent;
  let fixture: ComponentFixture<BlockedChoiceModalComponent>;
	const mockAdobeService = mock(AdobeService);

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BlockedChoiceModalComponent ],
			providers: [{ provide: AdobeService, useFactory: () => instance(mockAdobeService) }]
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

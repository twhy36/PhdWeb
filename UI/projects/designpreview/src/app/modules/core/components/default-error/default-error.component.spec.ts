import { ComponentFixture, TestBed} from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { instance, mock } from 'ts-mockito';
import { MockComponent } from 'ng2-mock-component';

import { DefaultErrorComponent } from './default-error.component';
import * as fromApp from '../../../ngrx-store/app/reducer';
import { BrandService } from '../../../core/services/brand.service';

describe('DefaultErrorComponent', () => {
  let component: DefaultErrorComponent;
  let fixture: ComponentFixture<DefaultErrorComponent>;

  let mockStore: MockStore;
	const initialState = {
		app: fromApp.initialState
	};
  const mockRouter = mock(Router);
	const mockBrandService = mock(BrandService);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        DefaultErrorComponent
      ],
      providers: [
				provideMockStore({ initialState }),
				{ provide: Router, useFactory: () => instance(mockRouter) },
				{ provide: BrandService, useFactory: () => instance(mockBrandService) },
			]
    })
    .compileComponents();

    mockStore = TestBed.inject(MockStore);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DefaultErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

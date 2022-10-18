import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { instance, mock } from 'ts-mockito';

import { DefaultErrorComponent } from './default-error.component';
import * as fromApp from '../../../ngrx-store/app/reducer';
import { BrandService } from '../../../core/services/brand.service';
import { ClearLatestError } from '../../../ngrx-store/error.action';

describe('DefaultErrorComponent', () => {
	let component: DefaultErrorComponent;
	let fixture: ComponentFixture<DefaultErrorComponent>;

	let mockStore: MockStore;
	const initialState = {
		app: { latestError: 'test error' }
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

	it('should hide message on click', () => {
		expect(component.showInternalMessage).toBeTruthy();
		component.hideInternalMessage();
		expect(component.showInternalMessage).toBeFalsy();
	});

	it('should has error message when error in store', () => {
		component.ngOnInit();
		mockStore.select(fromApp.getAppLatestError).subscribe(s => expect(s.length > 0).toBeTruthy());
		expect(component.internalMessage.length > 0).toBeTruthy();
	});

	it('should dispatch error message when no error in store', () => {
		const onStoreSpy = spyOn(mockStore, 'dispatch');
		const newState = {
			app: { latestError: null }
		};
		mockStore.dispatch(new ClearLatestError());
		component.ngOnInit();
		expect(onStoreSpy).toHaveBeenCalled();
	});

});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandService } from '../../../core/services/brand.service';
import { instance, mock } from 'ts-mockito';

import { FooterBarComponent } from './footer-bar.component';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromOrg from '../../../ngrx-store/org/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as fromChangeOrder from '../../../ngrx-store/change-order/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { ModalService } from 'phd-common';

describe('FooterBarComponent', () =>
{
	let component: FooterBarComponent;
	let fixture: ComponentFixture<FooterBarComponent>;
	let mockStore: MockStore;
	const initialState = {
		app: fromApp.initialState,
		salesAgreement: fromSalesAgreement.initialState,
		plan: fromPlan.initialState,
		org: fromOrg.initialState,
		job: fromJob.initialState,
		changeOrder: fromChangeOrder.initialState,
		scenario: fromScenario.initialState
	};

	beforeEach(async () =>
	{
		await TestBed.configureTestingModule({
			declarations: [FooterBarComponent],
			providers: [
				provideMockStore({ initialState }),
				{ provide: BrandService, useFactory: () => instance(mockBrandService) },
				{ provide: ModalService, useFactory: () => instance(mockModalService) },
			]
		})
			.compileComponents();

		mockStore = TestBed.inject(MockStore);
	});

	const mockBrandService = mock(BrandService);
	const mockModalService = mock(ModalService);

	beforeEach(() =>
	{
		fixture = TestBed.createComponent(FooterBarComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});
});


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

import { PlanSummaryComponent } from './plan-summary.component';
import { findElementByTestId } from '../../../shared/classes/test-utils.class';
import { financialCommunityName, mockLot, mockPlan } from '../../../shared/classes/mockdata.class';

describe('PlanSummaryComponent', () => 
{
	let component: PlanSummaryComponent;
	let fixture: ComponentFixture<PlanSummaryComponent>;

	let mockStore: MockStore;
	const initialState = {};

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [ PlanSummaryComponent ],
			providers: [ provideMockStore({ initialState })]
		}).compileComponents();

		mockStore = TestBed.inject(MockStore);
		mockStore.overrideSelector(fromRoot.financialCommunityName, financialCommunityName);
		mockStore.overrideSelector(fromPlan.selectedPlanData, mockPlan);
		mockStore.overrideSelector(fromSalesAgreement.selectSelectedLot, mockLot);

		fixture = TestBed.createComponent(PlanSummaryComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('community name should be uppercase', () =>
	{
		const communityLabel = findElementByTestId(fixture, 'community-label');
		expect(communityLabel.nativeElement.innerText).toBe(`${financialCommunityName.toUpperCase()},`);
	});

	it('shows plan name', () =>
	{
		const planLabel = findElementByTestId(fixture, 'plan-label');
		expect(planLabel.nativeElement.innerText).toBe(`${mockPlan.salesName} `);
	});

	it('shows lot number and address', () =>
	{
		const lotAddressLabel = findElementByTestId(fixture, 'lot-address-label');
		expect(lotAddressLabel.nativeElement.innerText).toBe(`LOT ${mockLot.lotBlock}\n${mockLot.streetAddress1} ${mockLot.streetAddress2}, ${mockLot.city}, ${mockLot.stateProvince} ${mockLot.postalCode}`);
	});

	it('address should appear by default', () =>
	{
		const addressLabel = findElementByTestId(fixture, 'address-label');
		expect(addressLabel).toBeDefined();
	});

	it('address should be hidden if hideAddress is true', () =>
	{
		component.hideAddress = true;
		fixture.detectChanges();

		const addressLabel = findElementByTestId(fixture, 'address-label');
		expect(addressLabel).toBeNull();
	});
});

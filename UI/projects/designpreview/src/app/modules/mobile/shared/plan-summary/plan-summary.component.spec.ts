import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromRoot from '../../../ngrx-store/reducers';

import { PlanSummaryComponent } from './plan-summary.component';
import { findElementByTestId } from '../../../shared/classes/test-utils.class';
import { financialCommunityName } from '../../../shared/classes/mockdata.class';

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
		expect(communityLabel.nativeElement.innerText).toBe(financialCommunityName.toUpperCase());
	});
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractedSummaryComponent } from './contracted-summary.component';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import {
	dpToDpRulesPoint,
	mockPriceBreakdown,
	mockTreeVersionSingleGroup,
} from '../../../shared/classes/mockdata.class';
import { findElementByTestId } from '../../../shared/classes/test-utils.class';
import { MockActionBarComponent } from '../../../shared/mocks/mock-action-bar-component';
import { MockDecisionPointSummaryComponent } from '../../../shared/mocks/mock-decision-point-summary-component';
import { MockFooterBarComponent } from '../../../shared/mocks/mock-footer-bar-component';

describe('ContractedSummaryComponent', () => 
{
	let component: ContractedSummaryComponent;
	let fixture: ComponentFixture<ContractedSummaryComponent>;
	let mockStore: MockStore;
	const initialState = {
		scenario: fromScenario.initialState,
		sag: fromSalesAgreement.initialState
	};

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				ContractedSummaryComponent,
				MockActionBarComponent,
				MockDecisionPointSummaryComponent,
				MockFooterBarComponent,
			],
			providers: [provideMockStore({ initialState })],
		}).compileComponents();

		mockStore = TestBed.inject(MockStore);
		mockStore.overrideSelector(fromRoot.priceBreakdown, mockPriceBreakdown);

		fixture = TestBed.createComponent(ContractedSummaryComponent);
		component = fixture.componentInstance;
	});

	afterEach(() => 
	{
		mockStore.resetSelectors();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	// Decision point comes from the tree
	it('shows decision point if it is not hidden and has an unhidden choice', () => 
	{
		mockStore.overrideSelector(
			fromRoot.contractedTree,
			mockTreeVersionSingleGroup
		);
		fixture.detectChanges();

		const decisionPointSummary = findElementByTestId(
			fixture,
			'decision-point-summary'
		);
		expect(decisionPointSummary).toBeTruthy();
	});

	it('hides decision point if it is not hidden and has no unhidden choices', () => 
	{
		const dpWithNoUnhiddenChoices = {
			...dpToDpRulesPoint,
			choices: [
				{ ...dpToDpRulesPoint.choices[0], isHiddenFromBuyerView: true },
			],
		};
		mockStore.overrideSelector(fromRoot.contractedTree, {
			...mockTreeVersionSingleGroup,
			groups: [
				{
					...mockTreeVersionSingleGroup.groups[0],
					subGroups: [
						{
							...mockTreeVersionSingleGroup.groups[0]
								.subGroups[0],
							points: [dpWithNoUnhiddenChoices],
						},
					],
				},
			],
		});
		fixture.detectChanges();

		const decisionPointSummary = findElementByTestId(
			fixture,
			'decision-point-summary'
		);
		expect(decisionPointSummary).toBeFalsy();
	});

	it('hides decision point if it is hidden', () => 
	{
		const hiddenDp = {
			...dpToDpRulesPoint,
			isHiddenFromBuyerView: true,
			choices: [
				{ ...dpToDpRulesPoint.choices[0], isHiddenFromBuyerView: false },
			],
		};
		mockStore.overrideSelector(fromRoot.contractedTree, {
			...mockTreeVersionSingleGroup,
			groups: [
				{
					...mockTreeVersionSingleGroup.groups[0],
					subGroups: [
						{
							...mockTreeVersionSingleGroup.groups[0]
								.subGroups[0],
							points: [hiddenDp],
						},
					],
				},
			],
		});
		fixture.detectChanges();

		const decisionPointSummary = findElementByTestId(
			fixture,
			'decision-point-summary'
		);
		expect(decisionPointSummary).toBeFalsy();
	});
});

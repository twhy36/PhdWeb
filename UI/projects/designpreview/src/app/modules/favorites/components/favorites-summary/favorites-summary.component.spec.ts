import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FavoritesSummaryComponent } from './favorites-summary.component';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import {
	dpToDpRulesPoint,
	mockTreeVersionSingleGroup,
} from '../../../shared/classes/mockdata.class';
import { findElementByTestId } from '../../../shared/classes/test-utils.class';
import { instance, mock } from 'ts-mockito';
import { ActivatedRoute } from '@angular/router';
import { BrandService } from '../../../core/services/brand.service';
import { ModalService, PriceBreakdown } from 'phd-common';
import { AdobeService } from '../../../core/services/adobe.service';
import { MockActionBarComponent } from '../../../shared/mocks/mock-action-bar-component';
import { Component, Input } from '@angular/core';
import { SummaryHeader } from './summary-header/summary-header.component';
import { MockDecisionPointSummaryComponent } from '../../../shared/mocks/mock-decision-point-summary-component';
import { MockGroupBarComponent } from '../../../shared/mocks/mock-group-bar-component';
import { MockFooterBarComponent } from '../../../shared/mocks/mock-footer-bar-component';

@Component({ selector: 'summary-header', template: '' })
class MockSummaryHeaderComponent 
{
	@Input() summaryHeader: SummaryHeader;
	@Input() priceBreakdown: PriceBreakdown;
	@Input() includeContractedOptions: boolean;
	@Input() isDesignComplete: boolean = false;
	@Input() isPrintHeader: boolean = false;
}

describe('FavoritesSummaryComponent', () => 
{
	let component: FavoritesSummaryComponent;
	let fixture: ComponentFixture<FavoritesSummaryComponent>;
	let mockStore: MockStore;
	const initialState = {
		app: fromApp.initialState,
		scenario: fromScenario.initialState,
		salesAgreement: fromSalesAgreement.initialState,
		job: fromJob.initialState,
	};
	const mockAdobeService = mock(AdobeService);
	const mockActivatedRoute = mock(ActivatedRoute);
	const mockBrandService = mock(BrandService);
	const mockModalService = mock(ModalService);

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				FavoritesSummaryComponent,
				MockActionBarComponent,
				MockDecisionPointSummaryComponent,
				MockFooterBarComponent,
				MockGroupBarComponent,
				MockSummaryHeaderComponent,
			],
			providers: [
				provideMockStore({ initialState }),
				{
					provide: AdobeService,
					useFactory: () => instance(mockAdobeService),
				},
				{
					provide: ActivatedRoute,
					useFactory: () => instance(mockActivatedRoute),
				},
				{
					provide: BrandService,
					useFactory: () => instance(mockBrandService),
				},
				{
					provide: ModalService,
					useFactory: () => instance(mockModalService),
				},
			],
		}).compileComponents();

		mockStore = TestBed.inject(MockStore);

		fixture = TestBed.createComponent(FavoritesSummaryComponent);
		component = fixture.componentInstance;
		mockStore.overrideSelector(fromFavorite.favoriteState, {
			includeContractedOptions: true,
			myFavorites: [],
			selectedFavoritesId: 0,
			isLoading: false,
			saveError: false,
			salesChoices: [],
		});
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	// Decision point comes from filtered tree
	it('shows decision point is if is not hidden and it has an unhidden choice', () => 
	{
		mockStore.overrideSelector(
			fromRoot.filteredTree,
			mockTreeVersionSingleGroup
		);
		fixture.detectChanges();

		const decisionPoint = findElementByTestId(
			fixture,
			'decision-point-summary'
		);
		expect(decisionPoint).toBeTruthy();
	});

	it('hides decision point if it is not hidden and has no unhidden choices', () => 
	{
		const dpWithNoUnhiddenChoices = {
			...dpToDpRulesPoint,
			choices: [
				{ ...dpToDpRulesPoint.choices[0], isHiddenFromBuyerView: true },
			],
		};
		mockStore.overrideSelector(fromRoot.filteredTree, {
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
		mockStore.overrideSelector(fromRoot.filteredTree, {
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

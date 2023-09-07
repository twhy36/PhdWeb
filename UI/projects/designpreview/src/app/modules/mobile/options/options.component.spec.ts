import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { DecisionPoint, PickType } from 'phd-common';
import { of } from 'rxjs';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as fromNav from '../../ngrx-store/nav/reducer';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as NavActions from '../../ngrx-store/nav/actions';

import { OptionsComponent } from './options.component';
import { ActionBarComponent } from '../shared/action-bar/action-bar.component';
import { GroupListComponent } from '../shared/group-list/group-list.component';
import { ChoiceCardComponent } from '../shared/choice-card/choice-card.component';
import { testDecisionPoint, testMyFavoriteStateWithSalesChoices, testMyFavoriteStateWithoutSalesChoices, testTreeVersion } from '../../shared/classes/mockdata.class';
import { createSelector } from '@ngrx/store';
import { ChoicePriceWithRangeCheckPipe } from '../../shared/pipes/choicePriceWithRangeCheck.pipe';
import { MockCloudinaryImageComponent } from '../../shared/mocks/mock-cloudinary-image';
import { MockEstimatedTotalsComponent } from '../../shared/mocks/mock-estimated-totals-component';
import { PlanSummaryComponent } from '../shared/plan-summary/plan-summary.component';
import { PendingAndContractedToggleComponent } from '../pending-and-contracted-toggle/pending-and-contracted-toggle.component';
import { ChoiceCardDetailComponent } from '../choice-card-detail/choice-card-detail.component';
import { findElementByTestId } from '../../shared/classes/test-utils.class';
import { BuildMode } from '../../shared/models/build-mode.model';
import { Constants } from '../../shared/classes/constants.class';

@Component({selector: 'choice-decline-card-mobile', template: ''})
class ChoiceDeclineCarStubComponent
{
	@Input() decisionPoint: DecisionPoint;
}

describe('OptionsComponent', () => 
{
	let component: OptionsComponent;
	let fixture: ComponentFixture<OptionsComponent>;
	let mockStore: MockStore;
	let router: Router;
	let storeSpy: jasmine.Spy;

	const mockFirstSubGroup = testTreeVersion.groups[0].subGroups[0];
	const mockFirstPoint = mockFirstSubGroup.points[0];
	const mockFirstChoice = mockFirstPoint.choices[0];
	const mockPointPickZero = structuredClone(testDecisionPoint);
	const mockPointPickOneOrMore = structuredClone(testDecisionPoint);
	const mockPointPickZeroOrMore = structuredClone(testDecisionPoint);
	const mockPointPickZeroStructuralItem = structuredClone(testDecisionPoint);
	const mockPointPickZeroPastCutoff = structuredClone(testDecisionPoint);
	const mockPointPickZeroWithContractedChoice = structuredClone(testDecisionPoint);

	mockPointPickZero.pointPickTypeId = PickType.Pick0or1;
	mockPointPickOneOrMore.pointPickTypeId = PickType.Pick1ormore;
	mockPointPickZeroOrMore.pointPickTypeId = PickType.Pick0ormore;
	mockPointPickZeroStructuralItem.pointPickTypeId = PickType.Pick0or1;
	mockPointPickZeroStructuralItem.isStructuralItem = true;
	mockPointPickZeroPastCutoff.pointPickTypeId = PickType.Pick0or1;
	mockPointPickZeroPastCutoff.isPastCutOff = true;
	mockPointPickZeroWithContractedChoice.pointPickTypeId = PickType.Pick0or1;
	mockPointPickZeroWithContractedChoice.choices[0].divChoiceCatalogId = 2082;

	const initialState = {
		favorite: fromFavorite.initialState,
		nav: fromNav.initialState,
		scenario: fromScenario.initialState
	};

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				OptionsComponent,
				GroupListComponent,
				ChoiceCardComponent,
				ChoicePriceWithRangeCheckPipe,
				MockCloudinaryImageComponent,
				ActionBarComponent,
				MockEstimatedTotalsComponent,
				PendingAndContractedToggleComponent,
				PlanSummaryComponent,
				ChoiceDeclineCarStubComponent,
			],
			imports: [
				BrowserAnimationsModule,
				FormsModule,
				MatCheckboxModule,
				MatIconModule,
				MatListModule,
				MatMenuModule,
				MatSelectModule,
				RouterTestingModule.withRoutes([
					{
						path: 'options/:subGroupId/:decisionPointId',
						component: OptionsComponent
					},
					{
						path: 'options/:subGroupId/:decisionPointId/:choiceId',
						component: ChoiceCardDetailComponent
					}
				]),
			],
			providers: [
				provideMockStore({ initialState }),
				{
					provide: ActivatedRoute,
					useValue: {
						params: of({
							subGroupId: 3,
							decisionPointId: 888218
						})
					}
				},
			]
		})
			.compileComponents();

		mockStore = TestBed.inject(MockStore);
		router = TestBed.inject(Router);

		mockStore.overrideSelector(fromRoot.filteredTree, testTreeVersion);
		mockStore.overrideSelector(fromFavorite.favoriteState, testMyFavoriteStateWithSalesChoices);

		spyOn(fromScenario, 'selectUnfilteredPoint').and.returnValue(createSelector(
			(v) => v,
			() => testDecisionPoint
		));
		storeSpy = spyOn(mockStore, 'dispatch');

		fixture = TestBed.createComponent(OptionsComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('navigation', () =>
	{
		it('dispatches action to select subgroup on initialization', () =>
		{
			expect(storeSpy).toHaveBeenCalledWith(new NavActions.SetSelectedSubgroup(3, 888218, null));
		});

		it('navigates to choice card detail page', () =>
		{
			const navigateSpy = spyOn(router, 'navigateByUrl');

			const choiceCardElement = findElementByTestId(fixture, 'choice-card-link');
			choiceCardElement.nativeElement.click();

			const url = navigateSpy.calls.first().args[0].toString();
			expect(url).toBe(`/options/${mockFirstSubGroup.id}/${mockFirstPoint.id}/${mockFirstChoice.id}`);
		});
	});

	describe('pending and contracted toggle shows in correct build modes', () =>
	{
		it('build mode is buyer', () =>
		{
			expect(component.showPendingAndContractedToggle).toBeTrue();
		});

		it('build mode is buyer preview', () =>
		{
			component.buildMode = BuildMode.BuyerPreview;
			fixture.detectChanges();

			expect(component.showPendingAndContractedToggle).toBeTrue();
		});

		it('build mode is buyer preview', () =>
		{
			component.buildMode = BuildMode.Presale;
			fixture.detectChanges();

			expect(component.showPendingAndContractedToggle).toBeFalse();
		});

		it('build mode is buyer preview', () =>
		{
			component.buildMode = BuildMode.Preview;
			fixture.detectChanges();

			expect(component.showPendingAndContractedToggle).toBeFalse();
		});
	});

	describe('correct subTitle is shown', () =>
	{
		it('pick 1', () =>
		{
			expect(component.subTitle).toBe(Constants.SELECT_ONE);
		});

		it('pick 0 or 1', () =>
		{
			component.selectedDecisionPoint = mockPointPickZero;
			fixture.detectChanges();

			expect(component.subTitle).toBe(Constants.SELECT_ONE);
		});

		it('pick 1 or more', () =>
		{
			component.selectedDecisionPoint = mockPointPickOneOrMore;
			fixture.detectChanges();

			expect(component.subTitle).toBe(Constants.SELECT_MANY);
		});

		it('pick 0 or more', () =>
		{
			component.selectedDecisionPoint = mockPointPickZeroOrMore;
			fixture.detectChanges();

			expect(component.subTitle).toBe(Constants.SELECT_MANY);
		});
	});

	describe('test show decline card', () =>
	{
		it('pick 1', () =>
		{
			expect(component.showDeclineCard).toBeFalse();
		});

		it('pick 0 or 1', () =>
		{
			component.unfilteredPoints = [mockPointPickZero];
			component.selectedDecisionPoint = mockPointPickZero;
			fixture.detectChanges();

			expect(component.showDeclineCard).toBeTrue();
		});

		it('pick 1 or more', () =>
		{
			component.unfilteredPoints = [mockPointPickOneOrMore];
			component.selectedDecisionPoint = mockPointPickOneOrMore;
			fixture.detectChanges();

			expect(component.showDeclineCard).toBeFalse();
		});

		it('pick 0 or more', () =>
		{
			component.unfilteredPoints = [mockPointPickZeroOrMore];
			component.selectedDecisionPoint = mockPointPickZeroOrMore;
			fixture.detectChanges();

			expect(component.showDeclineCard).toBeTrue();
		});

		it('is structural item', () =>
		{
			component.unfilteredPoints = [mockPointPickZeroStructuralItem];
			component.selectedDecisionPoint = mockPointPickZeroStructuralItem;
			fixture.detectChanges();

			expect(component.showDeclineCard).toBeFalse();
		});

		it('is presale and a structural item', () =>
		{
			component.unfilteredPoints = [mockPointPickZeroStructuralItem];
			component.selectedDecisionPoint = mockPointPickZeroStructuralItem;
			component.buildMode = BuildMode.Presale;
			fixture.detectChanges();

			expect(component.showDeclineCard).toBeTrue();
		});

		it ('is past cutoff', () =>
		{
			component.unfilteredPoints = [mockPointPickZeroPastCutoff];
			component.selectedDecisionPoint = mockPointPickZeroPastCutoff;
			fixture.detectChanges();

			expect(component.showDeclineCard).toBeFalse();
		});

		it('point has a contracted choice', () =>
		{
			component.unfilteredPoints = [mockPointPickZeroWithContractedChoice];
			component.selectedDecisionPoint = mockPointPickZeroWithContractedChoice;
			fixture.detectChanges();

			expect(component.showDeclineCard).toBeFalse();
		});
	});

	it('shows correct group and subgroup label', () =>
	{
		const groupSubGroupLabel = findElementByTestId(fixture, 'group-subgroup-label').nativeElement.innerText;

		expect(groupSubGroupLabel).toBe(`${component.selectedGroup.label}: ${component.selectedSubGroup.label}`);
	})
});

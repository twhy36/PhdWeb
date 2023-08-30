import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { createSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { ChoiceCardComponent } from './choice-card.component';
import { mockOption1, testDecisionPoint, testMyFavoriteStateWithSalesChoices, testTreeVersion } from '../../../shared/classes/mockdata.class';
import { ChoicePriceWithRangeCheckPipe } from '../../../shared/pipes/choicePriceWithRangeCheck.pipe';
import { MockCloudinaryImageComponent } from '../../../shared/mocks/mock-cloudinary-image';
import { ChoiceStatus } from '../../../shared/classes/constants.class';
import { findElementByTestId } from '../../../shared/classes/test-utils.class';

describe('ChoiceCardComponent', () => 
{
	let component: ChoiceCardComponent;
	let fixture: ComponentFixture<ChoiceCardComponent>;
	let mockStore: MockStore;

	const initialState = {
		favorite: fromFavorite.initialState,
		salesAgreement: fromSalesAgreement.initialState,
		scenario: {
			...fromScenario.initialState,
			tree: {
				...fromScenario.initialState.tree,
				treeVersion: testTreeVersion,
			},
			rules: {
				optionRules: [
					{
						ruleId: 12,
						optionId: 'option12',
						choices: [],
						replaceOptions: [],
					},
				],
				choiceRules: [],
				pointRules: [],
			},
			options: [mockOption1],
		},
	};

	const mockPoint = testTreeVersion.groups.flatMap(g => g.subGroups).flatMap(sg => sg.points)[0];
	const mockPointPastCutoff = { ...mockPoint, isPastCutOff: true }
	const mockUnfilteredPointWithOtherContractedChoice = {
		...mockPoint,
		choices: [
			mockPoint.choices[0],
			mockPoint.choices[1],
			{
				...mockPoint.choices[2],
				divChoiceCatalogId: 2082
			}
		]
	}
	const mockChoice = mockPoint.choices[0];
	const mockContractedChoice = { ...mockChoice, divChoiceCatalogId: 2082 };

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				ChoiceCardComponent,
				ChoicePriceWithRangeCheckPipe,
				MockCloudinaryImageComponent
			],
			imports: [
				MatCheckboxModule,
				MatIconModule
			],
			providers: [
				provideMockStore({ initialState }),
			]
		}).compileComponents();

		mockStore = TestBed.inject(MockStore);
		mockStore.overrideSelector(fromFavorite.favoriteState, testMyFavoriteStateWithSalesChoices);
		
		spyOn(fromScenario, 'selectUnfilteredPoint').and.returnValue(createSelector(
			(v) => v,
			() => testDecisionPoint
		));

		fixture = TestBed.createComponent(ChoiceCardComponent);

		component = fixture.componentInstance;

		component.choice = structuredClone(mockChoice)
		component.point = structuredClone(mockPoint);
		fixture.detectChanges();
	});

	afterEach(() =>
	{
		mockStore.resetSelectors();
		component.choice = structuredClone(mockChoice);
		component.point = structuredClone(mockPoint);
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('sets choice status correctly', () =>
	{
		it('choice status is available', () =>
		{
			const favoriteIcon = findElementByTestId(fixture, 'favorite-icon');
			expect(favoriteIcon).toBeTruthy();
			expect(component.choiceStatus).toBe(ChoiceStatus.Available);
		});

		it('choice status is contracted because point is past cut off', () =>
		{
			// Set point to past cutoff
			component.point = mockPointPastCutoff;
			fixture.detectChanges();

			const contractedIcon = findElementByTestId(fixture, 'contracted-icon');
			expect(contractedIcon).toBeTruthy();
			expect(component.choiceStatus).toBe(ChoiceStatus.Contracted);
		});

		it('choice status is contracted because it is contracted', () =>
		{
			// Set choice catalog id to be one of the contracted choices
			component.choice = mockContractedChoice;
			fixture.detectChanges();

			const contractedIcon = findElementByTestId(fixture, 'contracted-icon');
			expect(contractedIcon).toBeTruthy();
			expect(component.choiceStatus).toBe(ChoiceStatus.Contracted);
		});

		it('choice status is view only', () =>
		{
			component.unfilteredPoint = mockUnfilteredPointWithOtherContractedChoice;
			fixture.detectChanges();

			expect(component.choiceStatus).toBe(ChoiceStatus.ViewOnly);
		});
	});

	it('dispatches action to save favorites when choice is favorited', () => 
	{
		component.myFavoritesPointsDeclined = [{
			id: 3,
			myFavoriteId: -1,
			dPointId: 17,
			divPointCatalogId: 666,
		},
		{
			dPointId: 16,
			divPointCatalogId: 2269,
			id: 2,
			myFavoriteId: -1
		}];
		fixture.detectChanges();

		const dispatchSpy = spyOn(mockStore, 'dispatch');

		const favoriteButton = findElementByTestId(fixture, 'favorite-button');
		favoriteButton.nativeElement.click();

		expect(dispatchSpy).toHaveBeenCalledWith(
			new ScenarioActions.SelectChoices(false, {
				choiceId: 3494441,
				divChoiceCatalogId: 7465,
				quantity: 1,
				attributes: [],
			})
		);
		expect(dispatchSpy).toHaveBeenCalledWith(new FavoriteActions.SaveMyFavoritesChoices());
		expect(dispatchSpy).toHaveBeenCalledWith(new FavoriteActions.DeleteMyFavoritesPointDeclined(component.myFavoriteId, 2));
	});
});

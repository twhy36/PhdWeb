import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { ChoiceDeclineCardComponent } from './choice-decline-card.component';
import { mockPoint2, mockPoint3, testMyFavoriteStateWithSalesChoices, testTreeVersion } from '../../../shared/classes/mockdata.class';
import { MockCloudinaryImageComponent } from '../../../shared/mocks/mock-cloudinary-image';
import { findElementByTestId } from '../../../shared/classes/test-utils.class';

describe('ChoiceDeclineCardComponent', () => 
{
	let component: ChoiceDeclineCardComponent;
	let fixture: ComponentFixture<ChoiceDeclineCardComponent>;

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
		},
	}

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				ChoiceDeclineCardComponent,
				MockCloudinaryImageComponent
			],
			imports: [ MatIconModule ],
			providers: [provideMockStore({ initialState })]
		}).compileComponents();

		mockStore = TestBed.inject(MockStore);
		mockStore.overrideSelector(fromFavorite.favoriteState, testMyFavoriteStateWithSalesChoices);

		fixture = TestBed.createComponent(ChoiceDeclineCardComponent);
		component = fixture.componentInstance;
		component.decisionPoint = mockPoint2;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('declined status renders properly', () =>
	{
		it('card is not declined', () =>
		{
			const favoriteIcon = findElementByTestId(fixture, 'favorite-icon');

			expect(favoriteIcon.nativeElement.outerText).toBe('favorite_outline');
			expect(component.isDeclined).toBeFalse();
		});

		it('card is declined', () =>
		{
			component.decisionPoint = mockPoint3;
			fixture.detectChanges();

			const favoriteIcon = findElementByTestId(fixture, 'favorite-icon');

			expect(favoriteIcon.nativeElement.outerText).toBe('favorite');
			expect(component.isDeclined).toBeTrue();
		});
	});

	describe('dispatches correct actions', () =>
	{
		it('decline decision point', () =>
		{
			const dispatchSpy = spyOn(mockStore, 'dispatch');

			const favoriteButton = findElementByTestId(fixture, 'favorite-button');
			favoriteButton.nativeElement.click();

			const declinedPoint = component.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === component.decisionPoint.divPointCatalogId)

			expect(dispatchSpy).toHaveBeenCalledWith(new FavoriteActions.AddMyFavoritesPointDeclined(testMyFavoriteStateWithSalesChoices.selectedFavoritesId, mockPoint2.id, mockPoint2.divPointCatalogId));
			expect(dispatchSpy).toHaveBeenCalledWith(new ScenarioActions.SelectChoices(component.isDesignComplete, ...[]));
			expect(dispatchSpy).toHaveBeenCalledWith(new FavoriteActions.SaveMyFavoritesChoices());
			expect(dispatchSpy).toHaveBeenCalledWith(new ScenarioActions.SetStatusForPointsDeclined([component.decisionPoint.divPointCatalogId], !!declinedPoint));
		});

		it('undo decline decision point', () =>
		{
			component.decisionPoint = mockPoint3;
			fixture.detectChanges();

			const dispatchSpy = spyOn(mockStore, 'dispatch');

			const favoriteButton = findElementByTestId(fixture, 'favorite-button');
			favoriteButton.nativeElement.click();

			const declinedPoint = component.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === component.decisionPoint.divPointCatalogId)

			expect(dispatchSpy).toHaveBeenCalledWith(new FavoriteActions.DeleteMyFavoritesPointDeclined(testMyFavoriteStateWithSalesChoices.selectedFavoritesId, declinedPoint.id));
			expect(dispatchSpy).toHaveBeenCalledWith(new ScenarioActions.SetStatusForPointsDeclined([component.decisionPoint.divPointCatalogId], !!declinedPoint));
		})
	});
});

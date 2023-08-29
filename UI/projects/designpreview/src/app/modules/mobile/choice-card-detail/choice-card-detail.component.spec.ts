import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { of } from 'rxjs';

import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as fromRoot from '../../ngrx-store/reducers';
import * as FavoriteActions from '../../ngrx-store/favorite/actions';
import * as ScenarioActions from '../../ngrx-store/scenario/actions';

import { ChoiceCardDetailComponent } from './choice-card-detail.component';
import { findElementByTestId } from '../../shared/classes/test-utils.class';
import
{
	mockOption1,
	testMyFavorite,
	testTreeVersion,
} from '../../shared/classes/mockdata.class';
import { MockCloudinaryImageComponent } from '../../shared/mocks/mock-cloudinary-image';
import { MockEstimatedTotalsComponent } from '../../shared/mocks/mock-estimated-totals-component';
import { ChoiceExt } from '../../shared/models/choice-ext.model';

@Component({ selector: 'action-bar-mobile', template: '' })
class ActionBarStubComponent
{
	@Input() showBack: boolean;
}

@Component({ selector: 'attribute-group-mobile', template: ''})
class AttributeGroupStubComponent
{
	@Input() currentChoice: ChoiceExt;
}

@Component({ selector: 'location-group', template: ''})
class LocationGroupStubComponent { }

describe('ChoiceCardDetailComponent', () => 
{
	let component: ChoiceCardDetailComponent;
	let fixture: ComponentFixture<ChoiceCardDetailComponent>;

	let mockStore: MockStore;
	const initialState = {
		favorite: fromFavorite.initialState,
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
		salesAgreement: fromSalesAgreement.initialState,
	};

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				ChoiceCardDetailComponent,
				MockEstimatedTotalsComponent,
				ActionBarStubComponent,
				MockCloudinaryImageComponent,
				AttributeGroupStubComponent,
				LocationGroupStubComponent,
			],
			imports: [MatIconModule, NgbModule],
			providers: [
				provideMockStore({ initialState }),
				{
					provide: ActivatedRoute,
					useValue: {
						paramMap: of(
							convertToParamMap({
								subGroupId: testTreeVersion.groups[0].subGroups[0].id,
								decisionPointId: testTreeVersion.groups[0].subGroups[0].points[0].id,
								choiceId: testTreeVersion.groups[0].subGroups[0].points[0].choices[0].id,
							})
						),
					},
				},
			],
		}).compileComponents();

		mockStore = TestBed.inject(MockStore);
		mockStore.overrideSelector(
			fromFavorite.currentMyFavorite,
			testMyFavorite
		);
		mockStore.overrideSelector(
			fromRoot.filteredTree,
			testTreeVersion
		);

		fixture = TestBed.createComponent(ChoiceCardDetailComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	afterEach(() => 
	{
		mockStore.resetSelectors();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('shows correct text elements', () => 
	{
		it('shows label', () => 
		{
			const label = findElementByTestId(fixture, 'choice-label');
			expect(label.nativeElement.textContent.trim()).toBe(
				'Cabinet Hardware Level 1'
			);
		});

		it('shows description', () => 
		{
			const description = findElementByTestId(
				fixture,
				'description-text'
			);
			expect(description.nativeElement.textContent.trim()).toBe(
				'Select pulls and/or knobs for your cabinet doors and drawers throughout house. All doors must match, all drawers must match.'
			);
		});

		it('shows selected options disclaimer', () => 
		{
			const optionsDisclaimer = findElementByTestId(
				fixture,
				'selected-options-disclaimer'
			);
			expect(optionsDisclaimer.nativeElement.textContent.trim()).toBe(
				'Option selections are not final until purchased via a signed agreement or change order.'
			);
		});

		it('shows images disclaimer', () => 
		{
			const imagesDisclaimer = findElementByTestId(
				fixture,
				'images-disclaimer'
			);
			expect(imagesDisclaimer.nativeElement.textContent.trim()).toBe(
				'Images are examples only. Products are subject to change.'
			);
		});
	});

	it('shows blocked icon when choice is available but not enabled', () => 
	{
		component.choice.choiceStatus = 'Available';
		component.choice.enabled = false;
		fixture.detectChanges();
		const blockedIcon = findElementByTestId(fixture, 'blocked-icon');
		expect(blockedIcon).toBeTruthy();
	});

	describe('description text', () => 
	{
		it('does not show either expansion text when description is not overflowed', () => 
		{
			component.descOverflowedOnLoad = false;
			fixture.detectChanges();

			const expandText = findElementByTestId(fixture, 'expand-text');

			expect(expandText).toBeFalsy();
		});

		it('shows "See More" text when description overflows"', async () => 
		{
			const textOverflowSpy = spyOn(component, 'isTextOverflow');
			textOverflowSpy.and.returnValue(true);
			component.descOverflowedOnLoad = true;
			fixture.detectChanges();

			const expandText = findElementByTestId(fixture, 'expand-text');

			expect(expandText.nativeElement.innerText).toBe('See More');
		});

		it('shows "See Less" text when description overflows but is expanded', () => 
		{
			const textOverflowSpy = spyOn(component, 'isTextOverflow');
			textOverflowSpy.and.returnValue(false);
			component.descOverflowedOnLoad = true;
			fixture.detectChanges();

			const expandText = findElementByTestId(fixture, 'expand-text');

			expect(expandText.nativeElement.innerText).toBe('See Less');
		});
	});

	describe('carousel works', () => 
	{
		it('shows first image as selected', () => 
		{
			const firstImageThumbnail = findElementByTestId(
				fixture,
				'thumbnail-image-0'
			);
			expect(
				firstImageThumbnail.classes['phd-choice-image-selected']
			).toBeTruthy();
		});

		it('changes pics when a different thumbnail is clicked', () => 
		{
			const secondImageThumbnail = findElementByTestId(
				fixture,
				'thumbnail-image-1'
			);
			secondImageThumbnail.nativeElement.click();
			expect(component.selectedImageUrl).toBe(
				'https://pultegroup.picturepark.com/Go/QLEH95YR/V/369615/16'
			);
		});

		it('adds no images url to choice images when there are no images', async () => 
		{
			component.choice.options = [];
			component.activeIndex.current = 0;
			component.getImages();
			expect(component.choiceImages).toHaveSize(1);
			expect(component.choiceImages).toEqual([
				{ imageURL: '' },
			]);
		});
	});

	it('dispatches action to save favorites when choice is favorited', () => 
	{
		component.choice.choiceStatus = 'Available';
		component.choice.enabled = true;
		fixture.detectChanges();

		const dispatchSpy = spyOn(mockStore, 'dispatch');

		const favoriteIcon = findElementByTestId(fixture, 'favorite-icon');
		favoriteIcon.nativeElement.click();

		expect(dispatchSpy).toHaveBeenCalledWith(
			new ScenarioActions.SelectChoices(false, {
				choiceId: 3494441,
				divChoiceCatalogId: 7465,
				quantity: 1,
				attributes: [],
			})
		);
		expect(dispatchSpy).toHaveBeenCalledWith(
			new FavoriteActions.SaveMyFavoritesChoices()
		);
	});
});

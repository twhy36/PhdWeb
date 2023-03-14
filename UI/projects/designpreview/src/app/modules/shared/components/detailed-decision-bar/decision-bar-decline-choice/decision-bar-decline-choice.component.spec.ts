import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';

import { ModalService, PointStatus } from 'phd-common';

import { DecisionBarDeclineChoiceComponent } from './decision-bar-decline-choice.component';
import { ActionBarComponent } from '../../action-bar/action-bar.component';

describe('DecisionBarDeclineChoiceComponent', () =>
{
	let component: DecisionBarDeclineChoiceComponent;
	let fixture: ComponentFixture<DecisionBarDeclineChoiceComponent>;
	let modalService: ModalService;

	beforeEach(fakeAsync(() => 
	{
		TestBed.configureTestingModule({
			declarations: [
				DecisionBarDeclineChoiceComponent,
				ActionBarComponent
			],
			providers: [
				{
					provide: ModalService,
					useValue: modalService
				},
			]
		})
			.compileComponents();
	}));

	beforeEach(() => 
	{
		fixture = TestBed.createComponent(DecisionBarDeclineChoiceComponent);
		component = fixture.componentInstance;
		component.point = {
			id: 10,
			hasPointToPointRules: false,
			hasPointToChoiceRules: false,
			subGroupId: 1,
			divPointCatalogId: 11,
			pointPickTypeId: 1,
			pointPickTypeLabel: '',
			sortOrder: 0,
			isQuickQuoteItem: false,
			isStructuralItem: false,
			label: 'test point 10',
			description: '',
			treeVersionId: 1,
			choices: [{
				mappedAttributeGroups: [],
				mappedLocationGroups: [],
				attributeGroups: [],
				locationGroups: [],
				choiceMaxQuantity: null,
				description: '',
				disabledBy: [],
				divChoiceCatalogId: 0,
				enabled: true,
				hasChoiceRules: false,
				hasOptionRules: false,
				id: 4,
				imagePath: '',
				hasImage: false,
				isDecisionDefault: false,
				isSelectable: true,
				label: 'test Choice 4',
				maxQuantity: 1,
				options: [],
				overrideNote: '',
				price: 100,
				quantity: 0,
				selectedAttributes: [],
				sortOrder: 0,
				treePointId: 3,
				treeVersionId: 1,
				lockedInOptions: [],
				changedDependentChoiceIds: [],
				lockedInChoice: null,
				mappingChanged: false,
			}],
			completed: false,
			viewed: false,
			enabled: true,
			disabledBy: [],
			status: PointStatus.REQUIRED,
			price: 0,
			dPointTypeId: 10,
			subGroupCatalogId: 3,
			isPastCutOff: false
		};
		component.myFavoritesPointsDeclined = [];
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('isDeclined', () => 
	{
		describe('when the point is not in the myFavoritesPointsDeclined array', () => 
		{
			it('should not be declined', () => 
			{
				expect(component.isDeclined).toEqual(false);
			});
		});
		describe('when the point is in the myFavoritesPointsDeclined array', () => 
		{
			it('should be declined', () => 
			{
				component.myFavoritesPointsDeclined = [{
					id: 1,
					myFavoriteId: 1,
					dPointId: 10,
					divPointCatalogId: 11
				}];
				component.updateIsDeclined();
				expect(component.isDeclined).toEqual(true);
			});
		});
	});
});

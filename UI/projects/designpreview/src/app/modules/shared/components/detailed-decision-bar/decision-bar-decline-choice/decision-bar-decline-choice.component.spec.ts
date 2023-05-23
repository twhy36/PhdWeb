import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';

import { ModalService, PointStatus } from 'phd-common';

import * as fromApp from '../../../../ngrx-store/app/reducer';
import * as fromChangeOrder from '../../../../ngrx-store/change-order/reducer';
import * as fromJob from '../../../../ngrx-store/job/reducer';
import * as fromOrg from '../../../../ngrx-store/org/reducer';
import * as fromPlan from '../../../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../../../ngrx-store/scenario/reducer';

import { DecisionBarDeclineChoiceComponent } from './decision-bar-decline-choice.component';
import { ActionBarComponent } from '../../action-bar/action-bar.component';
import { provideMockStore } from '@ngrx/store/testing';
import { instance, mock } from 'ts-mockito';

describe('DecisionBarDeclineChoiceComponent', () =>
{
	let component: DecisionBarDeclineChoiceComponent;
	let fixture: ComponentFixture<DecisionBarDeclineChoiceComponent>;
	const mockModalService = mock(ModalService);
	const initialState = {
		app: fromApp.initialState,
		salesAgreement: fromSalesAgreement.initialState,
		plan: fromPlan.initialState,
		org: fromOrg.initialState,
		job: fromJob.initialState,
		changeOrder: fromChangeOrder.initialState,
		scenario: fromScenario.initialState
	};

	beforeEach(fakeAsync(() => 
	{
		TestBed.configureTestingModule({
			declarations: [
				DecisionBarDeclineChoiceComponent,
				ActionBarComponent
			],
			providers: [
				{ provide: ModalService, useFactor: () => instance(mockModalService) },
				provideMockStore({ initialState })
			]
		}).compileComponents();
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

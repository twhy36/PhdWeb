import { ChangeDetectorRef } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MockComponent } from 'ng2-mock-component';
import { Observable } from 'rxjs';
import { instance, mock, when } from 'ts-mockito';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromOrg from '../../../ngrx-store/org/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as fromChangeOrder from '../../../ngrx-store/change-order/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { MyFavoritesComponent } from './my-favorites.component';
import { PointStatus } from 'phd-common';
import { TreeService } from '../../../core/services/tree.service';

describe('MyFavoritesComponent', () =>
{
	let component: MyFavoritesComponent;
	let fixture: ComponentFixture<MyFavoritesComponent>;
	let mockStore: MockStore;
	const initialState = {
		salesAgreement: fromSalesAgreement.initialState,
		lot: fromLot.initialState,
		plan: fromPlan.initialState,
		org: fromOrg.initialState,
		job: fromJob.initialState,
		changeOrder: fromChangeOrder.initialState,
		scenario: fromScenario.initialState
	};
	const mockActivatedRoute = mock(ActivatedRoute);
	const mockRouter = mock(Router);
	when(mockActivatedRoute.paramMap).thenCall(() => new Observable());
	when(mockActivatedRoute.data).thenCall(() => new Observable());
	const mockChangeDetectorRef = mock(ChangeDetectorRef);
	const mockTreeService = mock(TreeService);

	beforeEach(async(() =>
	{
		TestBed.configureTestingModule({
			declarations: [
				MyFavoritesComponent,
				MockComponent({ selector: 'group-bar', inputs: ['communityName', 'planName', 'groups', 'selectedSubGroupId'], outputs: ['onSubgroupSelected', 'onSetTreeFilter'] }),
				MockComponent({ selector: 'normal-experience', inputs: ['groupName', 'currentSubgroup', 'errorMessage', 'myFavoritesChoices', 'decisionPointId', 'includeContractedOptions', 'salesChoices', 'groups', 'myFavoritesPointsDeclined', 'choiceImages', 'unfilteredPoints'], outputs: ['onToggleChoice', 'onToggleContractedOptions', 'onViewChoiceDetail', 'onSelectDecisionPoint', 'onDeclineDecisionPoint'] }),
				MockComponent({ selector: 'floor-plan-experience', inputs: ['groupName', 'currentSubgroup', 'errorMessage', 'myFavoritesChoices', 'decisionPointId', 'includeContractedOptions', 'salesChoices', 'marketingPlanId', 'isFloorplanFlipped', 'noVisibleFP', 'unfilteredPoints'], outputs: ['onToggleChoice', 'onToggleContractedOptions', 'onViewChoiceDetail', 'onSelectDecisionPoint'] }),
				MockComponent({ selector: 'choice-card-detail', inputs: ['choice', 'path', 'myFavoritesPointsDeclined'], outputs: ['onBack', 'onToggleChoice'] }),
				MockComponent({ selector: 'action-bar', inputs: ['primaryAction', 'price', 'favoritesPrice'], outputs: ['callToAction'] })
			],
			providers: [
				provideMockStore({ initialState }),
				{ provide: ActivatedRoute, useFactory: () => instance(mockActivatedRoute) },
				{ provide: Router, useFactory: () => instance(mockRouter) },
				{ provide: ChangeDetectorRef, useFactory: () => instance(mockChangeDetectorRef) },
				{ provide: TreeService, useFactory: () => instance(mockTreeService) },
			]
		})
			.compileComponents();

		mockStore = TestBed.inject(MockStore);
	}));

	beforeEach(() =>
	{
		fixture = TestBed.createComponent(MyFavoritesComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});

	describe('selectDecisionPoint', () =>
	{
		it('should set the selected point id', () =>
		{
			component.selectedPointId = 0;
			component.selectDecisionPoint({pointId: 1});
			expect(component.selectedPointId).toEqual(1);
		});
		describe('when the point id is a part of a different subGroup', () =>
		{
			it('should select the new subGroup', () =>
			{
				const onStoreSpy = spyOn(mockStore, 'dispatch');
				component.selectedPointId = 0;
				const groups = [{
					id: 1,
					groupCatalogId: 1,
					treeVersionId: 1,
					sortOrder: 0,
					label: 'test group 1',
					subGroups: [{
						id: 4,
						groupId: 1,
						subGroupCatalogId: 3,
						sortOrder: 0,
						label: 'testing sub group',
						useInteractiveFloorplan: false,
						treeVersionId: 1,
						points: [{
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
							choices: [],
							completed: false,
							viewed: false,
							enabled: true,
							disabledBy: [],
							status: PointStatus.REQUIRED,
							price: 0,
							dPointTypeId: 10,
							subGroupCatalogId: 3,
							isPastCutOff: false
						}],
						status: PointStatus.REQUIRED
					}],
					status: PointStatus.REQUIRED
				}, {
					id: 2,
					groupCatalogId: 1,
					treeVersionId: 1,
					sortOrder: 0,
					label: 'test group 1',
					subGroups: [{
						id: 5,
						groupId: 2,
						subGroupCatalogId: 3,
						sortOrder: 0,
						label: 'testing sub group',
						useInteractiveFloorplan: false,
						treeVersionId: 1,
						points: [{
							id: 11,
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
							choices: [],
							completed: false,
							viewed: false,
							enabled: true,
							disabledBy: [],
							status: PointStatus.REQUIRED,
							price: 0,
							dPointTypeId: 10,
							subGroupCatalogId: 3,
							isPastCutOff: false
						}],
						status: PointStatus.REQUIRED
					}],
					status: PointStatus.REQUIRED
				}];
				component.groups = groups;
				component.selectedSubGroup = groups[0].subGroups[0];

				component.selectDecisionPoint({pointId: 11});
				expect(component.selectedPointId).toEqual(11);
				expect(onStoreSpy).toHaveBeenCalled();
			});
		});
	});
});

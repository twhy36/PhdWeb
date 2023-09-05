import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { Observable } from 'rxjs';
import { instance, mock, when } from 'ts-mockito';

import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as fromRoot from '../../ngrx-store/reducers';
import * as fromScenario from '../../ngrx-store/scenario/reducer';

import { SummaryComponent } from './summary.component';
import { BrandService } from '../../core/services/brand.service';
import { mockPlanState, testGroups, testMyFavoriteStateWithSalesChoices, testTreeVersion } from '../../shared/classes/mockdata.class';
import { GroupExt } from '../../shared/models/group-ext.model';
import { BuildMode } from '../../shared/models/build-mode.model';
import { findElementByTestId } from '../../shared/classes/test-utils.class';
import { Constants } from '../../shared/classes/constants.class';
import { ViewOptionsLinkComponent } from '../shared/view-options-link/view-options-link.component';
import { PendingAndContractedToggleComponent } from '../pending-and-contracted-toggle/pending-and-contracted-toggle.component';
import { PlanSummaryComponent } from '../shared/plan-summary/plan-summary.component';
import { FloorplanImageTabsStubComponent } from '../../shared/mocks/mock-floorplan-image-tabs';

describe('SummaryComponent', () =>
{
	let component: SummaryComponent;
	let fixture: ComponentFixture<SummaryComponent>;
	let mockStore: MockStore;
	const initialState = {
		scenario: fromScenario.initialState,
		plan: mockPlanState,
	};
	const mockActivatedRoute = mock(ActivatedRoute);
	when(mockActivatedRoute.paramMap).thenCall(() => new Observable());
	when(mockActivatedRoute.data).thenCall(() => new Observable());
	const mockChangeDetectorRef = mock(ChangeDetectorRef);
	const mockBrandService = mock(BrandService);
	const mockTitleService = mock(Title);

	beforeEach(async () =>
	{
		await TestBed.configureTestingModule({
			declarations: [
				SummaryComponent,
				ViewOptionsLinkComponent,
				PendingAndContractedToggleComponent,
				PlanSummaryComponent,
				FloorplanImageTabsStubComponent
			],
			imports: [
				RouterTestingModule.withRoutes([]),
				BrowserAnimationsModule,
				FormsModule,
				MatCheckboxModule,
				MatExpansionModule,
				MatIconModule
			],
			providers: [
				provideMockStore({ initialState }),
				{ provide: ActivatedRoute, useFactory: () => instance(mockActivatedRoute) },
				{ provide: ChangeDetectorRef, useFactory: () => instance(mockChangeDetectorRef) },
				{ provide: BrandService, useFactory: () => instance(mockBrandService) },
				{ provide: Title, useFactory: () => instance(mockTitleService) },
			]
		})
			.compileComponents();
		mockStore = TestBed.inject(MockStore);
		mockStore.overrideSelector(fromRoot.filteredTree, testTreeVersion);
		mockStore.overrideSelector(fromFavorite.favoriteState, testMyFavoriteStateWithSalesChoices);

		fixture = TestBed.createComponent(SummaryComponent);
		component = fixture.componentInstance;
	});

	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});

	it('should display collapse links when has groups', () =>
	{
		component.groups = testGroups.map(g =>
		{
			return new GroupExt(g);
		});
		// need to make includeContractedOptions true to show groups section that contains collapse link shows
		mockStore.overrideSelector(fromFavorite.favoriteState, {
			includeContractedOptions: true,
			myFavorites: [],
			selectedFavoritesId: 0,
			isLoading: false,
			saveError: false,
			salesChoices: [],
		});
		fixture.detectChanges();
		const collapseButton = findElementByTestId(fixture, 'expand-collapse-button');
		expect(collapseButton.nativeElement.innerText).toBe('Collapse All');
	});

	it('should display print icon', () =>
	{
		const element = fixture.debugElement.nativeElement;
		expect(element.querySelector('.phd-fav-title').textContent).toContain('print');
	});

	it('should display prices with link when presale with price', () =>
	{

		component.isPresalePricingEnabled = true;
		fixture.detectChanges();

		const element = fixture.debugElement.nativeElement;
		expect(element.querySelector('.phd-fav-link-button').textContent).toContain('See Less');
		expect(element.querySelector('.phd-fav-price-sum-row').textContent).toContain('Total');
	});

	it('should display prices with link when post contract', () =>
	{

		component.buildMode = BuildMode.Buyer;
		fixture.detectChanges();

		const element = fixture.debugElement.nativeElement;
		expect(element.querySelector('.phd-fav-link-button').textContent).toContain('See Less');
		expect(element.querySelector('.phd-fav-price-sum-row').textContent).toContain('Total');
	});

	it('should display prices with link when post contract buyer preview', () =>
	{

		component.buildMode = BuildMode.BuyerPreview;;
		fixture.detectChanges();

		const element = fixture.debugElement.nativeElement;
		expect(element.querySelector('.phd-fav-link-button').textContent).toContain('See Less');
		expect(element.querySelector('.phd-fav-price-sum-row').textContent).toContain('Total');
	});

	it('should display prices with link when preview', () =>
	{

		component.buildMode = BuildMode.Preview;
		fixture.detectChanges();

		const element = fixture.debugElement.nativeElement;
		expect(element.querySelector('.phd-fav-link-button').textContent).toContain('See Less');
		expect(element.querySelector('.phd-fav-price-sum-row').textContent).toContain('Total');
	});

	describe('Visible floorplan value', () => 
	{
		beforeEach(() =>
		{
			mockStore.setState({
				scenario: { tree: { treeVersion: testTreeVersion } },
				plan: mockPlanState,
			});
			component.includeContractedOptions = false;
		});

		it('sets visibleFP = true if there is a marketingPlanId, treeVersion, and subgroup with interactive floorplan', () => 
		{
			fixture.detectChanges();
			expect(component.visibleFP).toBeTrue();
		});

		it('sets visibleFP = false if there is no plan', () => 
		{
			mockStore.setState({
				...initialState,
				plan: null,
			});
			fixture.detectChanges();
			expect(component.visibleFP).toBeFalse();
		});
		
		it('sets visibleFP = false if there is no marketingPlanId array', () => 
		{
			mockStore.setState({
				...initialState,
				plan: { ...mockPlanState, marketingPlanId: null },
			});
			fixture.detectChanges();
			expect(component.visibleFP).toBeFalse();
		});

		it('sets visibleFP = false if the marketingPlandId array is empty', () => 
		{
			mockStore.setState({
				...initialState,
				plan: { ...mockPlanState, marketingPlanId: [] },
			});
			fixture.detectChanges();
			expect(component.visibleFP).toBeFalse();
		});

		it('sets visibleFP = false if there is no tree', () => 
		{
			mockStore.setState({
				...initialState,
				scenario: { tree: null },
			});
			fixture.detectChanges();
			expect(component.visibleFP).toBeFalse();
		});

		it('sets visibleFP = false if there is no tree version', () => 
		{
			mockStore.setState({
				...initialState,
				scenario: { tree: { treeVersion: null } },
			});
			fixture.detectChanges();
			expect(component.visibleFP).toBeFalse();
		});

		it('sets visibleFP = false if there is no subgroup with floorplan', () => 
		{
			const groupsWithoutFloorplan = testTreeVersion.groups.map(
				(g) => 
				{
					return {
						...g,
						subGroups: g.subGroups.map((sg) => 
						{
							return {
								...sg,
								useInteractiveFloorplan: false,
							};
						}),
					};
				}
			);
			mockStore.setState({
				...initialState,
				scenario: {
					tree: {
						treeVersion: {
							...testTreeVersion,
							groups: groupsWithoutFloorplan,
						},
					},
				},
			});
			fixture.detectChanges();
			expect(component.visibleFP).toBeFalse();
		});
	});

	describe('When visible floorplan is true', () => 
	{
		beforeEach(() => 
		{
			// make sure visible FP true
			mockStore.setState({
				scenario: { tree: { treeVersion: testTreeVersion } },
				plan: mockPlanState,
			});
			// make sure groups show up
			component.groups = testGroups.map((g) => 
			{
				return new GroupExt(g);
			});
			mockStore.overrideSelector(fromFavorite.favoriteState, {
				includeContractedOptions: true,
				myFavorites: [],
				selectedFavoritesId: 0,
				isLoading: false,
				saveError: false,
				salesChoices: []
			});
			fixture.detectChanges();
		});

		it('shows floorplan expansion panel', () => 
		{
			expect(
				findElementByTestId(fixture, 'floorplan-expansion-panel')
			).toBeTruthy();
		});

		it('shows Floorplan Image heading', () => 
		{
			expect(
				findElementByTestId(fixture, 'panel-title').nativeElement
					.innerText
			).toBe('Floorplan Image');
		});

		it('shows floorplan disclaimer', () => 
		{
			expect(
				findElementByTestId(fixture, 'floorplan-disclaimer')
					.nativeElement.innerText
			).toBe(Constants.FLOORPLAN_DISCLAIMER_MESSAGE);
		});
	});

	describe('When visible floorplan is false', () => 
	{
		beforeEach(() => 
		{
			component.visibleFP = false;
			// make sure groups show up
			component.groups = testGroups.map((g) => 
			{
				return new GroupExt(g);
			});
			component.includeContractedOptions = true;
			fixture.detectChanges();
		});

		it('does not show floorplan expansion panel', () => 
		{
			expect(
				findElementByTestId(fixture, 'floorplan-expansion-panel')
			).toBeFalsy();
		});
	});

});

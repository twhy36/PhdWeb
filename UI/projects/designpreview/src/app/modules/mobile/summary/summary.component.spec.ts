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
import * as fromScenario from '../../ngrx-store/scenario/reducer';

import { SummaryComponent } from './summary.component';
import { BrandService } from '../../core/services/brand.service';
import { testGroups, testMyFavoriteStateWithSalesChoices } from '../../shared/classes/mockdata.class';
import { GroupExt } from '../../shared/models/group-ext.model';
import { BuildMode } from '../../shared/models/build-mode.model';
import { ViewOptionsLinkComponent } from '../shared/view-options-link/view-options-link.component';
import { PendingAndContractedToggleComponent } from '../pending-and-contracted-toggle/pending-and-contracted-toggle.component';
import { PlanSummaryComponent } from '../shared/plan-summary/plan-summary.component';
import { findElementByTestId } from '../../shared/classes/test-utils.class';

describe('SummaryComponent', () =>
{
	let component: SummaryComponent;
	let fixture: ComponentFixture<SummaryComponent>;
	let mockStore: MockStore;
	const initialState = {
		scenario: fromScenario.initialState
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
				PlanSummaryComponent
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
		mockStore.overrideSelector(fromFavorite.favoriteState, testMyFavoriteStateWithSalesChoices);

		fixture = TestBed.createComponent(SummaryComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});

	it('should display expand links when has groups', () =>
	{
		component.groups = testGroups.map(g =>
		{
			return new GroupExt(g);
		});
		component.includeContractedOptions = true;
		fixture.detectChanges();

		const expandButton = findElementByTestId(fixture, 'expand-collapse-button');
		expect(expandButton.nativeElement.innerText).toBe('Expand All')
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
});

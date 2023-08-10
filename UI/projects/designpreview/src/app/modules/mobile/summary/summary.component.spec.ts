import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryComponent } from './summary.component';
import { instance, mock, when } from 'ts-mockito';
import { ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromScenario from '../../ngrx-store/scenario/reducer';
import { ChangeDetectorRef } from '@angular/core';
import { BrandService } from '../../core/services/brand.service';
import { Title } from '@angular/platform-browser';
import { testGroups } from '../../shared/classes/mockdata.class';
import { GroupExt } from '../../shared/models/group-ext.model';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterTestingModule } from '@angular/router/testing';
import { BuildMode } from '../../shared/models/build-mode.model';
import { ViewOptionsLinkComponent } from '../view-options-link/view-options-link.component';

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
			declarations: [SummaryComponent, ViewOptionsLinkComponent],
			imports: [
				RouterTestingModule.withRoutes([]),
				BrowserAnimationsModule,
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
		fixture.detectChanges();

		const element = fixture.debugElement.nativeElement;
		expect(element.querySelector('.phd-fav-text-end').textContent).toContain('Expand All');
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

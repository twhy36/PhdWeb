import { ComponentFixture, TestBed } from '@angular/core/testing';
import { instance, mock } from 'ts-mockito';
import { Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MemoizedSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SpyLocation } from '@angular/common/testing';

import * as fromPlan from '../../ngrx-store/plan/reducer';
import * as fromRoot from '../../ngrx-store/reducers';

import { BrandService } from '../../core/services/brand.service';
import { BuildMode } from '../../shared/models/build-mode.model';
import { findElementByTestId } from '../../shared/classes/test-utils.class';
import { LandingComponent } from './landing.component';
import { MockCloudinaryImageComponent } from '../../shared/mocks/mock-cloudinary-image';
import { mockPlan } from '../../shared/classes/mockdata.class';
import { RouterTestingModule } from '@angular/router/testing';
import { ViewOptionsLinkComponent } from '../shared/view-options-link/view-options-link.component';

describe('LandingComponent', () => 
{
	let component: LandingComponent;
	let fixture: ComponentFixture<LandingComponent>;

	let mockStore: MockStore;
	const initialState = {
		scenario: { buildMode: BuildMode.Presale },
	};
	const mockBrandService = mock(BrandService);
	let instanceBrandService: BrandService;
	let elevationImageUrlSelector: MemoizedSelector<fromRoot.State, string>;

	const expectedElevationImageUrl = 'test-elevation-url';
	const expectedFinancialCommunityName = 'Test Financial Community';

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				LandingComponent,
				MockCloudinaryImageComponent,
				ViewOptionsLinkComponent,
			],
			imports: [MatIconModule, RouterTestingModule.withRoutes([])],
			providers: [
				provideMockStore({ initialState }),
				{
					provide: BrandService,
					useFactory: () => instance(mockBrandService),
				},
				{ provide: Location, useClass: SpyLocation },
			],
		}).compileComponents();

		instanceBrandService = TestBed.inject(BrandService);
		mockStore = TestBed.inject(MockStore);

		mockStore.overrideSelector(
			fromRoot.elevationImageUrl,
			expectedElevationImageUrl
		);
		mockStore.overrideSelector(
			fromRoot.financialCommunityName,
			expectedFinancialCommunityName
		);
		mockStore.overrideSelector(fromPlan.selectedPlanData, mockPlan);

		fixture = TestBed.createComponent(LandingComponent);
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

	describe('Presale renders correctly', () => 
	{
		it('shows community name and plan name', () => 
		{
			const elevationInfo = findElementByTestId(
				fixture,
				'elevation-info'
			);
			expect(elevationInfo.nativeElement.innerText).toBe(
				`${expectedFinancialCommunityName}\n${mockPlan.salesName}`
			);
		});

		it('shows correct title', () => 
		{
			const title = findElementByTestId(fixture, 'title');
			expect(title.nativeElement.innerText).toBe(
				'Let\'s start personalizing your future home.'
			);
		});
	});

	describe('Non-presale renders correctly', () => 
	{
		it('shows community name and plan name', () => 
		{
			mockStore.setState({ scenario: BuildMode.Buyer });
			fixture.detectChanges();
			const elevationInfo = findElementByTestId(
				fixture,
				'elevation-info'
			);
			expect(elevationInfo.nativeElement.innerText).toBe(
				`${expectedFinancialCommunityName}\n${mockPlan.salesName}`
			);
		});

		it('shows correct title', () => 
		{
			mockStore.setState({ scenario: BuildMode.Buyer });
			fixture.detectChanges();
			const title = findElementByTestId(fixture, 'title');
			expect(title.nativeElement.innerText).toBe(
				'Let\'s start personalizing your home.'
			);
		});
	});

	it('shows plan image if it exists', () => 
	{
		const planImage = findElementByTestId(fixture, 'elevation-image');
		const brandImage = findElementByTestId(fixture, 'brand-logo');
		expect(planImage).toBeTruthy();
		expect(brandImage).toBeFalsy();
	});

	it('shows brand image if plan image does not exist', () => 
	{
		spyOn(instanceBrandService, 'getBrandImage').and.returnValue(
			'test-brand-url'
		);
		mockStore.overrideSelector(
			fromRoot.elevationImageUrl,
			null
		);
		mockStore.refreshState();
		fixture.detectChanges();

		const planImage = findElementByTestId(fixture, 'elevation-image');
		const brandImage = findElementByTestId(fixture, 'brand-logo');
		expect(planImage).toBeFalsy();
		expect(brandImage).toBeTruthy();
		expect(brandImage.nativeElement.getAttribute('src')).toBe(
			'test-brand-url'
		);
	});
});

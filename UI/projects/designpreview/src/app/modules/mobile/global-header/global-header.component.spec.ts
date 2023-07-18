import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromScenario from '../../ngrx-store/scenario/reducer';

import { GlobalHeaderComponent } from './global-header.component';
import { BrandService } from '../../core/services/brand.service';
import { MobileComponent } from '../mobile.component';
import { LandingComponent } from '../landing/landing.component';

describe('GlobalHeaderComponent', () => 
{
	let component: GlobalHeaderComponent;
	let fixture: ComponentFixture<GlobalHeaderComponent>;
	let brandService: jasmine.SpyObj<BrandService>;
	let mockStore: MockStore;
	let router: Router;
	let location: Location;

	const brandImage = 'assets/pulte/logos/Pulte_Homes_White_Logo.PNG';
	const initialState = {
		scenario: fromScenario.initialState
	};

	beforeEach(async () => 
	{
		brandService = jasmine.createSpyObj<BrandService>(['getBrandImage']);

		await TestBed.configureTestingModule({
			declarations: [ GlobalHeaderComponent ],
			imports: [
				RouterTestingModule.withRoutes([
					{
						path: 'mobile',
						component: MobileComponent,
						children: [
							{ path: 'home', component: LandingComponent },
							{ path: 'home/:salesAgreementId', component: LandingComponent },
							{ path: 'preview', component: LandingComponent },
							{ path: 'preview/:treeVersionId', component: LandingComponent },
							{ path: 'presale', component: LandingComponent },
							{ path: 'error', component: LandingComponent },
							{ path: '**', pathMatch: 'full', redirectTo: '' },
							{ path: '', component: LandingComponent }
						]
					},
				]),
				MatIconModule
			],
			providers: [
				{
					provide: BrandService,
					useValue: brandService
				},
				provideMockStore({ initialState })
			]
		})
			.compileComponents();

		router = TestBed.inject(Router);
		location = TestBed.inject(Location);
		mockStore = TestBed.inject(MockStore);
		fixture = TestBed.createComponent(GlobalHeaderComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('should navigate home on brand image click', () =>
	{
		const homeLogo = fixture.debugElement.nativeElement.querySelector('a');
		spyOn(component, 'homeLogoClicked');

		homeLogo.click();

		expect(component.homeLogoClicked).toHaveBeenCalled();
	});

	it('should return correct brand image when #getBrandImage is called', () => 
	{
		// Accounts for initial calls during component creation
		const initialCalls = brandService.getBrandImage.calls.count();
		brandService.getBrandImage.withArgs('white_logo').and.returnValue(brandImage);

		expect(component.getImageSrc())
			.withContext('#getImageSrc returns correct brandImage')
			.toBe(brandImage);

		expect(brandService.getBrandImage.calls.count() - initialCalls)
			.withContext('brandService.getBrandImage was called once')
			.toBe(1);

		expect(brandService.getBrandImage.calls.mostRecent().returnValue)
			.withContext('brandService.getBrandImage most recent return value is brandImage')
			.toBe(brandImage);
	});
});

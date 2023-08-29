import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { instance, mock } from 'ts-mockito';

import * as fromScenario from '../../ngrx-store/scenario/reducer';

import { GlobalHeaderComponent } from './global-header.component';
import { MobileComponent } from '../mobile.component';
import { LandingComponent } from '../landing/landing.component';
import { BrandService } from '../../core/services/brand.service';

describe('GlobalHeaderComponent', () => 
{
	let component: GlobalHeaderComponent;
	let fixture: ComponentFixture<GlobalHeaderComponent>;

	let instanceBrandService: BrandService;
	let mockStore: MockStore;
	let router: Router;
	let location: Location;

	const initialState = {
		scenario: fromScenario.initialState
	};
	const mockBrandService = mock(BrandService);

	beforeEach(async () => 
	{
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
					useFactory: () => instance(mockBrandService),
				},
				provideMockStore({ initialState })
			]
		}).compileComponents();

		instanceBrandService = TestBed.inject(BrandService);
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
		const navigateSpy = spyOn(router, 'navigateByUrl');
		const brandImageItem = fixture.debugElement.query(
			By.css('[data-testid="brandLogo-link"]')
		).nativeElement;

		brandImageItem.click();
		const url = navigateSpy.calls.first().args[0].toString();

		expect(url).toBe('/home');
	});

	it('should return correct brand image when #getBrandImage is called', () => 
	{
		spyOn(instanceBrandService, 'getBrandImage').and.returnValue(
			'assets/pulte/logos/Pulte_Homes_White_Logo.PNG'
		);

		const imageSrc = component.getImageSrc();

		expect(instanceBrandService.getBrandImage).toHaveBeenCalled();
		expect(instanceBrandService.getBrandImage).toHaveBeenCalledWith(
			'white_logo'
		);
		expect(imageSrc).toBe('assets/pulte/logos/Pulte_Homes_White_Logo.PNG');
	});
});

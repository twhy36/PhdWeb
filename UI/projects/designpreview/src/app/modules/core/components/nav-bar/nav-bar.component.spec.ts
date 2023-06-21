import { Location, CommonModule } from '@angular/common';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromChangeOrder from '../../../ngrx-store/change-order/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as fromOrg from '../../../ngrx-store/org/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { NavBarComponent } from './nav-bar.component';
import { DefaultErrorComponent } from '../default-error/default-error.component';
import { Brands, BrandService } from '../../services/brand.service';
import { FavoritesSummaryComponent } from '../../../favorites/components/favorites-summary/favorites-summary.component';
import { ContractedSummaryComponent } from '../../../favorites/components/contracted-summary/contracted-summary.component';
import { IncludedOptionsComponent } from '../../../favorites/components/included-options/included-options.component';
import { FloorPlanSummaryComponent } from '../../../favorites/components/floor-plan-summary/floor-plan-summary.component';
import { HomeComponent } from '../../../home/components/home/home.component';
import { BuildMode } from '../../../shared/models/build-mode.model';

describe('NavBarComponent', () =>
{
	let component: NavBarComponent;
	let fixture: ComponentFixture<NavBarComponent>;

	let router: Router;
	let location: Location;
	let mockStore: MockStore;
	let brandService: jasmine.SpyObj<BrandService>;

	const brandName = Brands.Pulte;
	const brandImage = 'assets/pulte/logos/Pulte_Homes_White_Logo.PNG';
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
		brandService = jasmine.createSpyObj<BrandService>(['getBrandImage', 'getBrandName']);
		
		TestBed.configureTestingModule({
			declarations: [NavBarComponent],
			imports: [
				RouterTestingModule.withRoutes([
					{ path: 'home', component: HomeComponent },
					{ path: 'favorites/summary', component: FavoritesSummaryComponent },
					{ path: 'floorplan', component: FloorPlanSummaryComponent },
					{ path: 'contracted', component: ContractedSummaryComponent },
					{ path: 'included', component: IncludedOptionsComponent },
					{ path: '', pathMatch: 'full', redirectTo: 'home' },
					{ path: '**', pathMatch: 'full', component: DefaultErrorComponent }
				]),
			],
			providers: [
				CommonModule,
				{
					provide: BrandService,
					useValue: brandService
				},
				provideMockStore({ initialState })
			]
		}).compileComponents();

		router = TestBed.inject(Router);
		location = TestBed.inject(Location);
		mockStore = TestBed.inject(MockStore);
		fixture = TestBed.createComponent(NavBarComponent);
		component = fixture.componentInstance;

		router.initialNavigation();
		router.navigateByUrl('/home');
		router.events.subscribe(evt => 
		{
			if (evt instanceof NavigationEnd)
			{
				component.currentRoute = evt.url.toLowerCase();
				component.isMenuCollapsed = true;
			}
		});

		advance();
	}));

	it('should create', () => 
	{
		expect(fixture).toBeDefined();
		expect(component).toBeDefined();
	});

	it('should be configured for buyer build mode', () => 
	{
		// Build Mode by Default is Buyer
		expect(component.currentRoute).toEqual('/home');
		expect(component.buildMode).toEqual('buyer');
		expect(component.isMenuCollapsed).toEqual(true);
		expect(component.showContractedOptionsLink).toEqual(true);
		expect(component.showMyFavoritesLink).toEqual(true);
		expect(component.showFloorplanLink).toEqual(true);
		expect(component.showIncludedOptionsLink).toEqual(false);
		expect(component.welcomeText).toEqual('Welcome To Your Home');

		// Goes to buyer home page
		const img = fixture.debugElement.nativeElement.querySelector('img');
		spyOn(component, 'onHomePage');

		img.click();

		expect(component.onHomePage).toHaveBeenCalled();
		expect(location.path()).toEqual('/home');
	});

	it('should be configured for preview build mode', fakeAsync(() =>
	{
		// Set build mode to preview
		mockStore.setState({
			...initialState,
			scenario: {
				buildMode: BuildMode.Preview,
			}
		});
		advance();

		expect(component.buildMode).toEqual(BuildMode.Preview);
		expect(component.isMenuCollapsed).toEqual(true);
		expect(component.showContractedOptionsLink).toEqual(false);
		expect(component.showMyFavoritesLink).toEqual(true);
		expect(component.showFloorplanLink).toEqual(true);
		expect(component.showIncludedOptionsLink).toEqual(false);
		expect(component.welcomeText).toEqual('Welcome To Your Home');
	}));

	it('should be configured for presale build mode configuration', fakeAsync(() =>
	{
		// Set build mode to presale
		mockStore.setState({
			...initialState,
			scenario: {
				buildMode: BuildMode.Presale,
			}
		});
		advance();

		// Build Mode by Default is Buyer
		expect(component.buildMode).toEqual(BuildMode.Presale);
		expect(component.isMenuCollapsed).toEqual(true);
		expect(component.showContractedOptionsLink).toEqual(false);
		expect(component.showMyFavoritesLink).toEqual(true);
		expect(component.showFloorplanLink).toEqual(false);
		expect(component.showIncludedOptionsLink).toEqual(true);
		expect(component.welcomeText).toEqual('Welcome To Your Future Home');;
	}));

	it('should navigate to favorites summary on myFavoritesLink clicked', fakeAsync(() =>
	{
		const link = fixture.debugElement.nativeElement.querySelector('#myFavoritesLink');
		link.click();
		advance();
		expect(location.path()).toEqual('/favorites/summary');
	}));

	it('should navigate to ifp page on floorplanLink clicked', fakeAsync(() =>
	{
		const link = fixture.debugElement.nativeElement.querySelector('#floorplanLink');
		link.click();
		advance();
		expect(location.path()).toEqual('/floorplan');
	}));

	it('should navigate to contracted options page on contractedOptionsLink clicked', fakeAsync(() =>
	{
		const link = fixture.debugElement.nativeElement.querySelector('#contractedOptionsLink');
		link.click();
		advance();
		expect(location.path()).toEqual('/contracted');
	}));

	it('should navigate to included options page on includedOptions clicked', fakeAsync(() =>
	{
		// Set showIncludedOptionsLink to true and find the link
		fixture.componentInstance.showIncludedOptionsLink = true;
		advance();

		const link = fixture.debugElement.nativeElement.querySelector('#includedOptionsLink');
		link.click();
		advance();

		// Click the link and expect the route to include '/included'
		expect(location.path()).toEqual('/included');
	}));

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

	it('should return correct css class when #getBrandedTitle is called', () => 
	{
		// Accounts for initial calls during component creation
		const initialCalls = brandService.getBrandName.calls.count();
		brandService.getBrandName.and.returnValue(brandName);
	
		expect(component.getBrandedTitle())
			.withContext('#getBrandedTitle returns correct css class')
			.toBe('phd-nav-bar-' + brandName);
		
		expect(brandService.getBrandName.calls.count() - initialCalls)
			.withContext('brandService.getBrandName was called once')
			.toBe(1);

		expect(brandService.getBrandName.calls.mostRecent().returnValue)
			.withContext('brandService.getBrandName most recent return value is brandName')
			.toBe(brandName);
	});

	it('should dispatch action to store on #onViewFavoritesCalled', () => 
	{
		const onStoreSpy = spyOn(mockStore, 'dispatch');
		component.onViewFavorites();
		expect(onStoreSpy)
			.withContext('#onViewFavorites should clear the tree filter')
			.toHaveBeenCalledWith(new ScenarioActions.SetTreeFilter(null));
	});

	it ('should return correct branded menu class', () => 
	{
		const initialCalls = brandService.getBrandName.calls.count();
		expect(component.getBrandedMenuClass(false))
			.withContext('menu not collapsed')
			.toBe('phd-menu-options');

		expect(component.getBrandedMenuClass(true))
			.withContext('menu not collapsed')
			.toBe('phd-hamburger-menu');

		// Tests for John Wieland Specifically
		brandService.getBrandName.and.returnValue(Brands.JohnWieland);

		expect(component.getBrandedMenuClass(false))
			.withContext('menu not collapsed')
			.toBe('phd-menu-options-jw');

		expect(component.getBrandedMenuClass(true))
			.withContext('menu not collapsed')
			.toBe('phd-hamburger-menu-jw');

		expect(brandService.getBrandName.calls.count() - initialCalls)
			.withContext('brandService.getBrandName was called once per call to #getBrandedMenuClass')
			.toBe(4);
	});

	function advance(): void 
	{
		tick();
		fixture.detectChanges();
	}
});

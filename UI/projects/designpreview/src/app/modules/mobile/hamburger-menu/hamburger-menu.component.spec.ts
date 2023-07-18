import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromApp from '../../ngrx-store/app/reducer';
import * as fromChangeOrder from '../../ngrx-store/change-order/reducer';
import * as fromJob from '../../ngrx-store/job/reducer';
import * as fromOrg from '../../ngrx-store/org/reducer';
import * as fromPlan from '../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../ngrx-store/scenario/reducer';

import { HamburgerMenuComponent } from './hamburger-menu.component';
import { BuildMode } from '../../shared/models/build-mode.model';
import { BrandService } from '../../core/services/brand.service';
import { DialogService } from '../../core/services/dialog.service';

describe('HamburgerMenuComponent', () => 
{
	let component: HamburgerMenuComponent;
	let fixture: ComponentFixture<HamburgerMenuComponent>;
	let mockStore: MockStore;
	let brandService: jasmine.SpyObj<BrandService>;
	let dialogService: jasmine.SpyObj<DialogService>;

	const initialState = {
		app: fromApp.initialState,
		salesAgreement: fromSalesAgreement.initialState,
		plan: fromPlan.initialState,
		org: fromOrg.initialState,
		job: fromJob.initialState,
		changeOrder: fromChangeOrder.initialState,
		scenario: fromScenario.initialState
	};

	beforeEach(async () => 
	{
		brandService = jasmine.createSpyObj<BrandService>(['getBrandPrivacyPolicyUrl', 'getBrandTermsOfUseUrl']);
		dialogService = jasmine.createSpyObj<DialogService>(['open']);

		await TestBed.configureTestingModule({
			declarations: [ HamburgerMenuComponent ],
			imports: [
				BrowserAnimationsModule,
				MatExpansionModule,
				MatIconModule,
				MatSidenavModule
			],
			providers: [
				{
					provide: BrandService,
					useValue: brandService
				},
				{
					provide: DialogService,
					useValue: dialogService
				},
				provideMockStore({ initialState })
			]
		})
			.compileComponents();

		mockStore = TestBed.inject(MockStore);
		fixture = TestBed.createComponent(HamburgerMenuComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('should be configured for buyer build mode', () => 
	{
		// Build Mode by Default is Buyer
		expect(component.showPendingAndContractedOptionsLink).toEqual(true);
		expect(component.showFloorplanLink).toEqual(true);
		expect(component.showIncludedOptionsLink).toEqual(true);
	});

	it('should be configured for preview build mode', fakeAsync(() =>
	{
		// Set Build Mode to preview
		mockStore.setState({
			...initialState,
			scenario: {
				buildMode: BuildMode.Preview,
			}
		});

		expect(component.showPendingAndContractedOptionsLink).toEqual(false);
		expect(component.showFloorplanLink).toEqual(true);
		expect(component.showIncludedOptionsLink).toEqual(true);
	}));

	it('should be configured for presale build mode configuration', fakeAsync(() =>
	{
		// Set Build Mode to presale
		mockStore.setState({
			...initialState,
			scenario: {
				buildMode: BuildMode.Presale,
			}
		});

		// Build Mode by Default is Buyer
		expect(component.showPendingAndContractedOptionsLink).toEqual(false);
		expect(component.showFloorplanLink).toEqual(false);
		expect(component.showIncludedOptionsLink).toEqual(true);
	}));
});

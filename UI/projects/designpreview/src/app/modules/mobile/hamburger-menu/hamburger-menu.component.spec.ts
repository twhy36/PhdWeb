import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSidenavModule } from '@angular/material/sidenav';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MemoizedSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { TreeVersion } from 'phd-common';
import { instance, mock } from 'ts-mockito';

import * as fromRoot from '../../ngrx-store/reducers';
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
import { Constants } from '../../shared/classes/constants.class';
import { choiceToChoiceMustHaveRulePoint, testTreeVersion } from '../../shared/classes/mockdata.class';

describe('HamburgerMenuComponent', () => 
{
	let component: HamburgerMenuComponent;
	let fixture: ComponentFixture<HamburgerMenuComponent>;

	let instanceBrandService: BrandService;
	let instanceDialogService: DialogService;
	let mockStore: MockStore;
	let router: Router;
	let includedTreeSelector: MemoizedSelector<fromRoot.State, TreeVersion>;

	const mockBrandService = mock(BrandService);
	const mockDialogService = mock(DialogService);
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
		await TestBed.configureTestingModule({
			declarations: [ HamburgerMenuComponent ],
			imports: [
				RouterTestingModule.withRoutes([]),
				BrowserAnimationsModule,
				MatExpansionModule,
				MatIconModule,
				MatSidenavModule
			],
			providers: [
				{
					provide: BrandService,
					useFactory: () => instance(mockBrandService),
				},
				{
					provide: DialogService,
					useFactory: () => instance(mockDialogService),
				},
				provideMockStore({ initialState })
			]
		}).compileComponents();

		instanceBrandService = TestBed.inject(BrandService);
		instanceDialogService = TestBed.inject(DialogService);
		mockStore = TestBed.inject(MockStore);
		router = TestBed.inject(Router);

		includedTreeSelector = mockStore.overrideSelector(
			fromRoot.includedTree,
			testTreeVersion
		);

		fixture = TestBed.createComponent(HamburgerMenuComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('sets the policy and terms urls', () => 
	{
		spyOn(instanceBrandService, 'getBrandPrivacyPolicyUrl').and.returnValue(
			'test/privacy-policy/'
		);
		spyOn(instanceBrandService, 'getBrandTermsOfUseUrl').and.returnValue(
			'test/terms-of-use/'
		);
		component.ngOnInit();
		expect(component.policyUrl).toBe('test/privacy-policy/');
		expect(component.termsUrl).toBe('test/terms-of-use/');
	});

	it('calls the dialogService to open the disclaimer modal', () => 
	{
		const dialogSpy = spyOn(instanceDialogService, 'open');
		const disclaimerLink = fixture.debugElement.query(
			By.css('[data-testid="disclaimer-link"]')
		).nativeElement;
		disclaimerLink.click();
		fixture.detectChanges();
		expect(dialogSpy).toHaveBeenCalledWith({
			confirmText: Constants.DIALOG_DISCLAIMER_CONFIRM,
			displayClose: true,
			message: Constants.DIALOG_DISCLAIMER_MESSAGE,
			title: Constants.DIALOG_DISCLAIMER_TITLE,
		});
	});

	describe('shows or hides floorplan and contracted options based on the build mode', () => 
	{
		it('shows only floorplan in preview', () => 
		{
			mockStore.setState({
				...initialState,
				scenario: { buildMode: BuildMode.Preview },
			});
			fixture.detectChanges();

			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const floorplanLink = fixture.debugElement.query(
				By.css('[data-testid="floorplan-link"]')
			);
			const contractedOptionsLink = fixture.debugElement.query(
				By.css('[data-testid="contractedOptions-link"]')
			);
			expect(floorplanLink).toBeTruthy();
			expect(contractedOptionsLink).toBeNull();
		});

		it('shows neither floorplan nor contracted options in presale', () => 
		{
			mockStore.setState({
				...initialState,
				scenario: { buildMode: BuildMode.Presale },
			});
			fixture.detectChanges();

			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const floorplanLink = fixture.debugElement.query(
				By.css('[data-testid="floorplan-link"]')
			);
			const contractedOptionsLink = fixture.debugElement.query(
				By.css('[data-testid="contractedOptions-link"]')
			);
			expect(floorplanLink).toBeNull();
			expect(contractedOptionsLink).toBeNull();
		});

		it('shows floorplan and contracted options if not preview or presale', () => 
		{
			mockStore.setState({
				...initialState,
				scenario: { buildMode: BuildMode.Buyer },
			});
			fixture.detectChanges();

			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const floorplanLink = fixture.debugElement.query(
				By.css('[data-testid="floorplan-link"]')
			);
			const contractedOptionsLink = fixture.debugElement.query(
				By.css('[data-testid="contractedOptions-link"]')
			);
			expect(floorplanLink).toBeTruthy();
			expect(contractedOptionsLink).toBeTruthy();
		});
	});

	describe('shows or hides included options link', () => 
	{
		it('shows included options when design is not complete', () => 
		{
			// Default is design not complete and decision point not past cutoff, set decision point past cutoff so we can test only the design complete condition
			includedTreeSelector.setResult({
				...testTreeVersion,
				groups: testTreeVersion.groups.map((group) => 
				{
					if (group.id === 1) 
					{
						group.subGroups[0].points = [
							{
								...choiceToChoiceMustHaveRulePoint,
								isPastCutOff: true,
							},
						];
					}
					return group;
				}),
			});
			mockStore.refreshState();
			fixture.detectChanges();

			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const includedOptionsLink = fixture.debugElement.query(
				By.css('[data-testid="includedOptions-link"]')
			);
			expect(includedOptionsLink).toBeTruthy();
		});

		it('shows included options when design is not complete and there is a decision point not past cutoff', () => 
		{
			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const includedOptionsLink = fixture.debugElement.query(
				By.css('[data-testid="includedOptions-link"]')
			);
			expect(includedOptionsLink).toBeTruthy();
		});

		it('does not show included options link if design is complete', () => 
		{
			mockStore.setState({
				...initialState,
				salesAgreement: { isDesignComplete: true },
			});
			fixture.detectChanges();

			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const includedOptionsLink = fixture.debugElement.query(
				By.css('[data-testid="includedOptions-link"]')
			);
			expect(includedOptionsLink).toBeNull();
		});
	});
});

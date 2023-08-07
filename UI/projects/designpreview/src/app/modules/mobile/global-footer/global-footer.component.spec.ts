import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MemoizedSelector } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { instance, mock } from 'ts-mockito';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as NavActions from '../../ngrx-store/nav/actions';

import { BrandService } from '../../core/services/brand.service';
import { BuildMode } from '../../shared/models/build-mode.model';
import { Constants } from '../../shared/classes/constants.class';
import { DialogService } from '../../core/services/dialog.service';
import { GlobalFooterComponent } from './global-footer.component';
import { TreeVersion } from 'phd-common';
import {
	choiceToChoiceMustHaveRulePoint,
	testMyFavorite,
	testTreeVersion,
} from '../../shared/classes/mockdata.class';

describe('GlobalFooterComponent', () => 
{
	let component: GlobalFooterComponent;
	let fixture: ComponentFixture<GlobalFooterComponent>;

	let mockStore: MockStore;
	const initialState = {
		salesAgreement: fromSalesAgreement.initialState,
		scenario: fromScenario.initialState,
	};

	const mockBrandService = mock(BrandService);
	const mockDialogService = mock(DialogService);
	let instanceBrandService: BrandService;
	let instanceDialogService: DialogService;
	let router: Router;
	let includedTreeSelector: MemoizedSelector<fromRoot.State, TreeVersion>;

	beforeEach(() => 
	{
		TestBed.configureTestingModule({
			declarations: [GlobalFooterComponent],
			imports: [
				RouterTestingModule.withRoutes([]),
				MatExpansionModule,
				BrowserAnimationsModule,
				MatIconModule,
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
				provideMockStore({ initialState }),
			],
		}).compileComponents();

		instanceBrandService = TestBed.inject(BrandService);
		instanceDialogService = TestBed.inject(DialogService);
		mockStore = TestBed.inject(MockStore);
		router = TestBed.inject(Router);

		mockStore.overrideSelector(fromRoot.filteredTree, testTreeVersion);
		mockStore.overrideSelector(
			fromFavorite.currentMyFavorite,
			testMyFavorite
		);
		includedTreeSelector = mockStore.overrideSelector(
			fromRoot.includedTree,
			testTreeVersion
		);
	});

	beforeEach(() => 
	{
		fixture = TestBed.createComponent(GlobalFooterComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	afterEach(() => 
	{
		mockStore.resetSelectors();
	});

	it('calls the brand service to get brand image', () => 
	{
		spyOn(instanceBrandService, 'getBrandImage').and.returnValue(
			'testImageSrc'
		);
		const imageSrc = component.getImageSrc();
		expect(instanceBrandService.getBrandImage).toHaveBeenCalled();
		expect(instanceBrandService.getBrandImage).toHaveBeenCalledWith(
			'white_logo'
		);
		expect(imageSrc).toBe('testImageSrc');
	});

	describe('navigation', () => 
	{
		it('navigates to selected group', () => 
		{
			const storeSpy = spyOn(mockStore, 'dispatch').and.callThrough();
			const navigateSpy = spyOn(router, 'navigate');

			const viewOptionsMenuItem = fixture.debugElement.query(
				By.css('[data-testid="viewOptions-button"]')
			).nativeElement;
			const firstGroupLink = fixture.debugElement.query(
				By.css('[data-testid="Exterior-link"] a')
			).nativeElement;
			viewOptionsMenuItem.click();
			firstGroupLink.click();

			expect(navigateSpy).toHaveBeenCalledWith(
				['favorites', 'my-favorites', testMyFavorite.id, testTreeVersion.groups[0].subGroups[0].subGroupCatalogId],
				{ queryParamsHandling: 'merge' }
			);
			expect(storeSpy).toHaveBeenCalledWith(
				new NavActions.SetSelectedSubgroup(testTreeVersion.groups[0].subGroups[0].subGroupCatalogId, testTreeVersion.groups[0].subGroups[0].points[0].id, null)
			);
		});

		it('navigates to my favorites', () => 
		{
			const navigateSpy = spyOn(router, 'navigateByUrl');

			const myFavoritesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="myFavorites-link"] a')
			).nativeElement;
			myFavoritesMenuItem.click();
			const url = navigateSpy.calls.first().args[0].toString();
			expect(url).toBe('/favorites/summary');
		});

		it('navigates to floorplan', () => 
		{
			const navigateSpy = spyOn(router, 'navigateByUrl');

			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const floorplanLink = fixture.debugElement.query(
				By.css('[data-testid="floorplan-link"]')
			).nativeElement;
			floorplanLink.click();
			const url = navigateSpy.calls.first().args[0].toString();
			expect(url).toBe('/floorplan');
		});

		it('navigates to included options', () => 
		{
			const navigateSpy = spyOn(router, 'navigateByUrl');

			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const floorplanLink = fixture.debugElement.query(
				By.css('[data-testid="includedOptions-link"]')
			).nativeElement;
			floorplanLink.click();
			const url = navigateSpy.calls.first().args[0].toString();
			expect(url).toBe('/included');
		});

		it('navigates to contracted options', () => 
		{
			const navigateSpy = spyOn(router, 'navigateByUrl');

			const resourcesMenuItem = fixture.debugElement.query(
				By.css('[data-testid="resources-button"]')
			).nativeElement;
			resourcesMenuItem.click();
			const floorplanLink = fixture.debugElement.query(
				By.css('[data-testid="contractedOptions-link"]')
			).nativeElement;
			floorplanLink.click();
			const url = navigateSpy.calls.first().args[0].toString();
			expect(url).toBe('/contracted');
		});
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

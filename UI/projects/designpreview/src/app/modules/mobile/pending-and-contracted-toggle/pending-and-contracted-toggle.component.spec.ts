import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as FavoriteActions from '../../ngrx-store/favorite/actions';

import { PendingAndContractedToggleComponent } from './pending-and-contracted-toggle.component';
import { BuildMode } from '../../shared/models/build-mode.model';
import { findElementByTestId } from '../../shared/classes/test-utils.class';
import { testMyFavoriteStateWithSalesChoices } from '../../shared/classes/mockdata.class';

describe('PendingAndContractedToggleComponent', () => 
{
	let component: PendingAndContractedToggleComponent;
	let fixture: ComponentFixture<PendingAndContractedToggleComponent>;

	let mockStore: MockStore;

	const initialState = {
		favorite: fromFavorite.initialState,
		salesAgreement: {
			...fromSalesAgreement.initialState,
			isDesignComplete: false,
		},
		scenario: {
			...fromScenario.initialState,
			buildMode: BuildMode.Buyer,
		}
	}

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [ PendingAndContractedToggleComponent ],
			imports: [
				FormsModule,
				MatCheckboxModule,
				MatIconModule
			],
			providers: [ provideMockStore({ initialState }) ]
		}).compileComponents();

		mockStore = TestBed.inject(MockStore);
		mockStore.overrideSelector(fromFavorite.favoriteState, testMyFavoriteStateWithSalesChoices);

		fixture = TestBed.createComponent(PendingAndContractedToggleComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('isContractedOptionsDisabled returns correct value', () =>
	{
		it('build mode is buyer', () =>
		{
			expect(component.isContractedOptionsDisabled).toBeFalse();
		});
		
		it('build mode is preview', () =>
		{
			component.buildMode = BuildMode.Preview;
			fixture.detectChanges();

			expect(component.isContractedOptionsDisabled).toBeTrue();
		});

		it('design is complete', () =>
		{
			component.isDesignComplete = true;
			fixture.detectChanges();

			expect(component.isContractedOptionsDisabled).toBeTrue();
		});
	});
	
	it('dispatches action to toggle pending and contracted options', () =>
	{
		const dispatchSpy = spyOn(mockStore, 'dispatch');

		expect(component.includeContractedOptions).toBeFalse();

		const checkboxInput = findElementByTestId(fixture, 'checkbox').children[0].children[0].children[1];
		checkboxInput.nativeElement.click();

		expect(component.includeContractedOptions).toBeTrue();
		expect(dispatchSpy).toHaveBeenCalledWith(new FavoriteActions.ToggleContractedOptions());
	});
});

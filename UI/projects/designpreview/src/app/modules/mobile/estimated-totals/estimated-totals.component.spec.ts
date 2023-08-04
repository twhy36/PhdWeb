import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromRoot from '../../ngrx-store/reducers';

import { EstimatedTotalsComponent } from './estimated-totals.component';
import { findElementByTestId } from '../../shared/classes/test-utils.class';
import { mockPriceBreakdown } from '../../shared/classes/mockdata.class';

describe('EstimatedTotalsComponent', () => 
{
	let component: EstimatedTotalsComponent;
	let fixture: ComponentFixture<EstimatedTotalsComponent>;
	let mockStore: MockStore;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [EstimatedTotalsComponent],
			imports: [MatIconModule],
			providers: [provideMockStore()],
		}).compileComponents();
		mockStore = TestBed.inject(MockStore);
		mockStore.overrideSelector(fromRoot.priceBreakdown, mockPriceBreakdown);

		fixture = TestBed.createComponent(EstimatedTotalsComponent);
		component = fixture.componentInstance;
		component.isPresale = true;
		component.isPresalePricingEnabled = true;
		component.isDesignComplete = false;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('Estimated Favorites Total', () =>
	{
		it('displays estimated favorites total when not design complete', () => 
		{
			// initial state isDesignComplete = false
			const estimatedFavoritesLabel = findElementByTestId(
				fixture,
				'estimated-favorites-label'
			);
			expect(estimatedFavoritesLabel).toBeTruthy();
			const estimatedFavoritesPrice = findElementByTestId(
				fixture,
				'favorites-price'
			);
			expect(estimatedFavoritesPrice.nativeElement.innerText).toBe('$800');
		});

		it('does not display estimated favorites total if design complete', () => 
		{
			component.isDesignComplete = true;
			fixture.detectChanges();

			const estimatedFavoritesLabel = findElementByTestId(
				fixture,
				'estimated-favorites-label'
			);
			expect(estimatedFavoritesLabel).toBeFalsy();
			const estimatedFavoritesPrice = findElementByTestId(
				fixture,
				'favorites-price'
			);
			expect(estimatedFavoritesPrice).toBeFalsy;
		});
	});

	describe('Total price', () =>
	{
		it('shows "Estimated Total Price" if presale and presale pricing enabled', () =>
		{
			// initial state presale=true, presalePricing=true
			const totalPriceLabel = findElementByTestId(
				fixture,
				'total-price-label'
			);
			expect(totalPriceLabel.nativeElement.innerText).toBe('Estimated Total Price:');
			const totalPrice = findElementByTestId(fixture, 'total-price');
			expect(totalPrice.nativeElement.innerText).toBe('$650,000');
		});

		it('shows "Total Purchase Price" if not presale and design complete', () =>
		{
			component.isPresale = false;
			component.isDesignComplete = true;
			fixture.detectChanges();

			const totalPriceLabel = findElementByTestId(
				fixture,
				'total-price-label'
			);
			expect(totalPriceLabel.nativeElement.innerText).toBe(
				'Total Purchase Price:'
			);
			expect(totalPriceLabel.nativeElement.innerText).toBe('Total Purchase Price:');
			const totalPrice = findElementByTestId(fixture, 'total-price');
			expect(totalPrice.nativeElement.innerText).toBe('$650,000');
		});

		it('shows "Estimated Total Purchase Price" if not presale and not design complete', () =>
		{
			component.isPresale = false;
			component.isDesignComplete = false;
			fixture.detectChanges();

			const totalPriceLabel = findElementByTestId(
				fixture,
				'total-price-label'
			);
			expect(totalPriceLabel.nativeElement.innerText).toBe(
				'Estimated Total Purchase Price:'
			);
			expect(totalPriceLabel.nativeElement.innerText).toBe('Estimated Total Purchase Price:');
			const totalPrice = findElementByTestId(fixture, 'total-price');
			expect(totalPrice.nativeElement.innerText).toBe('$650,000');
		});
	});
});

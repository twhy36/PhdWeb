import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { first } from 'rxjs/operators';
import { instance, mock } from 'ts-mockito';
import { QuantityInputComponent } from './quantity-input.component';

describe('QuantityInputComponent', () =>
{
	let component: QuantityInputComponent;
	let fixture: ComponentFixture<QuantityInputComponent>;
	const mockChangeDetectorRef = mock(ChangeDetectorRef);

	beforeEach(() =>
	{
		TestBed.configureTestingModule({
			declarations: [QuantityInputComponent],
			providers: [
				{ provide: ChangeDetectorRef, useFactory: () => instance(mockChangeDetectorRef) },
			],
		}).compileComponents();
	});

	beforeEach(() =>
	{
		fixture = TestBed.createComponent(QuantityInputComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();

		component.min = 0;
		component.max = 10;
		component.canEdit = true;
		component.isBlocked = false;
		component.currentQty = 3;
		fixture.detectChanges();
	});

	it('sets current quantity to the input value when its within range', () =>
	{
		component.enforceMinMax(7);
		expect(component.currentQty).toBe(7);
	});

	it('emits the quantity changed event with current quantity when the input is within range', () =>
	{
		component.quantityChange
			.pipe(first())
			.subscribe((value: number) => expect(value).toBe(7));
		component.enforceMinMax(7);
	});

	it('sets the current quantity to the previous value when its outside the range', () =>
	{
		component.enforceMinMax(12);
		expect(component.currentQty).toBe(3);
	});

	it('emits the quantity changed event with null when the input is outside the range', () =>
	{
		component.quantityChange
			.pipe(first())
			.subscribe((value: number) => expect(value).toBe(null));
		component.enforceMinMax(12);
	});
});

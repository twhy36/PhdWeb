import { ComponentFixture, TestBed } from '@angular/core/testing';

import { findElementByTestId } from '../../../shared/classes/test-utils.class';
import { SummaryAttributeLocationRowComponent } from './summary-attribute-location-row.component';

describe('SummaryAttributeLocationRowComponent', () => 
{
	let component: SummaryAttributeLocationRowComponent;
	let fixture: ComponentFixture<SummaryAttributeLocationRowComponent>;

	const testLocation = {
		locationGroupId: 2414,
		locationGroupLabel: 'Location',
		locationId: 11572,
		locationName: 'Bath 2',
		locationQuantity: 20,
		attributes: [
			{
				locationGroupId: 2414,
				locationGroupLabel: 'Location',
				locationId: 11572,
				locationName: 'Bath 2',
				locationQuantity: 1,
			},
		],
	};

	const testAttribute = {
		attributeId: 1,
		attributeGroupId: 1,
		scenarioChoiceLocationId: 1,
		attributeGroupLabel: 'Drawer Hardware Style',
		attributeName: 'Ringed Arch Knob - 3673',
		attributes: [
			{
				attributeId: 2,
				attributeGroupId: 2,
				scenarioChoiceLocationId: 2,
				attributeGroupLabel: 'Drawer Hardware Style',
				attributeName: 'Ringed Arch Knob - 3673',
			},
			{
				attributeId: 3,
				attributeGroupId: 3,
				scenarioChoiceLocationId: 3,
				attributeGroupLabel: 'Drawer Hardware Style',
				attributeName: 'Ringed Arch Pull - 3672',
			},
		],
	};

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [SummaryAttributeLocationRowComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(SummaryAttributeLocationRowComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('shows location information', () => 
	{
		component.mappedSelectedAttributes = [testLocation];
		fixture.detectChanges();
		const locationName = findElementByTestId(fixture, 'location-name');
		const locationQuantity = findElementByTestId(
			fixture,
			'location-quantity'
		);
		expect(locationName.nativeElement.innerText).toBe('Location: Bath 2');
		expect(locationQuantity.nativeElement.innerText).toBe('Quantity: 20');
	});

	it('shows attribute information', () => 
	{
		component.mappedSelectedAttributes = [testAttribute];
		fixture.detectChanges();
		const attributeInfo = findElementByTestId(fixture, 'attribute-info');
		expect(attributeInfo.nativeElement.innerText).toBe(
			'Drawer Hardware Style: Ringed Arch Knob - 3673, Ringed Arch Pull - 3672'
		);
	});

	it('shows no attribute or location information if there are no mapped selected attributes', () => 
	{
		component.mappedSelectedAttributes = [];
		fixture.detectChanges();
		const locationName = findElementByTestId(fixture, 'location-name');
		const locationQuantity = findElementByTestId(
			fixture,
			'location-quantity'
		);
		const attributeInfo = findElementByTestId(fixture, 'attribute-info');
		expect(locationName).toBeFalsy();
		expect(locationQuantity).toBeFalsy();
		expect(attributeInfo).toBeFalsy();
	});
});

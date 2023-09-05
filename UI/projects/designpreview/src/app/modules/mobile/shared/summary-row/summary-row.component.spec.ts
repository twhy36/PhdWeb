import { Component, Input } from '@angular/core';
import
{
	ComponentFixture,
	TestBed,
	fakeAsync,
	tick,
} from '@angular/core/testing';
import { Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { BuildMode } from '../../../shared/models/build-mode.model';
import { choiceToChoiceMustNotHaveRulePoint, mockDesignToolAttribute, mockGroup1 } from '../../../shared/classes/mockdata.class';
import { findElementByTestId, findAllElementsByTestId } from '../../../shared/classes/test-utils.class';
import { SummaryRowComponent } from './summary-row.component';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { OptionsComponent } from '../../options/options.component';

@Component({ selector: 'summary-attribute-location-row', template: '' })
class SummaryAttributeLocationRowStubComponent
{
	@Input() mappedSelectedAttributes = [];
}

describe('SummaryRowComponent', () =>
{
	let component: SummaryRowComponent;
	let fixture: ComponentFixture<SummaryRowComponent>;

	let location: Location;
	let router: Router;

	let mockStore: MockStore;
	const initialState = {
		scenario: { buildMode: BuildMode.Presale },
	};

	beforeEach(async () =>
	{
		await TestBed.configureTestingModule({
			declarations: [
				SummaryRowComponent,
				SummaryAttributeLocationRowStubComponent,
			],
			imports: [
				RouterTestingModule.withRoutes([
					{
						path: 'favorites/summary',
						component: SummaryRowComponent,
					},
					{
						path: 'options/:subGroupId/:dpId',
						component: OptionsComponent,
					},
					{
						path: 'options/:subGroupId/:dpId/:choiceId',
						component: OptionsComponent,
					},
				]),
				MatIconModule,
			],
			providers: [provideMockStore({ initialState })],
		}).compileComponents();

		location = TestBed.inject(Location);
		router = TestBed.inject(Router);

		mockStore = TestBed.inject(MockStore);

		fixture = TestBed.createComponent(SummaryRowComponent);
		component = fixture.componentInstance;
		component.subGroup = mockGroup1.subGroups[0];
		component.decisionPoint = choiceToChoiceMustNotHaveRulePoint;
	});

	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});

	it('should display the dp label', () =>
	{
		fixture.detectChanges();
		const decisionPointLabel = findElementByTestId(fixture, 'dp-label');
		expect(decisionPointLabel.nativeElement.innerText).toBe(
			'Interior Features 1'
		);
	});

	it('shows labels of all choices of the decision point with quantity > 0', () =>
	{
		fixture.detectChanges();
		const choiceLabels = findAllElementsByTestId(fixture, 'choice-label');
		expect(choiceLabels.length).toBe(1);
		expect(choiceLabels[0].nativeElement.innerText).toBe(
			'Included Kitchen Island'
		);
	});

	it('shows plus button if choice has mapped attributes, is complete, and has selected attributes. and clicking it toggles display of attribute location details', fakeAsync(() =>
	{
		component.decisionPoint = {
			...choiceToChoiceMustNotHaveRulePoint,
			choices: [
				{
					...choiceToChoiceMustNotHaveRulePoint.choices[0],
					mappedAttributeGroups: [
						{
							id: 17941,
						},
					],
					selectedAttributes: [mockDesignToolAttribute],
				},
			],
		};
		spyOn(component, 'isChoiceComplete').and.returnValue(true);
		spyOn(component, 'toggleCollapsedAttribute').and.callThrough();
		fixture.detectChanges();
		const showAttributesIcon = findElementByTestId(
			fixture,
			'show-attributes-btn'
		);
		expect(showAttributesIcon).toBeTruthy();
		expect(component.choicesCustom[0].showAttributes).toBe(true);
		expect(
			findElementByTestId(fixture, 'attribute-location-details')
		).toBeFalsy(); //when choice has attributes and is complete, attribute location details is hidden
		showAttributesIcon.nativeElement.click();
		tick();
		fixture.detectChanges();
		expect(component.toggleCollapsedAttribute).toHaveBeenCalled();
		expect(component.choicesCustom[0].showAttributes).toBe(false);
		expect(
			findElementByTestId(fixture, 'attribute-location-details')
		).toBeTruthy();
	}));

	it('shows attribute location details when choice is not complete', () =>
	{
		component.decisionPoint = {
			...choiceToChoiceMustNotHaveRulePoint,
			choices: [
				{
					...choiceToChoiceMustNotHaveRulePoint.choices[0],
					mappedAttributeGroups: [
						{
							id: 17941,
						},
					],
					selectedAttributes: [mockDesignToolAttribute],
				},
			],
		};
		spyOn(component, 'isChoiceComplete').and.returnValue(false);
		fixture.detectChanges();
		expect(
			findElementByTestId(fixture, 'attribute-location-details')
		).toBeTruthy();
	});

	it('hides attribute location details when choice is complete', () =>
	{
		component.decisionPoint = {
			...choiceToChoiceMustNotHaveRulePoint,
			choices: [
				{
					...choiceToChoiceMustNotHaveRulePoint.choices[0],
					mappedAttributeGroups: [
						{
							id: 17941,
						},
					],
					selectedAttributes: [mockDesignToolAttribute],
				},
			],
		};
		spyOn(component, 'isChoiceComplete').and.returnValue(true);
		fixture.detectChanges();
		expect(
			findElementByTestId(fixture, 'attribute-location-details')
		).toBeFalsy();
	});

	it('shows "Additional Selections Required" warning when choice has mapped attributes and is not complete', () =>
	{
		component.decisionPoint = {
			...choiceToChoiceMustNotHaveRulePoint,
			choices: [
				{
					...choiceToChoiceMustNotHaveRulePoint.choices[0],
					mappedAttributeGroups: [
						{
							id: 17941,
						},
					],
					selectedAttributes: [],
				},
			],
		};
		spyOn(component, 'isChoiceComplete').and.returnValue(false);
		fixture.detectChanges();
		expect(
			findElementByTestId(fixture, 'additional-selections-warning')
		).toBeTruthy();
	});

	it('shows "Additional Selections Required" warning when choice has mapped attributes and does not have selected attributes', () =>
	{
		component.decisionPoint = {
			...choiceToChoiceMustNotHaveRulePoint,
			choices: [
				{
					...choiceToChoiceMustNotHaveRulePoint.choices[0],
					mappedAttributeGroups: [
						{
							id: 17941,
						},
					],
					selectedAttributes: [],
				},
			],
		};
		spyOn(component, 'isChoiceComplete').and.returnValue(true);
		fixture.detectChanges();
		expect(
			findElementByTestId(fixture, 'additional-selections-warning')
		).toBeTruthy();
	});

	it('shows choice quantity', () =>
	{
		component.decisionPoint = {
			...choiceToChoiceMustNotHaveRulePoint,
			choices: [
				{
					...choiceToChoiceMustNotHaveRulePoint.choices[0],
					quantity: 10,
				},
			],
		};
		fixture.detectChanges();
		const quantity = findElementByTestId(fixture, 'quantity');
		expect(quantity.nativeElement.innerText).toBe('Quantity: (10)');
	});

	it('shows delete and edit icons when not read only', () =>
	{
		component.isReadOnly = false;
		fixture.detectChanges();
		const deleteIcon = findElementByTestId(fixture, 'delete-icon');
		const editIcon = findElementByTestId(fixture, 'edit-icon');
		const viewLink = findElementByTestId(fixture, 'view-link');
		expect(deleteIcon).toBeTruthy();
		expect(editIcon).toBeTruthy();
		expect(viewLink).toBeFalsy();
	});

	it('shows view link when read only', () =>
	{
		mockStore.setState({
			scenario: { buildMode: BuildMode.BuyerPreview },
		}); //read only when buyer preview
		fixture.detectChanges();
		const deleteIcon = findElementByTestId(fixture, 'delete-icon');
		const editIcon = findElementByTestId(fixture, 'edit-icon');
		const viewLink = findElementByTestId(fixture, 'view-link');
		expect(deleteIcon).toBeFalsy();
		expect(editIcon).toBeFalsy();
		expect(viewLink).toBeTruthy();
	});

	it('navigates to the options for the decision point when view link is clicked', fakeAsync(() =>
	{
		router.navigateByUrl('favorites/summary');
		mockStore.setState({
			scenario: { buildMode: BuildMode.BuyerPreview },
		}); //read only when buyer preview
		fixture.detectChanges();
		const viewLink = findElementByTestId(fixture, 'view-link');
		viewLink.nativeElement.click();
		tick();
		expect(location.path()).toBe(
			`/options/${mockGroup1.subGroups[0].id}/${choiceToChoiceMustNotHaveRulePoint.id}`
		);
	}));

	it('navigates to the choice card detail for the choice when Additional Selections Required is clicked', fakeAsync(() =>
	{
		router.navigateByUrl('favorites/summary');
		component.decisionPoint = {
			...choiceToChoiceMustNotHaveRulePoint,
			choices: [
				{
					...choiceToChoiceMustNotHaveRulePoint.choices[0],
					mappedAttributeGroups: [
						{
							id: 17941,
						},
					],
					selectedAttributes: [],
				},
			],
		};
		spyOn(component, 'isChoiceComplete').and.returnValue(false);
		fixture.detectChanges();
		const additionalSelectionsRequiredLink = findElementByTestId(
			fixture,
			'additional-selections-warning'
		);
		additionalSelectionsRequiredLink.nativeElement.click();
		tick();
		expect(location.path()).toBe(
			`/options/${mockGroup1.subGroups[0].id}/${choiceToChoiceMustNotHaveRulePoint.id}/${choiceToChoiceMustNotHaveRulePoint.choices[0].id}`
		);
	}));

	describe('pricing', () =>
	{
		const testChoice = choiceToChoiceMustNotHaveRulePoint.choices[0];

		it('shows price when pricing not hidden from buyer and not presale', () =>
		{
			mockStore.setState({
				scenario: { buildMode: BuildMode.Buyer },
			});
			fixture.detectChanges();
			expect(
				findElementByTestId(fixture, 'price').nativeElement.innerText
			).toBe(`$${testChoice.price * testChoice.quantity}`);
		});

		it('shows price when pricing not hidden from buyer and presale pricing enabled', () =>
		{
			mockStore.setState({
				scenario: { presalePricingEnabled: true },
			});
			fixture.detectChanges();
			expect(
				findElementByTestId(fixture, 'price').nativeElement.innerText
			).toBe(`$${testChoice.price * testChoice.quantity}`);
		});

		it('shows pricing varies when price hidden from buyer and not presale', () =>
		{
			mockStore.setState({
				scenario: { buildMode: BuildMode.Buyer },
			});
			component.decisionPoint = {
				...choiceToChoiceMustNotHaveRulePoint,
				choices: [
					{
						...choiceToChoiceMustNotHaveRulePoint.choices[0],
						mappedAttributeGroups: [
							{
								id: 17941,
							},
						],
						selectedAttributes: [],
						priceHiddenFromBuyerView: true,
					},
				],
			};
			fixture.detectChanges();
			expect(
				findElementByTestId(fixture, 'pricing-varies').nativeElement
					.innerText
			).toBeTruthy();
		});

		it('shows pricing varies when price hidden from buyer and presale pricing enabled', () =>
		{
			mockStore.setState({
				scenario: { presalePricingEnabled: true },
			});
			component.decisionPoint = {
				...choiceToChoiceMustNotHaveRulePoint,
				choices: [
					{
						...choiceToChoiceMustNotHaveRulePoint.choices[0],
						mappedAttributeGroups: [
							{
								id: 17941,
							},
						],
						selectedAttributes: [],
						priceHiddenFromBuyerView: true,
					},
				],
			};
			fixture.detectChanges();
			expect(
				findElementByTestId(fixture, 'pricing-varies').nativeElement
					.innerText
			).toBeTruthy();
		});

		it('does not show pricing for presale and presale pricing not enabled', () =>
		{
			mockStore.setState({
				scenario: {
					buildMode: BuildMode.Presale,
					presalePricingEnabled: false,
				},
			});
			fixture.detectChanges();
			expect(findElementByTestId(fixture, 'price')).toBeFalsy();
			expect(findElementByTestId(fixture, 'pricing-varies')).toBeFalsy();
		});
	});
});

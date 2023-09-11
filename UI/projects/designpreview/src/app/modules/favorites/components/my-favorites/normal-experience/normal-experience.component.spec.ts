import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NormalExperienceComponent } from './normal-experience.component';
import { Component, Input, SimpleChange } from '@angular/core';
import {
	dpToDpRulesPoint,
	mockSubGroup,
} from '../../../../shared/classes/mockdata.class';
import { findElementByTestId } from '../../../../shared/classes/test-utils.class';
import {
	Choice,
	DecisionPoint,
	Group,
	MyFavoritesPointDeclined,
	Tree,
} from 'phd-common';
import { MockDecisionBarComponent } from '../../../../shared/mocks/mock-decision-bar-component';
import { MockChoiceCardComponent } from '../../../../shared/mocks/mock-choice-card-component';

@Component({ selector: 'choice-decline-card', template: '' })
class MockChoiceDeclineCard 
{
	@Input() currentPoint: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean = false;
	@Input() isPresalePricingEnabled: boolean = false;
}

describe('NormalExperienceComponent', () => 
{
	let component: NormalExperienceComponent;
	let fixture: ComponentFixture<NormalExperienceComponent>;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				NormalExperienceComponent,
				MockDecisionBarComponent,
				MockChoiceCardComponent,
				MockChoiceDeclineCard,
			],
		}).compileComponents();

		fixture = TestBed.createComponent(NormalExperienceComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	// Decision point comes from changes['currentSubgroup']
	it('shows decision point and choice if dp is not hidden and choice is not hidden', () => 
	{
		component.noVisibleGroups = false;
		component.unfilteredPoints = [dpToDpRulesPoint];
		component.ngOnChanges({
			currentSubgroup: new SimpleChange(null, mockSubGroup, true),
		});
		fixture.detectChanges();

		const pointLabel = findElementByTestId(fixture, 'point-label');
		expect(pointLabel.nativeElement.innerText).toBe('Smart Home Additions');
		const choiceCard = findElementByTestId(fixture, 'choice-card');
		expect(choiceCard).toBeTruthy();
	});

	it('hides decision point and choice if dp is hidden', () => 
	{
		component.noVisibleGroups = false;
		component.unfilteredPoints = [dpToDpRulesPoint];
		const subGroupWithHiddenPoint = {
			...mockSubGroup,
			points: [
				{ ...mockSubGroup.points[0], isHiddenFromBuyerView: true },
			],
		};
		component.ngOnChanges({
			currentSubgroup: new SimpleChange(
				null,
				subGroupWithHiddenPoint,
				true
			),
		});
		fixture.detectChanges();

		const pointLabel = findElementByTestId(fixture, 'point-label');
		expect(pointLabel).toBeFalsy();
		const choiceCard = findElementByTestId(fixture, 'choice-card');
		expect(choiceCard).toBeFalsy();
	});

	it('hides decision point and choice if dp is not hidden and there are no unhidden choices', () => 
	{
		component.noVisibleGroups = false;
		component.unfilteredPoints = [dpToDpRulesPoint];
		const hiddenChoice: Choice = {
			...dpToDpRulesPoint.choices[0],
			isHiddenFromBuyerView: true,
		};
		const subGroup = {
			...mockSubGroup,
			points: [{ ...mockSubGroup.points[0], choices: [hiddenChoice] }],
		};
		component.ngOnChanges({
			currentSubgroup: new SimpleChange(null, subGroup, false),
		});
		fixture.detectChanges();

		const pointLabel = findElementByTestId(fixture, 'point-label');
		expect(pointLabel).toBeFalsy();
		const choiceCard = findElementByTestId(fixture, 'choice-card');
		expect(choiceCard).toBeFalsy();
	});
});

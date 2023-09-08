import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailedDecisionBarComponent } from './detailed-decision-bar.component';
import { dpToDpRulesPoint } from '../../classes/mockdata.class';
import { findElementByTestId } from '../../classes/test-utils.class';
import {
	Choice,
	DecisionPoint,
	Group,
	MyFavoritesPointDeclined,
	Tree,
} from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';

@Component({ selector: 'decision-bar-choice', template: '' })
class MockDecisionBarChoiceComponent 
{
	@Input() choice: ChoiceExt;
	@Input() point: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean;
	@Input() isPresalePricingEnabled: boolean;
}

@Component({ selector: 'decision-bar-decline-choice', template: '' })
class MockDecisionBarDeclineChoiceComponent 
{
	@Input() point: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
}

describe('DetailedDecisionBarComponent', () => 
{
	let component: DetailedDecisionBarComponent;
	let fixture: ComponentFixture<DetailedDecisionBarComponent>;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [
				DetailedDecisionBarComponent,
				MockDecisionBarChoiceComponent,
				MockDecisionBarDeclineChoiceComponent,
			],
			imports: [BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(DetailedDecisionBarComponent);
		component = fixture.componentInstance;
		component.unfilteredPoints = [dpToDpRulesPoint];
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	// Decision point comes from input
	it('shows decision point and choice if dp is not hidden and choice is not hidden', () => 
	{
		component.points = [dpToDpRulesPoint];
		fixture.detectChanges();

		const pointLabel = findElementByTestId(fixture, 'point-label');
		expect(pointLabel).toBeTruthy();
		const decisionBarChoice = findElementByTestId(
			fixture,
			'decision-bar-choice'
		);
		expect(decisionBarChoice).toBeTruthy();
	});

	it('hides decision point and choice if dp is hidden', () => 
	{
		component.points = [
			{
				...dpToDpRulesPoint,
				isHiddenFromBuyerView: true,
			},
		];
		fixture.detectChanges();

		const pointLabel = findElementByTestId(fixture, 'point-label');
		expect(pointLabel).toBeFalsy();
		const decisionBarChoice = findElementByTestId(
			fixture,
			'decision-bar-choice'
		);
		expect(decisionBarChoice).toBeFalsy();
	});

	it('hides decision point and choice if dp is not hidden and choice is hidden', () => 
	{
		const hiddenChoice: Choice = {
			...dpToDpRulesPoint.choices[0],
			isHiddenFromBuyerView: true,
		};
		component.points = [
			{
				...dpToDpRulesPoint,
				choices: [hiddenChoice],
			},
		];
		fixture.detectChanges();

		const pointLabel = findElementByTestId(fixture, 'point-label');
		expect(pointLabel).toBeFalsy();
		const decisionBarChoice = findElementByTestId(
			fixture,
			'decision-bar-choice'
		);
		expect(decisionBarChoice).toBeFalsy();
	});
});

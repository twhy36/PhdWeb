import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Choice, EllipsisPipe } from 'phd-common';
import { DecisionBarComponent } from './decision-bar.component';
import { dpToDpRulesPoint } from '../../classes/mockdata.class';
import { findElementByTestId } from '../../classes/test-utils.class';

describe('DecisionBarComponent', () => 
{
	let component: DecisionBarComponent;
	let fixture: ComponentFixture<DecisionBarComponent>;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [DecisionBarComponent, EllipsisPipe],
			imports: [BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(DecisionBarComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	// Decision point comes from input
	it('shows decision point is if is not hidden and it has an unhidden choice', () => 
	{
		component.points = [dpToDpRulesPoint];
		fixture.detectChanges();

		const pointLabel = findElementByTestId(fixture, 'point-label');
		expect(pointLabel.nativeElement.innerText).toBe('Smart Home Additions');
	});

	it('hides decision point if it is not hidden and has no unhidden choices', () => 
	{
		const hiddenChoice: Choice = {
			...dpToDpRulesPoint.choices[0],
			isHiddenFromBuyerView: true,
		};
		component.points = [
			{
				...dpToDpRulesPoint,
				isHiddenFromBuyerView: false,
				choices: [hiddenChoice],
			},
		];
		fixture.detectChanges();

		const pointLabel = findElementByTestId(fixture, 'point-label');
		expect(pointLabel).toBeFalsy();
	});

	it('hides decision point if it is hidden', () => 
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
	});
});

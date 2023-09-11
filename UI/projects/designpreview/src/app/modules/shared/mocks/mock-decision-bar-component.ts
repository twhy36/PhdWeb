import { Component, Input } from '@angular/core';
import { DecisionPoint } from 'phd-common';

@Component({
	selector: 'decision-bar',
	template: '',
	// eslint-disable-next-line indent
})
export class MockDecisionBarComponent 
{
	@Input() points: DecisionPoint[];
	@Input() currentPointId: number;
}

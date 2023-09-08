import { Component, Input } from '@angular/core';
import { DecisionPoint, Group, Tree } from 'phd-common';
import { ChoiceExt } from '../models/choice-ext.model';

@Component({ selector: 'choice-card', template: '' })
export class MockChoiceCardComponent 
{
	@Input() currentChoice: ChoiceExt;
	@Input() currentPoint: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean = false;
	@Input() isPresalePricingEnabled: boolean = false;
	@Input() isIncludedOptions: boolean = false;
}

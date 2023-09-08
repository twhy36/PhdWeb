import { Component, Input } from '@angular/core';
import { DecisionPoint, Group, JobChoice, SubGroup } from 'phd-common';
import { BuildMode } from '../models/build-mode.model';

@Component({ selector: 'decision-point-summary', template: '' })
export class MockDecisionPointSummaryComponent 
{
	@Input() decisionPoint: DecisionPoint;
	@Input() group: Group;
	@Input() subGroup: SubGroup;
	@Input() salesChoices: JobChoice[];
	@Input() includeContractedOptions: boolean;
	@Input() buildMode: BuildMode;
	@Input() isDesignComplete: boolean = false;
	@Input() isPresale: boolean = false;
	@Input() contractedOptionsPage: boolean = false;
	@Input() favoritesId: number;
	@Input() isPresalePricingEnabled: boolean = false;
}

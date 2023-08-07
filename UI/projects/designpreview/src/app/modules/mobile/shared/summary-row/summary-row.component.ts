import { Component, Input } from '@angular/core';
import { DecisionPoint, Group, JobChoice, SubGroup } from 'phd-common';
import { BuildMode } from '../../../shared/models/build-mode.model';

@Component({
	selector: 'summary-row',
	templateUrl: './summary-row.component.html',
	styleUrls: ['./summary-row.component.scss']
	})
export class SummaryRowComponent
{
	@Input() decisionPoint: DecisionPoint;
	@Input() group: Group;
	@Input() subGroup: SubGroup;
	@Input() contractedOptionsPage: boolean = false;

	constructor()
	{
	}

}


import { Action } from '@ngrx/store';

import { OpportunityContactAssoc } from '../../shared/models/opportunity.model';
import { ScenarioLoaded, SalesAgreementLoaded } from '../actions';

export enum OpportunityActionTypes {
    LoadOpportunity = 'Load Opportunity',
	OpportunityLoaded = 'Opportunity Loaded',
	OpportunityContactAssocUpdated = 'Opportunity Contact Assoc Updated'
}

export class LoadOpportunity implements Action {
    readonly type = OpportunityActionTypes.LoadOpportunity;

    constructor(public opportunityId: string) { }
}

export class OpportunityLoaded implements Action {
    readonly type = OpportunityActionTypes.OpportunityLoaded;

	constructor(public opportunity: OpportunityContactAssoc) { }
}

export class OpportunityContactAssocUpdated implements Action {
	readonly type = OpportunityActionTypes.OpportunityContactAssocUpdated;

	constructor(public opportunity: OpportunityContactAssoc) { }
}

export type OpportunityActions =
    LoadOpportunity |
	OpportunityLoaded |
	ScenarioLoaded |
	SalesAgreementLoaded |
	OpportunityContactAssocUpdated;

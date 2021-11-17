import { Action } from '@ngrx/store';

import { OpportunityContactAssoc, Log } from 'phd-common';
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

@Log(true)
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

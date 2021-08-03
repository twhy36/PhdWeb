import { Action } from '@ngrx/store';

import { ChangeOrderGroup, Job, SpecInformation, JobPlanOption } from 'phd-common';

import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded, JobLoaded, SalesAgreementCancelled, ESignEnvelopesLoaded, ChangeOrdersUpdated, ChangeOrderEnvelopeCreated, ScenarioLoaded } from '../actions';

export enum JobActionTypes
{
	SpecsLoaded = 'Specs Loaded',
	DeselectSpec = 'Deselect Spec',
	JobUpdated = 'Job Updated',
	SaveError = 'Save Error',
	ChangeOrdersCreatedForJob = 'Change Orders Created For Job',
	CreateChangeOrderEnvelope = 'Create Change Order Envelope',
	EnvelopeError = 'Envelope Error',
	LoadSpecs = 'Load Specs',
	LoadJobForJob = 'Load Job For Job',
	JobLoadedByJobId = 'Job Loaded By Job Id',
	LoadPulteInfo = 'Load Pulte Info',
	PulteInfoLoaded = 'PulteInfoLoaded',
	SavePulteInfo = 'Save Pulte Info',
	PulteInfoSaved = 'Pulte Info Saved',
	JobPlanOptionsUpdated = 'Job Plan Options Updated'
}

export class SpecsLoaded implements Action
{
	readonly type = JobActionTypes.SpecsLoaded;

	constructor(public jobs: Job[]) { }
}

export class DeselectSpec implements Action
{
	readonly type = JobActionTypes.DeselectSpec;

	constructor() { }
}

export class SaveError extends ErrorAction
{
	readonly type = JobActionTypes.SaveError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export class JobUpdated implements Action
{
	readonly type = JobActionTypes.JobUpdated;

	constructor(public job: Job) { }
}

export class ChangeOrdersCreatedForJob implements Action
{
	readonly type = JobActionTypes.ChangeOrdersCreatedForJob;

	constructor(public changeOrderGroups: Array<ChangeOrderGroup>) { }
}

export class CreateChangeOrderEnvelope implements Action
{
	readonly type = JobActionTypes.CreateChangeOrderEnvelope;

	constructor(public changeOrder: any) { }
}

export class EnvelopeError extends ErrorAction
{
	readonly type = JobActionTypes.EnvelopeError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export class LoadSpecs implements Action
{
	readonly type = JobActionTypes.LoadSpecs;

	constructor() { }
}

export class LoadJobForJob implements Action
{
	readonly type = JobActionTypes.LoadJobForJob;

	constructor(public jobId: number, public clearState: boolean = true) { }
}

export class JobLoadedByJobId implements Action
{
	readonly type = JobActionTypes.JobLoadedByJobId;

	constructor(public job: Job) { }
}

export class LoadPulteInfo implements Action
{
	readonly type = JobActionTypes.LoadPulteInfo;

	constructor(public jobId: number) { }
}

export class PulteInfoLoaded implements Action
{
	readonly type = JobActionTypes.PulteInfoLoaded;

	constructor(public pulteInfo: SpecInformation) { }
}

export class SavePulteInfo implements Action
{
	readonly type = JobActionTypes.SavePulteInfo;

	constructor(public pulteInfo: SpecInformation) { }
}

export class PulteInfoSaved implements Action
{
	readonly type = JobActionTypes.PulteInfoSaved;

	constructor() { }
}

export class JobPlanOptionsUpdated implements Action 
{
	readonly type = JobActionTypes.JobPlanOptionsUpdated;

	constructor(public jobPlanOptions: JobPlanOption[]) { }
}

export type JobActions =
	ChangeOrdersUpdated |
	JobUpdated |
	SalesAgreementLoaded |
	SaveError |
	ChangeOrdersCreatedForJob |
	SpecsLoaded |
	DeselectSpec |
	CreateChangeOrderEnvelope |
	EnvelopeError |
	LoadSpecs |
	ChangeOrderEnvelopeCreated |
	JobLoaded |
	SalesAgreementCancelled |
	LoadJobForJob |
	JobLoadedByJobId |
	LoadPulteInfo |
	PulteInfoLoaded |
	SavePulteInfo |
	PulteInfoSaved |
	ESignEnvelopesLoaded |
	ScenarioLoaded |
	JobPlanOptionsUpdated;

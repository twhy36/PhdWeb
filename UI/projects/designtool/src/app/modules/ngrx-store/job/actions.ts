import { Action } from '@ngrx/store';

import { ChangeOrderGroup, Job, SpecInformation, JobPlanOption, Log } from 'phd-common';

import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded, JobLoaded, SalesAgreementCancelled, ESignEnvelopesLoaded, ChangeOrdersUpdated, ChangeOrderEnvelopeCreated, ScenarioLoaded, CommonActionTypes } from '../actions';

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

@Log(true)
export class SpecsLoaded implements Action
{
	readonly type = JobActionTypes.SpecsLoaded;

	constructor(public jobs: Job[]) { }
}

@Log()
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

@Log()
export class JobUpdated implements Action
{
	readonly type = JobActionTypes.JobUpdated;

	constructor(public job: Job) { }
}

@Log()
export class ChangeOrdersCreatedForJob implements Action
{
	readonly type = JobActionTypes.ChangeOrdersCreatedForJob;

	constructor(public changeOrderGroups: Array<ChangeOrderGroup>) { }
}

@Log(true, [CommonActionTypes.ChangeOrderEnvelopeCreated, JobActionTypes.EnvelopeError])
export class CreateChangeOrderEnvelope implements Action
{
	readonly type = JobActionTypes.CreateChangeOrderEnvelope;

	constructor(public changeOrder: any) { }
}

@Log(true)
export class EnvelopeError extends ErrorAction
{
	readonly type = JobActionTypes.EnvelopeError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Log()
export class LoadSpecs implements Action
{
	readonly type = JobActionTypes.LoadSpecs;

	constructor() { }
}

@Log(true)
export class LoadJobForJob implements Action
{
	readonly type = JobActionTypes.LoadJobForJob;

	constructor(public jobId: number, public clearState: boolean = true) { }
}

@Log()
export class JobLoadedByJobId implements Action
{
	readonly type = JobActionTypes.JobLoadedByJobId;

	constructor(public job: Job) { }
}

@Log(true)
export class LoadPulteInfo implements Action
{
	readonly type = JobActionTypes.LoadPulteInfo;

	constructor(public jobId: number) { }
}

@Log()
export class PulteInfoLoaded implements Action
{
	readonly type = JobActionTypes.PulteInfoLoaded;

	constructor(public pulteInfo: SpecInformation) { }
}

@Log(true)
export class SavePulteInfo implements Action
{
	readonly type = JobActionTypes.SavePulteInfo;

	constructor(public pulteInfo: SpecInformation) { }
}

@Log()
export class PulteInfoSaved implements Action
{
	readonly type = JobActionTypes.PulteInfoSaved;

	constructor() { }
}

@Log(true)
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

import { Action } from '@ngrx/store';
import { Job } from '../../shared/models/job.model';
import { ChangeOrderGroup } from '../../shared/models/job-change-order.model';
import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded, JobLoaded, SalesAgreementCancelled, ESignEnvelopesLoaded, ChangeOrdersUpdated, ChangeOrderEnvelopeCreated, ScenarioLoaded } from '../actions';
import { SpecInformation } from './../../shared/models/job.model';

export enum JobActionTypes
{
	SpecsLoaded = 'Specs Loaded',
	JobUpdated = 'Job Updated',
	SaveError = 'Save Error',
	ChangeOrdersCreatedForJob = 'Change Orders Created For Job',
	CreateChangeOrderEnvelope = 'Create Change Order Envelope',
	EnvelopeError = 'Envelope Error',
	LoadSpecsAndModels = 'Load Specs and Models',
	LoadJobForJob = 'Load Job For Job',
	JobLoadedByJobId = 'Job Loaded By Job Id',
	LoadPulteInfo = 'Load Pulte Info',
	PulteInfoLoaded = 'PulteInfoLoaded',
	SavePulteInfo = 'Save Pulte Info',
	PulteInfoSaved = 'Pulte Info Saved'
}

export class SpecsLoaded implements Action
{
	readonly type = JobActionTypes.SpecsLoaded;

	constructor(public jobs: Job[]) { }
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

export class LoadSpecsAndModels implements Action
{
	readonly type = JobActionTypes.LoadSpecsAndModels;

	constructor() { }
}

export class LoadJobForJob implements Action
{
	readonly type = JobActionTypes.LoadJobForJob;

	constructor(public jobId: number) { }
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

export type JobActions =
	ChangeOrdersUpdated |
	JobUpdated |
	SalesAgreementLoaded |
	SaveError |
	ChangeOrdersCreatedForJob |
	SpecsLoaded |
	CreateChangeOrderEnvelope |
	EnvelopeError |
	LoadSpecsAndModels |
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
	ScenarioLoaded;

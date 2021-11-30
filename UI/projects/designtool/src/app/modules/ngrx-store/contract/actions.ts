import { Action } from '@ngrx/store';
import { ESignTypeEnum, Log } from 'phd-common';

import { ErrorAction } from '../error.action';

import { Template } from '../../shared/models/template.model';
import { FinancialCommunityESign } from '../../shared/models/contract.model';

export enum ContractActionTypes
{
	TemplatesLoaded = 'Templates Loaded',
	LoadError = 'Templates Load Error',
	AddRemoveSelectedTemplate = 'Add/Remove Selected Template',
	SelectUnselectAllTemplates = 'Select/Unselect All Templates',
	CreateEnvelope = 'Create Envelope',
	EnvelopeCreated = 'Envelope Created',
	EnvelopeError = 'Envelope Error',
	// Termination Agreement
	CreateTerminationEnvelope = 'Create Termination Envelope',
	TerminationEnvelopeCreated = 'Termination Envelope Created',
	TerminationEnvelopeError = 'Termination Envelope Error',
	// Financial Community ESign
	LoadFinancialCommunityESign = 'Load Financial Community ESign',
	FinancialCommunityESignLoaded = 'Financial Community ESign Loaded',
	SetESignType = 'Set ESign Type',
	SetChangeOrderTemplates = 'Set ChangeOrder Templates'
}

export class TemplatesLoaded implements Action
{
	readonly type = ContractActionTypes.TemplatesLoaded;

	constructor(public templates: Array<Template>) { }
}

export class LoadError extends ErrorAction
{
	readonly type = ContractActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}


export class AddRemoveSelectedTemplate implements Action
{
	readonly type = ContractActionTypes.AddRemoveSelectedTemplate;

	constructor(public templateId: number, public remove: boolean, public selectedAgreementType: ESignTypeEnum) { }
}

export class SelectUnselectAllTemplates implements Action
{
	readonly type = ContractActionTypes.SelectUnselectAllTemplates;

	constructor(public remove: boolean) { }
}

@Log(true, [ContractActionTypes.EnvelopeCreated, ContractActionTypes.EnvelopeError])
export class CreateEnvelope implements Action
{
	readonly type = ContractActionTypes.CreateEnvelope;

	constructor(public isPreview: boolean = false) { }
}

@Log(true)
export class EnvelopeCreated implements Action
{
	readonly type = ContractActionTypes.EnvelopeCreated;

	constructor(public envelopeId: string) { }
}

@Log(true)
export class EnvelopeError extends ErrorAction
{
	readonly type = ContractActionTypes.EnvelopeError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Log(false, [ContractActionTypes.TerminationEnvelopeCreated, ContractActionTypes.TerminationEnvelopeError])
export class CreateTerminationEnvelope implements Action
{
	readonly type = ContractActionTypes.CreateTerminationEnvelope;

	constructor() { }
}

@Log(true)
export class TerminationEnvelopeCreated implements Action
{
	readonly type = ContractActionTypes.TerminationEnvelopeCreated;

	constructor(public terminationEnvelopeId: string) { }
}

@Log(true)
export class TerminationEnvelopeError extends ErrorAction
{
	readonly type = ContractActionTypes.TerminationEnvelopeError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Log()
export class LoadFinancialCommunityESign implements Action
{
	readonly type = ContractActionTypes.LoadFinancialCommunityESign;

	constructor(public financialCommunityId: number) { }
}

export class FinancialCommunityESignLoaded implements Action
{
	readonly type = ContractActionTypes.FinancialCommunityESignLoaded;

	constructor(public financialCommunityESign: FinancialCommunityESign) { }
}

@Log(true)
export class SetESignType implements Action {
	readonly type = ContractActionTypes.SetESignType;

	constructor(public eSignType: ESignTypeEnum) { }
}

@Log(true)
export class SetChangeOrderTemplates implements Action {
	readonly type = ContractActionTypes.SetChangeOrderTemplates;

	constructor(public inChangeOrder: boolean) { }
}

export type ContractActions =
	TemplatesLoaded |
	LoadError |
	AddRemoveSelectedTemplate |
	SelectUnselectAllTemplates |
	CreateEnvelope |
	EnvelopeCreated |
	EnvelopeError |
	CreateTerminationEnvelope |
	TerminationEnvelopeCreated |
	TerminationEnvelopeError |
	LoadFinancialCommunityESign |
	FinancialCommunityESignLoaded |
	SetESignType |
	SetChangeOrderTemplates;

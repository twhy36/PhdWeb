import { ContractActions, ContractActionTypes } from './actions';

import { ESignTypeEnum } from 'phd-common';
import { Template, TemplateTypeEnum } from '../../shared/models/template.model';
import { FinancialCommunityESign } from '../../shared/models/contract.model';

export interface State
{
	templates: Array<Template>,
	hasError: boolean,
	selectedTemplates: Array<number>
	envelopeId: string,
	selectedAgreementType: ESignTypeEnum,
	terminationEnvelopeId: string,
	financialCommunityESign: FinancialCommunityESign
}

export const initialState: State = { templates: [], hasError: false, selectedTemplates: [], envelopeId: null, terminationEnvelopeId: null, selectedAgreementType: ESignTypeEnum.SalesAgreement, financialCommunityESign: null };

export function reducer(state: State = initialState, action: ContractActions): State
{
	switch (action.type)
	{
		case ContractActionTypes.TemplatesLoaded:
			return { ...state, templates: action.templates, selectedTemplates: action.templates.filter(t => t.templateTypeId === TemplateTypeEnum['Sales Agreement']).map(t => t.templateId) };
		case ContractActionTypes.LoadError:
			return { ...state, hasError: true };
		case ContractActionTypes.AddRemoveSelectedTemplate:
			if (action.remove)
			{
				return { ...state, selectedTemplates: state.selectedTemplates.filter(t => t !== action.templateId) };
			}
			else
			{
				return { ...state, selectedTemplates: [...state.selectedTemplates, action.templateId], selectedAgreementType: action.selectedAgreementType };
			}
		case ContractActionTypes.SelectUnselectAllTemplates:
			if (action.remove)
			{
				return { ...state, selectedTemplates: [], selectedAgreementType: ESignTypeEnum.SalesAgreement };
			}
			else
			{
				return { ...state, selectedTemplates: state.templates.filter(x => x.templateTypeId !== TemplateTypeEnum['Cancel Form']).map(t => t.templateId), selectedAgreementType: ESignTypeEnum.SalesAgreement };
			}
		case ContractActionTypes.CreateEnvelope:
			return { ...state, envelopeId: null };
		case ContractActionTypes.EnvelopeCreated:
			return { ...state, envelopeId: action.envelopeId };
		case ContractActionTypes.EnvelopeError:
			return { ...state, envelopeId: null, hasError: true };
		case ContractActionTypes.CreateTerminationEnvelope:
			return { ...state, terminationEnvelopeId: null };
		case ContractActionTypes.TerminationEnvelopeCreated:
			return { ...state, terminationEnvelopeId: action.terminationEnvelopeId };
		case ContractActionTypes.TerminationEnvelopeError:
			return { ...state, terminationEnvelopeId: null, hasError: true };
		case ContractActionTypes.LoadFinancialCommunityESign:
			return { ...state };
		case ContractActionTypes.FinancialCommunityESignLoaded:
			return { ...state, financialCommunityESign: action.financialCommunityESign, hasError: false };
		case ContractActionTypes.SetESignType:
			return { ...state, selectedAgreementType: action.eSignType };
		default:
			return state;
	}
}

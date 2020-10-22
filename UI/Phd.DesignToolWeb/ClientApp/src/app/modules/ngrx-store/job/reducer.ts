import { createFeatureSelector, createSelector } from '@ngrx/store';

import { Job, SpecInformation } from '../../shared/models/job.model';
import { JobActions, JobActionTypes } from './actions';
import { ChangeOrderGroup } from '../../shared/models/job-change-order.model';
import * as _ from 'lodash';
import { CommonActionTypes } from '../actions';
import { ESignStatusEnum } from '../../shared/models/esign-envelope.model';

export interface State extends Job
{
	jobLoading: boolean;
	loadError: boolean;
	saveError: boolean;
	specJobs: Job[];
	specInfoLoading: boolean;
	specInformation: SpecInformation;
	savingspecInformation: boolean;
}

export const initialState: State = {
	...new Job(), jobLoading: false, loadError: false, saveError: false, specJobs: null, specInfoLoading: false,
	specInformation: null, savingspecInformation: false
};

export function reducer(state: State = initialState, action: JobActions): State
{
	switch (action.type)
	{
		case JobActionTypes.SpecsLoaded:
			return { ...state, jobLoading: false, loadError: false, specJobs: action.jobs };
		case CommonActionTypes.SalesAgreementLoaded:
		case CommonActionTypes.JobLoaded:
			return { ...state, ...action.job, jobLoading: false, loadError: false };

		case CommonActionTypes.ChangeOrdersUpdated:
			{
				let changeOrderGroups: Array<ChangeOrderGroup> = _.cloneDeep(state.changeOrderGroups) || [];

				action.changeOrders.forEach(changeOrder =>
				{
					let changeOrderUpdated: ChangeOrderGroup = changeOrderGroups.find(co => co.id === changeOrder.id);

					if (changeOrderUpdated)
					{
						switch (changeOrder.salesStatusDescription)
						{
							case 'Signed':
								changeOrderUpdated.salesStatusUTCDate = changeOrder.salesStatusUTCDate;
								changeOrderUpdated.jobChangeOrderGroupSalesStatusHistories.push(changeOrder.jobChangeOrderGroupSalesStatusHistories[0]);
								break;
							case 'OutforSignature':
								if (changeOrder.eSignEnvelopes)
								{
									changeOrderUpdated.eSignEnvelopes = changeOrder.eSignEnvelopes;
								}

								break;
							case 'Approved':
								changeOrderUpdated.constructionStatusDescription = changeOrder.constructionStatusDescription;

								break;
							case 'Withdrawn':
							case 'Rejected':
								changeOrderUpdated.jobChangeOrderGroupSalesStatusHistories.push(changeOrder.jobChangeOrderGroupSalesStatusHistories[0]);

								break;
						}

						changeOrderUpdated.salesStatusDescription = changeOrder.salesStatusDescription;
					}
				});

				return { ...state, changeOrderGroups: changeOrderGroups, saveError: false };
			}
		case JobActionTypes.SaveError:
			return { ...state, saveError: true };
		case JobActionTypes.JobUpdated:
			return { ...state, ...action.job };
		case JobActionTypes.ChangeOrdersCreatedForJob:
			{
				let changeOrderGroups: Array<ChangeOrderGroup> = _.cloneDeep(state.changeOrderGroups) || [];
				let actionChangeOrderGroups = _.cloneDeep(action.changeOrderGroups);

				//if it's a JIO, it updates the job handing in the API. Need to update job state
				//as well
				let handing = state.handing;

				let jio = actionChangeOrderGroups.find(cog => cog.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === "SalesJIO" || co.jobChangeOrderTypeDescription === "SpecJIO"));
				if (jio && jio.salesStatusDescription === 'Pending')
				{
					let handingCO = jio.jobChangeOrders.find(co => co.jobChangeOrderHandings && co.jobChangeOrderHandings.length > 0);
					let coHanding = handingCO.jobChangeOrderHandings.find(h => h.action === 'Add');
					if (coHanding && coHanding.handing !== handing) {
						handing = coHanding.handing;
					}
				}

				actionChangeOrderGroups.forEach(c =>
				{
					let changeOrder = changeOrderGroups.find(co => co.id === c.id);

					if (changeOrder)
					{
						//keep existing envelope info
						Object.assign(changeOrder, c, { envelopeId: changeOrder.envelopeId, eSignEnvelopes: changeOrder.eSignEnvelopes });
					}
					else
					{
						c.eSignEnvelopes = [];

						changeOrderGroups.unshift(c);
					}
				});

				return { ...state, handing: handing, changeOrderGroups: changeOrderGroups };
			}
		case JobActionTypes.LoadPulteInfo: {
			return { ...state, specInfoLoading: true };
		}
		case JobActionTypes.LoadJobForJob: {
			return { ...state, jobLoading: true };
		}
		case JobActionTypes.PulteInfoLoaded: {
			return { ...state, specInfoLoading: false, specInformation: action.pulteInfo };
		}
		case CommonActionTypes.ChangeOrderEnvelopeCreated:
			{
				let changeOrderGroups: Array<ChangeOrderGroup> = _.cloneDeep(state.changeOrderGroups) || [];
				let changeOrder: ChangeOrderGroup = changeOrderGroups.find(changeOrder => changeOrder.id === action.changeOrder.changeOrderGroupId);

				if (changeOrder)
				{
					if (changeOrder.eSignEnvelopes && changeOrder.eSignEnvelopes.some(e => e.eSignStatusId === ESignStatusEnum.Created))
					{
						let eSignEnvelopes = changeOrder.eSignEnvelopes.filter(e => e.eSignStatusId !== ESignStatusEnum.Created);

						changeOrder.eSignEnvelopes = [...(eSignEnvelopes || []), action.eSignEnvelope];
					}
					else
					{
						changeOrder.eSignEnvelopes = [...(changeOrder.eSignEnvelopes || []), action.eSignEnvelope];
					}

					changeOrder.envelopeId = action.eSignEnvelope.envelopeGuid;
				}

				return { ...state, changeOrderGroups: changeOrderGroups, saveError: false };
			}

		case JobActionTypes.JobLoadedByJobId:
			return { ...state, jobLoading: false, ...action.job };
		case CommonActionTypes.SalesAgreementCancelled:
			const job: Job = _.cloneDeep(action.job);

			job.lot.lotStatusDescription = 'Available';
			job.lot.lotBuildTypeDesc = action.buildType == 'Dirt' ? 'Dirt' : 'Spec';

			job.changeOrderGroups.map(co =>
			{
				if (co.salesStatusDescription == 'Pending')
				{
					co.salesStatusDescription = 'Withdrawn';
					co.salesStatusUTCDate = action.salesAgreement.lastModifiedUtcDate;
				}
			});

			// If buildType == Dirt, Job remains in place but clear of all choice selections.
			if (action.buildType === 'Dirt')
			{
				job.jobChoices = [];
				job.jobPlanOptions = [];
			}

			return { ...state, ...job };

		case CommonActionTypes.ESignEnvelopesLoaded:
			let changeOrderGroups: Array<ChangeOrderGroup> = _.cloneDeep(state.changeOrderGroups) || [];

			if (action.jobChangeOrderEnvelopes)
			{
				action.jobChangeOrderEnvelopes.forEach(env =>
				{
					var changeOrder = changeOrderGroups.find(co => co.id === env.edhChangeOrderGroupId);

					if (changeOrder)
					{
						changeOrder.eSignEnvelopes = [...(changeOrder.eSignEnvelopes || []), env];
						changeOrder.envelopeId = env.envelopeGuid;
					}
				});
			}

			return { ...state, changeOrderGroups: changeOrderGroups };

		case JobActionTypes.SavePulteInfo:
			return { ...state, savingspecInformation: true };
		case JobActionTypes.PulteInfoSaved:
			return { ...state, savingspecInformation: false };
		case CommonActionTypes.ScenarioLoaded:
			return { ...state, ...action.job };
		default:
			return state;
	}
}

export const jobState = createFeatureSelector<State>('job');
export const specJobs = createSelector(jobState, (state) => state.specJobs);
export const isCancelled = createSelector(jobState, (job) => job.changeOrderGroups && job.changeOrderGroups.length ? job.changeOrderGroups[0].jobChangeOrderGroupDescription === 'Cancellation' : false);

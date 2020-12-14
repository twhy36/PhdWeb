import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as _ from 'lodash';

import { environment } from '../../../../environments/environment';
import { ChangeOrderGroup,  ChangeOrderChoice, ChangeOrderPlanOption, ChangeOrderChoiceLocation, ChangeOrderHanding } from '../../shared/models/job-change-order.model';
import { Job, JobChoice, JobChoiceAttribute, JobChoiceLocation } from '../../shared/models/job.model';

@Injectable()
export class ChangeOrderService
{
	constructor(private _http: HttpClient) { }

	getTreeVersionIdByJobPlan(planId: number): Observable<number> 
	{
		let url = environment.apiUrl + `GetTreeVersionIdByJobPlan(planId=${planId})`;

		return this._http.get(url).pipe(
			map(response =>
			{
				return response['value'] as number;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}


	getSelectedChoices(job: Job, changeOrder?: ChangeOrderGroup): Array<JobChoice>
	{
		let jobChangeOrderChoices = [];

		if (changeOrder)
		{
			jobChangeOrderChoices = this.getJobChangeOrderChoices([changeOrder]);
		}

		let selectedChoices = _.cloneDeep(job.jobChoices);

		if (jobChangeOrderChoices.length > 0)
		{
			// Delete choices
			selectedChoices = selectedChoices.filter(c => !jobChangeOrderChoices.filter(c2 => c2.action === 'Delete').some(c2 => c2.dpChoiceId === c.dpChoiceId || c2.divChoiceCatalogId === c.divChoiceCatalogId));

			// Add choices
			selectedChoices = [...selectedChoices, ...jobChangeOrderChoices.filter(c => c.action === 'Add').map(coc =>
			{
				return <JobChoice>{
					id: coc.id,
					dpChoiceId: coc.decisionPointChoiceID,
					divChoiceCatalogId: coc.divChoiceCatalogId,
					dpChoiceQuantity: coc.quantity,
					jobChoiceAttributes: coc.jobChangeOrderChoiceAttributes && coc.jobChangeOrderChoiceAttributes.length
						? coc.jobChangeOrderChoiceAttributes.map(a => new JobChoiceAttribute(<JobChoiceAttribute>{
							attributeCommunityId: a.attributeCommunityId,
							attributeGroupCommunityId: a.attributeGroupCommunityId,
							id: a.id,
							attributeGroupLabel: a.attributeGroupLabel,
							attributeName: a.attributeName,
							manufacturer: a.manufacturer,
							sku: a.sku
						}))
						: [],
					jobChoiceLocations: coc.jobChangeOrderChoiceLocations && coc.jobChangeOrderChoiceLocations.length
						? coc.jobChangeOrderChoiceLocations.map(l => new JobChoiceLocation(<JobChoiceLocation>{
							id: l.id,
							locationCommunityId: l.locationCommunityId,
							locationGroupCommunityId: l.locationGroupCommunityId,
							quantity: l.quantity,
							locationGroupLabel: l.locationGroupLabel,
							locationName: l.locationName,
							jobChoiceLocationAttributes: l.jobChangeOrderChoiceLocationAttributes && l.jobChangeOrderChoiceLocationAttributes.length ?
								l.jobChangeOrderChoiceLocationAttributes.map(a => new JobChoiceAttribute(<JobChoiceAttribute>{
									attributeCommunityId: a.attributeCommunityId,
									attributeGroupCommunityId: a.attributeGroupCommunityId,
									id: a.id,
									attributeGroupLabel: a.attributeGroupLabel,
									attributeName: a.attributeName,
									manufacturer: a.manufacturer,
									sku: a.sku
								})) : []
						}))
						: []
				};
			})];

			// Update choices
			jobChangeOrderChoices.filter(c => c.action === 'Change').forEach(cco =>
			{
				let changedJobChoice = selectedChoices.find(sc => sc.divChoiceCatalogId === cco.divChoiceCatalogId);

				if (changedJobChoice)
				{
					this.mergeSelectedAttributes(changedJobChoice, cco);
					this.mergeSelectedLocations(changedJobChoice, cco);

					changedJobChoice.dpChoiceQuantity = cco.quantity;
				}
			});
		}

		return selectedChoices;
	}

	mergeSelectedAttributes(jobChoice: JobChoice, changeOrderChoice: ChangeOrderChoice)
	{
		const deletedAttributes = changeOrderChoice.jobChangeOrderChoiceAttributes.filter(x => x.action === 'Delete');

		deletedAttributes.forEach(attr =>
		{
			const deletedAttribute = jobChoice.jobChoiceAttributes.findIndex(
				d => d.attributeGroupCommunityId === attr.attributeGroupCommunityId && d.attributeCommunityId === attr.attributeCommunityId);

			if (deletedAttribute > -1)
			{
				jobChoice.jobChoiceAttributes.splice(deletedAttribute, 1);
			}
		});

		const addedAttributes = changeOrderChoice.jobChangeOrderChoiceAttributes.filter(x => x.action === 'Add');
		addedAttributes.forEach(attr =>
		{
			jobChoice.jobChoiceAttributes.push(
				new JobChoiceAttribute(<JobChoiceAttribute>{
					attributeCommunityId: attr.attributeCommunityId,
					attributeGroupCommunityId: attr.attributeGroupCommunityId,
					id: attr.id,
					attributeGroupLabel: attr.attributeGroupLabel,
					attributeName: attr.attributeName,
					manufacturer: attr.manufacturer,
					sku: attr.sku
				})
			);
		});
	}

	mergeSelectedLocations(jobChoice: JobChoice, changeOrderChoice: ChangeOrderChoice)
	{
		const deletedLocations = changeOrderChoice.jobChangeOrderChoiceLocations.filter(x => x.action === 'Delete');

		deletedLocations.forEach(loc =>
		{
			const deletedLocation = jobChoice.jobChoiceLocations.findIndex(
				d => d.locationGroupCommunityId === loc.locationGroupCommunityId && d.locationCommunityId === loc.locationCommunityId);

			if (deletedLocation > -1)
			{
				jobChoice.jobChoiceLocations.splice(deletedLocation, 1);
			}
		});

		const addedLocations = changeOrderChoice.jobChangeOrderChoiceLocations.filter(x => x.action === 'Add');

		addedLocations.forEach(loc =>
		{
			jobChoice.jobChoiceLocations.push(
				new JobChoiceLocation(<JobChoiceLocation>{
					id: loc.id,
					locationCommunityId: loc.locationCommunityId,
					locationGroupCommunityId: loc.locationGroupCommunityId,
					quantity: loc.quantity,
					locationGroupLabel: loc.locationGroupLabel,
					locationName: loc.locationName,
					jobChoiceLocationAttributes: loc.jobChangeOrderChoiceLocationAttributes && loc.jobChangeOrderChoiceLocationAttributes.length ?
						loc.jobChangeOrderChoiceLocationAttributes.map(a => new JobChoiceAttribute(<JobChoiceAttribute>{
							attributeCommunityId: a.attributeCommunityId,
							attributeGroupCommunityId: a.attributeGroupCommunityId,
							id: a.id,
							attributeGroupLabel: a.attributeGroupLabel,
							attributeName: a.attributeName,
							manufacturer: a.manufacturer,
							sku: a.sku
						})) : []
				})
			);
		});

		const changedLocations = changeOrderChoice.jobChangeOrderChoiceLocations.filter(x => x.action === 'Change');

		changedLocations.forEach(loc =>
		{
			const changedJobLocation = jobChoice.jobChoiceLocations.find(
				d => d.locationGroupCommunityId === loc.locationGroupCommunityId && d.locationCommunityId === loc.locationCommunityId);

			if (changedJobLocation)
			{
				this.mergeSelectedLocationAttributes(changedJobLocation, loc);
			}
		});
	}

	mergeSelectedLocationAttributes(jcLocation: JobChoiceLocation, cocLocation: ChangeOrderChoiceLocation)
	{
		const deletedAttributes = cocLocation.jobChangeOrderChoiceLocationAttributes.filter(x => x.action === 'Delete');

		deletedAttributes.forEach(attr =>
		{
			const deletedAttribute = jcLocation.jobChoiceLocationAttributes.findIndex(
				d => d.attributeGroupCommunityId === attr.attributeGroupCommunityId && d.attributeCommunityId === attr.attributeCommunityId);

			if (deletedAttribute > -1)
			{
				jcLocation.jobChoiceLocationAttributes.splice(deletedAttribute, 1);
			}
		});

		const addedAttributes = cocLocation.jobChangeOrderChoiceLocationAttributes.filter(x => x.action === 'Add');

		addedAttributes.forEach(attr =>
		{
			jcLocation.jobChoiceLocationAttributes.push(
				new JobChoiceAttribute(<JobChoiceAttribute>{
					attributeCommunityId: attr.attributeCommunityId,
					attributeGroupCommunityId: attr.attributeGroupCommunityId,
					id: attr.id,
					attributeGroupLabel: attr.attributeGroupLabel,
					attributeName: attr.attributeName,
					manufacturer: attr.manufacturer,
					sku: attr.sku
				})
			);
		});
	}
	
	getSelectedHanding(job: Job): ChangeOrderHanding
	{
		let handing = new ChangeOrderHanding();
		handing.handing = job.handing;
		const changeOrderGroup = job.changeOrderGroups.find(x =>
			x.salesStatusDescription !== 'Approved'
			&& x.salesStatusDescription !== 'Withdrawn'
			&& x.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === 'Handing' || co.jobChangeOrderTypeDescription === 'HomesiteTransfer'));

		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const handingChangeOrder = changeOrderGroup.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'Handing' || co.jobChangeOrderTypeDescription === 'HomesiteTransfer');

			if (handingChangeOrder)
			{
				const addHanding = handingChangeOrder.jobChangeOrderHandings.find(x => x.action === 'Add');

				if (addHanding)
				{
					handing = addHanding;
				}
				else
				{
					const deleteHanding = handingChangeOrder.jobChangeOrderHandings.find(x => x.action === 'Delete');

					if (deleteHanding && handing.handing === deleteHanding.handing)
					{
						handing = null;
					}
				}
			}
		}

		return handing;
	}

	getSelectedPlan(job: Job): number
	{
		let planId = job.planId;
		const changeOrderGroup = job.changeOrderGroups.find(x =>
			x.salesStatusDescription !== 'Approved'
			&& x.salesStatusDescription !== 'Withdrawn'
			&& x.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === 'Plan'));

		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const planChangeOrder = changeOrderGroup.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'Plan');

			if (planChangeOrder)
			{
				const addPlan = planChangeOrder.jobChangeOrderPlans.find(x => x.action === 'Add');

				if (addPlan)
				{
					planId = addPlan.planCommunityId;
				}
			}
		}

		return planId;
	}

	getSelectedLot(job: Job): number
	{
		let lotId = job.lotId;
		const changeOrderGroup = job.changeOrderGroups.find(x =>
			x.salesStatusDescription !== 'Approved'
			&& x.salesStatusDescription !== 'Withdrawn'
			&& x.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === 'HomesiteTransfer'));

		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const lotTransferChangeOrder = changeOrderGroup.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'HomesiteTransfer');

			if (lotTransferChangeOrder)
			{
				const addLot = lotTransferChangeOrder.jobChangeOrderLots.find(x => x.action === 'Add');

				if (addLot)
				{
					lotId = addLot.lotId;
				}
			}
		}

		return lotId;
	}

	getCurrentChangeOrder(changeOrderGroups: Array<ChangeOrderGroup>): ChangeOrderGroup
	{
		let pendingChangeOrderGroups = changeOrderGroups.filter(co => ['Withdrawn', 'Resolved'].indexOf(co.salesStatusDescription) === -1 && (co.salesStatusDescription !== 'Approved' || co.constructionStatusDescription === 'Pending'));

		//this should change or go away afer we're only dealing with one type of change order
		let jobChangeOrderGroup = pendingChangeOrderGroups.find(co =>
			co.jobChangeOrders && co.jobChangeOrders.length &&
			['ChoiceAttribute', 'Elevation', 'Handing', 'SalesJIO', 'SpecJIO'].indexOf(co.jobChangeOrders[0].jobChangeOrderTypeDescription) !== -1);

		if (!jobChangeOrderGroup && pendingChangeOrderGroups.length)
		{
			jobChangeOrderGroup = pendingChangeOrderGroups[0];
		}

		return jobChangeOrderGroup;
	}

	// Return change order choices from both the ChoiceAttribute change order and the Elevation change order
	getJobChangeOrderChoices(changeOrderGroups: Array<ChangeOrderGroup>): Array<ChangeOrderChoice>
	{
		let jobChangeOrderChoices = [];

		changeOrderGroups.forEach(changeOrderGroup =>
		{
			if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
			{
				const salesJIOChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'SalesJIO');

				if (salesJIOChangeOrder)
				{
					jobChangeOrderChoices = [...jobChangeOrderChoices, ...salesJIOChangeOrder.jobChangeOrderChoices];
				}

				const choiceChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'ChoiceAttribute');

				if (choiceChangeOrder)
				{
					jobChangeOrderChoices = [...jobChangeOrderChoices, ...choiceChangeOrder.jobChangeOrderChoices];
				}

				const elevationChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'Elevation');

				if (elevationChangeOrder)
				{
					jobChangeOrderChoices = [...jobChangeOrderChoices, ...elevationChangeOrder.jobChangeOrderChoices];
				}

				const planChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'Plan');

				if (planChangeOrder)
				{
					jobChangeOrderChoices = [...jobChangeOrderChoices, ...planChangeOrder.jobChangeOrderChoices];
				}
			}
		})

		return jobChangeOrderChoices;
	}

	// Return change order plan options from both the ChoiceAttribute change order and the Elevation change order
	getJobChangeOrderPlanOptions(changeOrderGroup: ChangeOrderGroup): Array<ChangeOrderPlanOption>
	{
		let jobChangeOrderPlanOptions = [];

		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const jioChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'SalesJIO');

			if (jioChangeOrder)
			{
				jobChangeOrderPlanOptions = [...jioChangeOrder.jobChangeOrderPlanOptions];
			}

			const choiceChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'ChoiceAttribute');

			if (choiceChangeOrder)
			{
				jobChangeOrderPlanOptions = [...choiceChangeOrder.jobChangeOrderPlanOptions];
			}

			const elevationChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'Elevation');

			if (elevationChangeOrder)
			{
				jobChangeOrderPlanOptions = [...jobChangeOrderPlanOptions, ...elevationChangeOrder.jobChangeOrderPlanOptions];
			}
		}

		return jobChangeOrderPlanOptions;
	}
}

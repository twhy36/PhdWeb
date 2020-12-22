import { Observable } from 'rxjs/Observable';
import { switchMap, catchError, map, combineLatest, tap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';

import * as _ from 'lodash';
import * as moment from "moment";

import {
	findChoice, DesignToolAttribute, JobChoice, JobPlanOption, JobChoiceAttribute, JobChoiceLocation, Job, 
	ChangeOrderGroup, ChangeOrderChoice, ChangeOrderPlanOption, ChangeOrderChoiceAttribute, ChangeOrderChoiceLocation,
	PlanOption, PointStatus, ConstructionStageTypes, Tree, Choice, DecisionPoint, MappedAttributeGroup, MappedLocationGroup
} from 'phd-common';

import { TreeService } from '../../core/services/tree.service';

export function isJobChoice(choice: JobChoice | ChangeOrderChoice): choice is JobChoice
{
	return (<any>choice).action === undefined;
}

export function isJobPlanOption(option: JobPlanOption | ChangeOrderPlanOption): option is JobPlanOption
{
	return (<any>option).action === undefined;
}

function getOptions(newChoice: any, treeChoices: Choice[]): string[]
{
	return newChoice.dpChoice_OptionRuleAssoc.filter(optRule =>
	{
		return optRule.mustHave && optRule.optionRule.dpChoice_OptionRuleAssoc.every(assoc =>
		{
			let treeChoice = treeChoices.find(c => c.id === assoc.dpChoiceID);
			return (assoc.mustHave && treeChoice && treeChoice.quantity > 0) || (!assoc.mustHave && (!treeChoice || treeChoice.quantity === 0));
		})
	}).map(optRule => optRule.optionRule.planOption.integrationKey)
}

function mapLocation(loc: JobChoiceLocation | ChangeOrderChoiceLocation): DesignToolAttribute
{
	return <DesignToolAttribute>{
		locationGroupId: loc.locationGroupCommunityId,
		locationGroupLabel: loc.locationGroupLabel,
		locationId: loc.locationCommunityId,
		locationName: loc.locationName,
		locationQuantity: loc.quantity
	};
}

function mapAttribute(attr: JobChoiceAttribute | ChangeOrderChoiceAttribute): DesignToolAttribute
{
	return <DesignToolAttribute>{
		attributeGroupId: attr.attributeGroupCommunityId,
		attributeGroupLabel: attr.attributeGroupLabel,
		attributeId: attr.attributeCommunityId,
		attributeName: attr.attributeName,
		manufacturer: attr.manufacturer,
		sku: attr.sku
	};
}

function mapLocationAttribute(attr: JobChoiceAttribute | ChangeOrderChoiceAttribute, loc: JobChoiceLocation | ChangeOrderChoiceLocation)
{
	return <DesignToolAttribute>{
		attributeGroupId: attr.attributeGroupCommunityId,
		attributeGroupLabel: attr.attributeGroupLabel,
		attributeId: attr.attributeCommunityId,
		attributeName: attr.attributeName,
		manufacturer: attr.manufacturer,
		sku: attr.sku,
		locationGroupId: loc.locationGroupCommunityId,
		locationGroupLabel: loc.locationGroupLabel,
		locationId: loc.locationCommunityId,
		locationName: loc.locationName,
		locationQuantity: loc.quantity,
		scenarioChoiceLocationAttributeId: attr.attributeCommunityId,
		scenarioChoiceLocationId: loc.locationCommunityId
	};
}

export function mapAttributes(choice: JobChoice | ChangeOrderChoice): Array<DesignToolAttribute>
{
	let result: Array<DesignToolAttribute> = [];
	let locations: Array<JobChoiceLocation | ChangeOrderChoiceLocation>;
	let attributes: Array<JobChoiceAttribute | ChangeOrderChoiceAttribute>;

	if (isJobChoice(choice))
	{
		locations = choice.jobChoiceLocations;
		attributes = choice.jobChoiceAttributes;
	}
	else
	{
		locations = choice.jobChangeOrderChoiceLocations;
		attributes = choice.jobChangeOrderChoiceAttributes;
	}

	locations && locations.forEach(loc =>
	{
		let locationAttributes = loc instanceof JobChoiceLocation ? loc.jobChoiceLocationAttributes : loc.jobChangeOrderChoiceLocationAttributes;

		if (locationAttributes && locationAttributes.length)
		{
			locationAttributes.forEach(attr =>
			{
				result.push(mapLocationAttribute(attr, loc));
			});
		}
		else
		{
			result.push(mapLocation(loc));
		}
	});

	attributes && attributes.forEach(attr =>
	{
		result.push(mapAttribute(attr));
	});

	return result;
}

function isLocked(changeOrder: ChangeOrderGroup): (choice: JobChoice | ChangeOrderChoice) => boolean
{
	return (choice: JobChoice | ChangeOrderChoice) => isJobChoice(choice) || (!!changeOrder && ['Pending', 'Withdrawn'].indexOf(changeOrder.salesStatusDescription) === -1);
}

function isOptionLocked(changeOrder: ChangeOrderGroup): (option: JobPlanOption | ChangeOrderPlanOption) => boolean
{
	return (option: JobPlanOption | ChangeOrderPlanOption) => isJobPlanOption(option) || (!!changeOrder && ['Pending', 'Withdrawn'].indexOf(changeOrder.salesStatusDescription) === -1);
}

function saveLockedInChoices(choices: Array<JobChoice | ChangeOrderChoice>, treeChoices: Choice[], changeOrder?: ChangeOrderGroup)
{
	choices.filter(isLocked(changeOrder)).forEach(choice =>
	{
		let treeChoice = treeChoices.find(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId);

		if (treeChoice)
		{
			treeChoice.lockedInChoice = choice;
			treeChoice.mappedAttributeGroups = (isJobChoice(choice)
					? _.uniq(choice.jobChoiceAttributes.map(jca => jca.attributeGroupCommunityId))
					: _.uniq(choice.jobChangeOrderChoiceAttributes.map(coca => coca.attributeGroupCommunityId))
				).map(att => new MappedAttributeGroup({ id: att }));
			treeChoice.mappedLocationGroups = (isJobChoice(choice)
					? _.uniq(choice.jobChoiceLocations.map(jcl => jcl.locationGroupCommunityId))
					: _.uniq(choice.jobChangeOrderChoiceLocations.map(cocl => cocl.locationGroupCommunityId))
				).map(loc => new MappedLocationGroup({ id: loc }));
		}
	});
}

export function mergeIntoTree<T extends { tree: Tree, options: PlanOption[] }>(choices: Array<JobChoice | ChangeOrderChoice>, options: Array<JobPlanOption | ChangeOrderPlanOption>, treeService: TreeService, changeOrder?: ChangeOrderGroup): (source: Observable<T>) => Observable<T>
{
	return (source: Observable<T>) => source.pipe(
		switchMap(data =>
		{
			let currentSubgroups = _.flatMap(data.tree.treeVersion.groups, g => g.subGroups);
			let currentPoints = _.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
			let currentChoices = _.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));

			if (choices)
			{
				let missingChoices = [];

				//find previosly selected choices which are no longer in the tree
				choices.filter(isLocked(changeOrder)).forEach(choice =>
				{
					let existingChoice = currentChoices.find(c => c.divChoiceCatalogId === choice.divChoiceCatalogId);

					if (!existingChoice)
					{
						missingChoices.push(choice.dpChoiceId);
					}
				});

				if (missingChoices.length)
				{
					return treeService.getChoiceDetails(missingChoices).pipe(map(response =>
					{
						choices.forEach(choice =>
						{
							let ch = response.find(r => r.dpChoiceID === choice.dpChoiceId);

							if (ch)
							{
								let point = currentPoints.find(p => p.divPointCatalogId === ch.dPoint.divDPointCatalogID);
								//get a list of all the original mapped options for the choice
								let opt = getOptions(ch, currentChoices).map(o1 =>
								{
									let option = options.find(o => o.integrationKey === o1);
									let newOption;

									if (option)
									{
										let qty = option instanceof JobPlanOption ? option.optionQty : option.qty;
										let attributeGroups = option instanceof JobPlanOption ? option.jobPlanOptionAttributes.map(att => att.attributeGroupCommunityId) : option.jobChangeOrderPlanOptionAttributes.map(att => att.attributeGroupCommunityId);
										let locationGroups = option instanceof JobPlanOption ? option.jobPlanOptionLocations.map(loc => loc.locationGroupCommunityId) : option.jobChangeOrderPlanOptionLocations.map(loc => loc.locationGroupCommunityId);

										let existingOption = data.options.find(o => o.financialOptionIntegrationKey === option.integrationKey);
										if (existingOption) {
											attributeGroups.push(...existingOption.attributeGroups.filter(ag => !attributeGroups.some(ag2 => ag2 === ag)));
										}

										newOption = <any>{
											attributeGroups: attributeGroups,
											locationGroups: locationGroups,
											calculatedPrice: option.listPrice * qty,
											listPrice: option.listPrice,
											id: option.planOptionId,
											maxOrderQuantity: qty,
											name: option.optionSalesName,
											description: option.optionDescription,
											financialOptionIntegrationKey: option.integrationKey
										};
									}

									return newOption;
								}).filter(o => !!o);

								let maxQuantity = 1;
								let choiceMaxQuantity = ch.choiceMaxQuantity as number;

								if (choiceMaxQuantity != null && opt.length > 0)
								{
									//If there is an option tied to a default choice and Choice Admin set - up a max quantity in the slide out panel, then the minimum quantity of the two will be used.
									maxQuantity = Math.min(opt[0].maxOrderQuantity, choiceMaxQuantity);
								}
								else if (choiceMaxQuantity != null)
								{
									maxQuantity = choiceMaxQuantity;
								}
								else if (opt.length > 0)
								{
									maxQuantity = opt[0].maxOrderQuantity;
								}

								let newChoice = <Choice>{
									divChoiceCatalogId: ch.divChoiceCatalogID,
									enabled: true,
									id: ch.dpChoiceID,
									imagePath: ch.imagePath,
									isDecisionDefault: ch.isDecisionDefault,
									isSelectable: true,
									sortOrder: ch.dpChoiceSortOrder,
									label: ch.divChoiceCatalog.choiceLabel,
									options: opt, //this is setting it to an empty array for some reason
									maxQuantity: maxQuantity, //max them out at what was previously selected
									quantity: choice.dpChoiceQuantity,
									treePointId: point ? point.id : ch.dPoint.dPointID,
									treeVersionId: ch.dTreeVersionID,
									selectedAttributes: mapAttributes(choice)
								};

								newChoice.price = newChoice.options.reduce((x, y) => x + y.listPrice, 0);

								if (point)
								{
									point.choices.push(newChoice);
								}
								else
								{
									let subgroup = currentSubgroups.find(sg => ch.dPoint.dSubGroup.dSubGroupCatalogID === sg.subGroupCatalogId);

									if (subgroup)
									{
										let newPoint = <DecisionPoint>{
											choices: [newChoice],
											completed: true,
											divPointCatalogId: ch.dPoint.divDPointCatalogID,
											enabled: true,
											id: ch.dPoint.dPointID,
											isQuickQuoteItem: ch.dPoint.divDPointCatalog.isQuickQuoteItem,
											isStructuralItem: ch.dPoint.divDPointCatalog.isStructuralItem,
											label: ch.dPoint.divDPointCatalog.dPointLabel,
											sortOrder: ch.dPoint.dPointSortOrder,
											status: PointStatus.COMPLETED,
											subGroupCatalogId: ch.dPoint.dSubGroup.dSubGroupCatalogID,
											subGroupId: ch.dPoint.dSubGroupID,
											treeVersionId: ch.dTreeVersionID,
											viewed: true
										};

										subgroup.points.push(newPoint);
									}
								}
							}
						});

						//save original locked in choice information on the tree
						saveLockedInChoices(choices,
							_.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))),
							changeOrder);

						return data;
					}));
				}
				else
				{
					saveLockedInChoices(choices, currentChoices, changeOrder);

					return of(data);
				}
			}

			return of(data);
		}),
		//update pricing information for locked-in options/choices
		map(data =>
		{
			//override option prices if prices are locked
			if (options)
			{
				options.filter(isOptionLocked(changeOrder)).forEach(option =>
				{
					let opt = data.options.find(o => o.financialOptionIntegrationKey === option.integrationKey);

					if (opt)
					{
						opt.listPrice = option.listPrice;
						opt.description = option.optionDescription;
						opt.name = option.optionSalesName;

						//add in missing attribute/location groups
						if (!opt.isBaseHouse) {
							if (isJobPlanOption(option)) {
								option.jobPlanOptionAttributes.forEach(jpoAtt => {
									if (!opt.attributeGroups.find(a => a === jpoAtt.attributeGroupCommunityId)) {
										opt.attributeGroups.push(jpoAtt.attributeGroupCommunityId);
									}
								})
								option.jobPlanOptionLocations.forEach(jpoLoc => {
									if (!opt.locationGroups.find(l => l === jpoLoc.locationGroupCommunityId)) {
										opt.locationGroups.push(jpoLoc.locationGroupCommunityId);
									}
								})
							} else {
								option.jobChangeOrderPlanOptionAttributes.forEach(jpoAtt => {
									if (!opt.attributeGroups.find(a => a === jpoAtt.attributeGroupCommunityId)) {
										opt.attributeGroups.push(jpoAtt.attributeGroupCommunityId);
									}
								})
								option.jobChangeOrderPlanOptionLocations.forEach(jpoLoc => {
									if (!opt.locationGroups.find(l => l === jpoLoc.locationGroupCommunityId)) {
										opt.locationGroups.push(jpoLoc.locationGroupCommunityId);
									}
								})
							}
						}
					}
				});
			}

			return data;
		}),
		//capture original option mappings for locked-in options/choices
		combineLatest(treeService.getHistoricOptionMapping(_.flatten(choices.map(c =>
		{
			if (isJobChoice(c))
			{
				return c.jobChoiceJobPlanOptionAssocs
					.filter(o => o.choiceEnabledOption)
					.map(o =>
					{
						return { optionNumber: options.find(opt => opt.id === o.jobPlanOptionId).integrationKey, dpChoiceId: c.dpChoiceId };
					});
			}
			else
			{
				return c.jobChangeOrderChoiceChangeOrderPlanOptionAssocs
					.filter(o => o.jobChoiceEnabledOption)
					.map(o =>
					{
						return { optionNumber: options.find(opt => opt.id === o.jobChangeOrderPlanOptionId).integrationKey, dpChoiceId: c.decisionPointChoiceID };
					});
			}
		})))),
		//store the original option mapping on the choice where it was selected
		//rules engine can use this to 'override' current option mappings
		map(([data, mapping]) =>
		{
			choices.filter(isLocked(changeOrder)).forEach(c =>
			{
				let choice = findChoice(data.tree, ch => ch.divChoiceCatalogId === c.divChoiceCatalogId);

				if (!!choice)
				{
					if (isJobChoice(c))
					{
						choice.lockedInOptions = c.jobChoiceJobPlanOptionAssocs.filter(o => o.choiceEnabledOption).map(o => mapping[options.find(opt => opt.id === o.jobPlanOptionId).integrationKey]);
					}
					else
					{
						choice.lockedInOptions = c.jobChangeOrderChoiceChangeOrderPlanOptionAssocs.filter(o => o.jobChoiceEnabledOption).map(o => mapping[options.find(opt => opt.id === o.jobChangeOrderPlanOptionId).integrationKey]);
					}
				}
			});

			return data;
		}),
		catchError(err => { console.error(err); return _throw(err); })
	);
}

/**
 * Checks to see if the point has passed it's cut-off period by checking the job Start Date or Construction Stage with the points Cut-off days or Stage
 * @param tree
 * @param job
 */
export function setTreePointsPastCutOff(tree: Tree, job: Job)
{
	let points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

	let jobStageId = job && job.constructionStageName != null ? ConstructionStageTypes[job.constructionStageName] : null;
	let jobStartDate = job ? job.startDate : null; // example: jobStartDate = 02/20/2019

	points.forEach(point =>
	{
		const pointStageId = point.edhConstructionStageId;
		const pointCutOffDays = point.cutOffDays; // example: pointCutOffDays = 10

		if (pointStageId != null || pointCutOffDays != null)
		{
			if (pointStageId != null && jobStageId != null)
			{
				// check if they have passed the stage cut off point 
				point.isPastCutOff = jobStageId >= pointStageId;
			}
			else if (pointCutOffDays != null && jobStartDate != null)
			{
				const now = moment(); // example: now = 02/27/2019
				const dateDiff = now.diff(jobStartDate, 'days'); // example: dateDiff = 7

				// check if they have passed the date cut off point.
				point.isPastCutOff = pointCutOffDays <= dateDiff; // example:  10 < 7 = False
			}
		}
	});
}

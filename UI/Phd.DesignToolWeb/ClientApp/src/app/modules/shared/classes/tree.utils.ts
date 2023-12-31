import { Observable } from 'rxjs/Observable';
import { switchMap, catchError, map, combineLatest, tap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';

import * as _ from 'lodash';
import * as moment from "moment";

import { Tree, Choice, DecisionPoint, MappedAttributeGroup, MappedLocationGroup } from '../models/tree.model.new';
import { JobChoice, JobPlanOption, JobChoiceAttribute, JobChoiceLocation, Job } from '../models/job.model';
import { PlanOption } from '../models/option.model';
import { ChangeOrderGroup, ChangeOrderChoice, ChangeOrderPlanOption, ChangeOrderChoiceAttribute, ChangeOrderChoiceLocation } from '../models/job-change-order.model';
import { TreeService } from '../../core/services/tree.service';
import { PointStatus, ConstructionStageTypes } from '../../shared/models/point.model';
import { LocationGroup, Location, AttributeGroup, Attribute, DesignToolAttribute } from '../models/attribute.model';
import { Scenario, SelectedChoice } from '../../shared/models/scenario.model';
import { TreeVersionRules } from '../../shared/models/rule.model.new';
import { applyRules, findChoice } from '../../shared/classes/rulesExecutor';

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

/**
 * Make sure the selected Attributes are still valid. Best ran after applying rules
 * @param choices
 */
export function checkSelectedAttributes(choices: Choice[])
{
	choices.forEach(choice =>
	{
		//if the choice is locked, we don't want to mess with attributes
		if (choice.lockedInChoice) {
			return;
		}

		if (choice.quantity === 0)
		{
			choice.selectedAttributes = [];
		}
		else if (choice.selectedAttributes.length > 0)
		{
			var selectedAttributes = [];
			let attributeGroups = choice.mappedAttributeGroups;
			let locationGroups = choice.mappedLocationGroups;

			if (attributeGroups && attributeGroups.length > 0 || locationGroups && locationGroups.length > 0)
			{
				// check selectedAttributes against the group lists
				selectedAttributes = getSelectedAttributes(locationGroups.map(x => x.id), attributeGroups.map(x => x.id), choice.selectedAttributes);
			}

			choice.selectedAttributes = selectedAttributes.filter(x => !!x);
		}
	});
}

function getSelectedAttributes(locationGroups: number[], attributeGroups: number[], selectedAttributes: DesignToolAttribute[])
{
	return selectedAttributes.map(sa =>
	{
		let hasAttribute = attributeGroups.length > 0 && attributeGroups.findIndex(x => x === sa.attributeGroupId) > -1;
		let hasLocation = locationGroups.length > 0 && locationGroups.findIndex(x => x === sa.locationGroupId) > -1

		return hasAttribute || hasLocation ? sa : null;
	});
}

export function mergeAttributes(attributes: Array<any>, missingAttributes: Array<DesignToolAttribute>, attributeGroups: Array<AttributeGroup>)
{
	const lastGroup = attributeGroups.length ? _.maxBy(attributeGroups, 'sortOrder') : null;
	let sortOrder = lastGroup ? lastGroup.sortOrder + 1 : 0;

	attributes.forEach(att =>
	{
		const choiceAttribute = missingAttributes.find(x => x.attributeId === att.id);

		if (choiceAttribute)
		{
			const newAttribute = att as Attribute;
			let choiceAttributeGroup = attributeGroups.find(x => x.id === choiceAttribute.attributeGroupId);

			if (choiceAttributeGroup)
			{
				// add the missing attribute
				if (!choiceAttributeGroup.attributes)
				{
					choiceAttributeGroup.attributes = [];
				}

				choiceAttributeGroup.attributes.push(newAttribute);
			}
			else if (att.attributeGroups)
			{
				// add the missing attribute and the attribute group
				let newAttributeGroup = att.attributeGroups.find(x => x.id === choiceAttribute.attributeGroupId);

				if (newAttributeGroup)
				{
					newAttributeGroup.sortOrder = sortOrder++;
					newAttributeGroup.attributes.push(newAttribute);
					attributeGroups.push(newAttributeGroup);
				}
			}
		}
	});
}

export function mergeLocations(locations: Array<any>, missingLocations: Array<DesignToolAttribute>, locationGroups: Array<LocationGroup>)
{
	locations.forEach(loc =>
	{
		const choiceAttribute = missingLocations.find(x => x.locationId === loc.id);

		if (choiceAttribute)
		{
			const newLocation = loc as Location;
			let choiceLocationGroup = locationGroups.find(x => x.id === choiceAttribute.locationGroupId);

			if (choiceLocationGroup)
			{
				// add the missing location
				if (!choiceLocationGroup.locations)
				{
					choiceLocationGroup.locations = [];
				}

				choiceLocationGroup.locations.push(newLocation);
			}
			else if (loc.locationGroups)
			{
				// add the missing location and the location group
				let newLocationGroup = loc.locationGroups.find(x => x.id === choiceAttribute.locationGroupId);

				if (newLocationGroup)
				{
					newLocationGroup.locations.push(newLocation);
					locationGroups.push(newLocationGroup);
				}
			}
		}
	});
}

export function updateWithNewTreeVersion<T extends { tree: Tree, rules: TreeVersionRules, options: PlanOption[] }>(scenario: Scenario, treeService: TreeService): (source: Observable<T>) => Observable<T & { selectedChoices: SelectedChoice[] }>
{
	return (source: Observable<T>) =>
	{
		if (!scenario.originalTreeVersionId || scenario.treeVersionId === scenario.originalTreeVersionId)
		{
			return source.pipe(
				map(data => Object.assign({}, data, { selectedChoices: scenario.scenarioChoices }))
			);
		}
		else
		{
			return source.pipe(
				combineLatest(treeService.getTree(scenario.originalTreeVersionId), treeService.getRules(scenario.originalTreeVersionId)),
				map(([data, origTree, origRules]: [T, Tree, TreeVersionRules]) =>
				{
					let newTree = _.cloneDeep(data.tree);
					let newTreeChoices = _.flatMap(newTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
					let origTreeChoices = _.flatMap(origTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));

					scenario.scenarioChoices.forEach(choice =>
					{
						let c1 = newTreeChoices.find(c => c.divChoiceCatalogId === choice.choice.choiceCatalogId);
						let c2 = origTreeChoices.find(c => c.divChoiceCatalogId === choice.choice.choiceCatalogId);

						if (c1)
						{
							c1.quantity = 1;
						}

						if (c2)
						{
							c2.quantity = 1;
						}
					});

					applyRules(newTree, data.rules, data.options);
					applyRules(origTree, origRules, data.options);

					//compare old and new choices, and remove anything that no longer exists, is no longer selected, or has different options
					let selectedChoices = scenario.scenarioChoices.filter(c =>
					{
						let nc = newTreeChoices.find(c1 => c1.divChoiceCatalogId === c.choice.choiceCatalogId && c1.quantity > 0);
						let oc = origTreeChoices.find(c2 => c2.divChoiceCatalogId === c.choice.choiceCatalogId && c2.quantity > 0);

						return !!nc && !!oc && (nc.options || []).every(o1 => (oc.options || []).findIndex(o2 => o2.financialOptionIntegrationKey === o1.financialOptionIntegrationKey) !== -1)
							&& (oc.options || []).every(o1 => (nc.options || []).findIndex(o2 => o2.financialOptionIntegrationKey === o1.financialOptionIntegrationKey) !== -1);
					});

					if (selectedChoices.length > 0)
					{
						let newSubGroups = _.flatMap(newTree.treeVersion.groups, g => g.subGroups);
						let newPoints = _.flatMap(newSubGroups, sg => sg.points);
						let newChoices = _.flatMap(newPoints, p => p.choices);

						let oldSubGroups = _.flatMap(origTree.treeVersion.groups, g => g.subGroups);
						let oldPoints = _.flatMap(oldSubGroups, sg => sg.points);
						let oldChoices = _.flatMap(oldPoints, p => p.choices);

						// filter out any rule that didn't have anything to do with attribute reassignment
						let oldOptionRules = origRules.optionRules.filter(or => or.choices.find(c => c.attributeReassignments.length > 0) !== null);
						let oldOptionRuleChoices = _.flatMap(oldOptionRules, r => r.choices);

						let newOptionRules = data.rules.optionRules.filter(or => or.choices.find(c => c.attributeReassignments.length > 0) !== null);
						let newOptionRuleChoices = _.flatMap(newOptionRules, r => r.choices);

						selectedChoices.forEach(selectedChoice =>
						{
							let newChoice = newChoices.find(x => x.id === selectedChoice.choiceId);
							let lostAttributes = selectedChoice.selectedAttributes.filter(sa => newChoice.mappedAttributeGroups.findIndex(ag => ag.id === sa.attributeGroupId) === -1);

							if (lostAttributes.length > 0)
							{
								lostAttributes.forEach(attribute =>
								{
									let oldChoice = oldChoices.find(c => c.divChoiceCatalogId === newChoice.divChoiceCatalogId);

									// if it was a reassignment in its past life
									let oldOptionRuleChoice = oldOptionRuleChoices.find(c => c.attributeReassignments.length > 0 && c.attributeReassignments.findIndex(ar => ar.attributeGroupId === attribute.attributeGroupId && ar.choiceId === oldChoice.id) > -1);

									if (oldOptionRuleChoice != null)
									{
										// get the old choice parent
										let oldParentChoice = oldChoices.find(c => c.id === oldOptionRuleChoice.id);
										// so we can find the new choice parent
										let newParentChoice = newChoices.find(c => c.divChoiceCatalogId === oldParentChoice.divChoiceCatalogId);
										// then we can get the new selected choice
										let newSelectedChoiceParent = selectedChoices.find(c => c.choiceId === newParentChoice.id);

										// Add the selected attribute back to its original location before the reassignment
										newSelectedChoiceParent.selectedAttributes.push(attribute);

										const index = selectedChoice.selectedAttributes.indexOf(attribute);

										// remove the reassigned attribute
										selectedChoice.selectedAttributes.splice(index, 1);
									}
									else
									{
										// if it wasn't a reassignment but now is
										let optionRuleChoice = newOptionRuleChoices.find(c => c.id === newChoice.id && c.attributeReassignments.length > 0 && c.attributeReassignments.findIndex(ar => ar.attributeGroupId === attribute.attributeGroupId) > -1);

										if (optionRuleChoice != null)
										{
											// find the reassignment rule
											let attributeReassignment = optionRuleChoice.attributeReassignments.filter(ar => ar.attributeGroupId === attribute.attributeGroupId);

											if (attributeReassignment.length > 0)
											{
												// should be just the one record but lets loop anyways
												attributeReassignment.forEach(ar =>
												{
													// find the reassigned choice if available
													let newSelectedChoice = selectedChoices.find(c => c.choiceId === ar.choiceId);

													// the reassigned choice might not have been selected so we'll just drop the selection
													if (newSelectedChoice != null)
													{
														// Add the attribute to its reassigned choice
														newSelectedChoice.selectedAttributes.push(attribute);
													}
												});

												const index = selectedChoice.selectedAttributes.indexOf(attribute);

												// remove the attribute from its original choice
												selectedChoice.selectedAttributes.splice(index, 1);
											}
										}
									}
								});
							}
						});
					}

					return Object.assign({}, data, { selectedChoices });
				}),

				//if pick type goes from "or more" to 0/1, and more than one choice was selected, remove
				//all choices
				tap(data =>
				{
					let newTreePoints = _.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

					data.selectedChoices = data.selectedChoices.filter(sc =>
					{
						let pt = newTreePoints.find(p => p.choices.some(ch => ch.id === sc.choiceId));

						if (pt)
						{
							return pt.pointPickTypeId >= 3 || pt.choices.every(ch => ch.id === sc.choiceId || !data.selectedChoices.some(c => c.choiceId === ch.id));
						}
						else
						{
							return false; //should never happen
						}
					});
				}),
			);
		}
	};
}

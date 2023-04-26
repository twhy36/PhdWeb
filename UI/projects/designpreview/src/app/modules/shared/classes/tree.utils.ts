import { Observable, of, combineLatest, throwError } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';

import * as _ from 'lodash';
import * as moment from 'moment';

import
{
	findChoice, DesignToolAttribute, JobChoice, JobPlanOption, JobChoiceAttribute, JobChoiceLocation, Job,
	ChangeOrderGroup, ChangeOrderChoice, ChangeOrderPlanOption, ChangeOrderChoiceAttribute, ChangeOrderChoiceLocation,
	PlanOption, PointStatus, ConstructionStageTypes, Tree, Choice, DecisionPoint, MappedAttributeGroup, MappedLocationGroup,
	AttributeGroup, AttributeCommunityImageAssoc, Location, LocationGroup, OptionImage, ChoiceRules, PointRules,
	Group, SubGroup, OptionRule, MyFavoritesChoice
} from 'phd-common';

import { TreeService } from '../../core/services/tree.service';
import { AttributeExt } from '../models/attribute-ext.model';

export function isJobChoice(choice: JobChoice | ChangeOrderChoice): choice is JobChoice
{
	return (choice as ChangeOrderChoice).action === undefined;
}

export function isJobPlanOption(option: JobPlanOption | ChangeOrderPlanOption): option is JobPlanOption
{
	return (option as ChangeOrderPlanOption).action === undefined;
}

export function isChangeOrderChoice(choice: JobChoice | ChangeOrderChoice | MyFavoritesChoice): choice is ChangeOrderChoice
{
	return (choice as ChangeOrderChoice).action !== undefined;
}

function getOptions(choice: JobChoice | ChangeOrderChoice, options: (JobPlanOption | ChangeOrderPlanOption)[]): (JobPlanOption | ChangeOrderPlanOption)[]
{
	return isJobChoice(choice)
		? choice.jobChoiceJobPlanOptionAssocs.filter(a => a.choiceEnabledOption).map(a => options.find(o => isJobPlanOption(o) && o.id === a.jobPlanOptionId))
		: choice.jobChangeOrderChoiceChangeOrderPlanOptionAssocs.filter(a => a.jobChoiceEnabledOption).map(a => options.find(o => !isJobPlanOption(o) && o.id === a.jobChangeOrderPlanOptionId));
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
	const result: Array<DesignToolAttribute> = [];
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
		const locationAttributes = loc instanceof JobChoiceLocation ? loc.jobChoiceLocationAttributes : loc.jobChangeOrderChoiceLocationAttributes;

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

export function isLocked(changeOrder: ChangeOrderGroup): (choice: JobChoice | ChangeOrderChoice) => boolean
{
	return (choice: JobChoice | ChangeOrderChoice) => isJobChoice(choice) || (!!changeOrder && ['Pending', 'Withdrawn'].indexOf(changeOrder.salesStatusDescription) === -1);
}

function isOptionLocked(changeOrder: ChangeOrderGroup): (option: JobPlanOption | ChangeOrderPlanOption) => boolean
{
	return (option: JobPlanOption | ChangeOrderPlanOption) => isJobPlanOption(option) || (!!changeOrder && ['Pending', 'Withdrawn'].indexOf(changeOrder.salesStatusDescription) === -1);
}

export function getDefaultOptionRule(optionNumber: string, choice: Choice): OptionRule
{
	return <OptionRule>{
		optionId: optionNumber, choices: [
			{
				id: choice.divChoiceCatalogId,
				mustHave: true,
				attributeReassignments: []
			}
		],
		ruleId: 0, replaceOptions: []
	};
}

function saveLockedInChoices(choices: Array<JobChoice | ChangeOrderChoice>, treeChoices: Choice[], options: Array<JobPlanOption | ChangeOrderPlanOption>, changeOrder?: ChangeOrderGroup)
{
	choices.filter(isLocked(changeOrder)).forEach(choice =>
	{
		const treeChoice = treeChoices.find(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId);

		if (treeChoice)
		{
			treeChoice.lockedInChoice = getLockedInChoice(choice, options);
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

export function mergeIntoTree<T extends { tree: Tree, options: PlanOption[], images?: OptionImage[] }>(choices: Array<JobChoice | ChangeOrderChoice>, options: Array<JobPlanOption | ChangeOrderPlanOption>, treeService: TreeService, changeOrder?: ChangeOrderGroup, lockPricing: boolean = true): (source: Observable<T>) => Observable<T>
{
	return (source: Observable<T>) => combineLatest([
		source.pipe(
			switchMap(data =>
			{
				const currentSubgroups = _.flatMap(data.tree.treeVersion.groups, g => g.subGroups);
				const currentPoints = _.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
				const currentChoices = _.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));

				if (choices)
				{
					const missingChoices = [];

					//find previosly selected choices which are no longer in the tree
					choices.filter(isLocked(changeOrder)).forEach(choice =>
					{
						const existingChoice = currentChoices.find(c => c.divChoiceCatalogId === choice.divChoiceCatalogId);

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
								const ch = response.find(r => r.dpChoiceID === choice.dpChoiceId);

								if (ch)
								{
									const point = currentPoints.find(p => p.divPointCatalogId === ch.dPoint.divDPointCatalogID);

									// get a list of all the original mapped options for the choice
									const opt = getOptions(choice, options).map(option =>
									{
										if (option)
										{
											const qty = option instanceof JobPlanOption ? option.optionQty : option.qty;
											const attributeGroups = option instanceof JobPlanOption ? option.jobPlanOptionAttributes.map(att => att.attributeGroupCommunityId) : option.jobChangeOrderPlanOptionAttributes.map(att => att.attributeGroupCommunityId);
											const locationGroups = option instanceof JobPlanOption ? option.jobPlanOptionLocations.map(loc => loc.locationGroupCommunityId) : option.jobChangeOrderPlanOptionLocations.map(loc => loc.locationGroupCommunityId);

											const existingOption = data.options.find(o => o.financialOptionIntegrationKey === option.integrationKey);

											if (existingOption)
											{
												attributeGroups.push(...existingOption.attributeGroups.filter(ag => !attributeGroups.some(ag2 => ag2 === ag)));
											}

											return {
												attributeGroups: attributeGroups,
												locationGroups: locationGroups,
												calculatedPrice: option.listPrice * qty,
												listPrice: option.listPrice,
												id: option.planOptionId,
												isActive: existingOption?.isActive || false,
												maxOrderQuantity: qty,
												name: option.optionSalesName,
												description: option.optionDescription,
												financialOptionIntegrationKey: option.integrationKey
											} as PlanOption;
										}
										else
										{
											return null;
										}
									}).filter(o => !!o);

									let maxQuantity = 1;
									const choiceMaxQuantity = ch.maxQuantity as number;

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

									let newChoice = new Choice();

									newChoice = {
										...newChoice,
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

									newChoice.price = choice.dpChoiceCalculatedPrice;

									if (point)
									{
										point.choices.push(newChoice);
									}
									else
									{
										const subgroup = currentSubgroups.find(sg => ch.dPoint.dSubGroup.dSubGroupCatalogID === sg.subGroupCatalogId);

										if (subgroup)
										{
											const newPoint = <DecisionPoint>{
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
										else
										{
											const group = data.tree.treeVersion.groups.find(g => ch.dPoint.dSubGroup.dGroup.dGroupCatalogID === g.groupCatalogId);

											if (group)
											{
												const newSubGroup = <SubGroup>{
													groupId: ch.dPoint.dSubGroup.dGroup.dGroupID,
													id: ch.dPoint.dSubGroupID,
													label: ch.dPoint.dSubGroup.dSubGroupCatalog.dSubGroupLabel,
													points: [<DecisionPoint>{
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
													}],
													sortOrder: ch.dPoint.dSubGroup.dSubGroupSortOrder,
													status: PointStatus.COMPLETED,
													subGroupCatalogId: ch.dPoint.dSubGroup.dSubGroupCatalogID,
													treeVersionId: ch.dTreeVersionID,
													useInteractiveFloorplan: false
												};

												group.subGroups.push(newSubGroup);
											}
											else
											{
												const newGroup = <Group>{
													groupCatalogId: ch.dPoint.dSubGroup.dGroup.dGroupCatalogID,
													id: ch.dPoint.dSubGroup.dGroup.dGroupID,
													label: ch.dPoint.dSubGroup.dGroup.dGroupCatalog.dGroupLabel,
													sortOrder: ch.dPoint.dSubGroup.dGroup.dGroupSortOrder,
													status: PointStatus.COMPLETED,
													subGroups: [{
														groupId: ch.dPoint.dSubGroup.dGroup.dGroupID,
														id: ch.dPoint.dSubGroupID,
														label: ch.dPoint.dSubGroup.dSubGroupCatalog.dSubGroupLabel,
														points: [<DecisionPoint>{
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
														}],
														sortOrder: ch.dPoint.dSubGroup.dSubGroupSortOrder,
														status: PointStatus.COMPLETED,
														subGroupCatalogId: ch.dPoint.dSubGroup.dSubGroupCatalogID,
														treeVersionId: ch.dTreeVersionID,
														useInteractiveFloorplan: false
													}],
													treeVersionId: ch.dTreeVersionID
												};

												data.tree.treeVersion.groups.splice(data.tree.treeVersion.groups.findIndex(g => g.sortOrder > newGroup.sortOrder), 0, newGroup);
											}
										}
									}
								}
							});

							//save original locked in choice information on the tree
							saveLockedInChoices(choices,
								_.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))),
								options,
								changeOrder);

							return data;
						}));
					}
					else
					{
						saveLockedInChoices(choices, currentChoices, options, changeOrder);

						return of(data);
					}
				}

				return of(data);
			})
		),
		treeService.getPlanOptionCommunityImageAssoc(options.filter(o => o.outForSignatureDate !== undefined)),

		//capture original option mappings for locked-in options/choices
		treeService.getHistoricOptionMapping(_.flatten(choices.map(c =>
		{
			if (isJobChoice(c))
			{
				return c.jobChoiceJobPlanOptionAssocs
					.filter(o => o.choiceEnabledOption)
					.map(o =>
					{
						return { optionNumber: options.find(opt => opt.id === o.jobPlanOptionId)?.integrationKey, dpChoiceId: c.dpChoiceId };
					});
			}
			else
			{
				return c.jobChangeOrderChoiceChangeOrderPlanOptionAssocs
					.filter(o => o.jobChoiceEnabledOption)
					.map(o =>
					{
						return { optionNumber: options.find(opt => opt.id === o.jobChangeOrderPlanOptionId)?.integrationKey, dpChoiceId: c.decisionPointChoiceID };
					});
			}
		})))
	]).pipe(
		//update pricing information for locked-in options/choices
		map(([res, optImageAssoc, mapping]) =>
		{
			//override option prices if prices are locked
			if (options.length)
			{
				options.filter(isOptionLocked(changeOrder)).forEach(option =>
				{
					const opt = res.options.find(o => o.financialOptionIntegrationKey === option.integrationKey);

					if (opt)
					{
						opt.listPrice = lockPricing ? option.listPrice : opt.listPrice;
						opt.description = option.optionDescription;
						opt.name = option.optionSalesName;

						const existingAssoc = optImageAssoc ? optImageAssoc.filter(optImage => optImage.planOptionCommunityId === opt.id) : [];

						if (existingAssoc.length && res.images)
						{
							res.images = [...res.images.filter(o => o.integrationKey !== opt.financialOptionIntegrationKey), ...existingAssoc.map(i => ({ integrationKey: opt.financialOptionIntegrationKey, imageURL: i.imageUrl, sortKey: i.sortOrder }))];
						}

						//add in missing attribute/location groups
						if (!opt.isBaseHouse)
						{
							if (isJobPlanOption(option))
							{
								option.jobPlanOptionAttributes.forEach(jpoAtt =>
								{
									if (!opt.attributeGroups.find(a => a === jpoAtt.attributeGroupCommunityId))
									{
										opt.attributeGroups.push(jpoAtt.attributeGroupCommunityId);
									}
								});

								option.jobPlanOptionLocations.forEach(jpoLoc =>
								{
									if (!opt.locationGroups.find(l => l === jpoLoc.locationGroupCommunityId))
									{
										opt.locationGroups.push(jpoLoc.locationGroupCommunityId);
									}
								});
							}
							else
							{
								option.jobChangeOrderPlanOptionAttributes.forEach(jpoAtt =>
								{
									if (!opt.attributeGroups.find(a => a === jpoAtt.attributeGroupCommunityId))
									{
										opt.attributeGroups.push(jpoAtt.attributeGroupCommunityId);
									}
								});

								option.jobChangeOrderPlanOptionLocations.forEach(jpoLoc =>
								{
									if (!opt.locationGroups.find(l => l === jpoLoc.locationGroupCommunityId))
									{
										opt.locationGroups.push(jpoLoc.locationGroupCommunityId);
									}
								});
							}
						}
					}
				});
			}

			return { res, mapping };
		}),
		//store the original option mapping on the choice where it was selected
		//rules engine can use this to 'override' current option mappings
		map(data =>
		{
			choices.filter(isLocked(changeOrder)).forEach(c =>
			{
				const choice = findChoice(data.res.tree, ch => ch.divChoiceCatalogId === c.divChoiceCatalogId);

				if (!!choice)
				{
					if (isJobChoice(c))
					{
						choice.lockedInOptions = c.jobChoiceJobPlanOptionAssocs?.filter(o => o.choiceEnabledOption)?.map(o => data.mapping[options.find(opt => opt.id === o.jobPlanOptionId)?.integrationKey] || getDefaultOptionRule(options.find(opt => opt.id === o.jobPlanOptionId)?.integrationKey, choice));
					}
					else
					{
						choice.lockedInOptions = c.jobChangeOrderChoiceChangeOrderPlanOptionAssocs?.filter(o => o.jobChoiceEnabledOption)?.map(o => data.mapping[options.find(opt => opt.id === o.jobChangeOrderPlanOptionId)?.integrationKey] || getDefaultOptionRule(options.find(opt => opt.id === o.jobChangeOrderPlanOptionId)?.integrationKey, choice));
					}
				}
			});

			return data.res;
		}),
		catchError(err => { console.error(err); return throwError(err); })
	);
}

/**
 * Checks to see if the point has passed it's cut-off period by checking the job Start Date or Construction Stage with the points Cut-off days or Stage
 * @param tree
 * @param job
 */
export function setTreePointsPastCutOff(tree: Tree, job: Job)
{
	const points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

	const jobStageId = job && job.constructionStageName != null ? ConstructionStageTypes[job.constructionStageName] : null;
	const jobStartDate = job ? job.startDate : null; // example: jobStartDate = 02/20/2019

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
		if (choice.lockedInChoice)
		{
			return;
		}

		if (choice.quantity === 0)
		{
			choice.selectedAttributes = [];
		}
		else if (choice.selectedAttributes.length > 0)
		{
			let selectedAttributes = [];
			const attributeGroups = choice.mappedAttributeGroups;
			const locationGroups = choice.mappedLocationGroups;

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
		const hasAttribute = attributeGroups.length > 0 && attributeGroups.findIndex(x => x === sa.attributeGroupId) > -1;
		const hasLocation = locationGroups.length > 0 && locationGroups.findIndex(x => x === sa.locationGroupId) > -1

		return hasAttribute || hasLocation ? sa : null;
	});
}

export function mergeAttributes(attributes: Array<AttributeExt>, missingAttributes: Array<DesignToolAttribute>, attributeGroups: Array<AttributeGroup>)
{
	const lastGroup = attributeGroups.length ? _.maxBy(attributeGroups, 'sortOrder') : null;
	let sortOrder = lastGroup ? lastGroup.sortOrder + 1 : 0;

	attributes.forEach(att =>
	{
		const choiceAttribute = missingAttributes.find(x => x.attributeId === att.id);

		if (choiceAttribute)
		{
			const newAttribute = att as AttributeExt;
			const choiceAttributeGroup = attributeGroups.find(x => x.id === choiceAttribute.attributeGroupId);

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
				const newAttributeGroup = att.attributeGroups.find(x => x.id === choiceAttribute.attributeGroupId);

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

export function mergeAttributeImages(attributeGroups: Array<AttributeGroup>, attributeCommunityImageAssocs: Array<AttributeCommunityImageAssoc>)
{
	if (attributeCommunityImageAssocs && attributeCommunityImageAssocs.length > 0)
	{
		// Map image URL for attribute
		attributeGroups.map(ag =>
		{
			return ag.attributes.map(a =>
			{
				const imageAssoc = attributeCommunityImageAssocs.find(aci => aci.attributeCommunityId === a.id);

				if (imageAssoc)
				{
					a.imageUrl = imageAssoc.imageUrl;
				}
			});
		})
	}
}

export function mergeLocations(locations, missingLocations: Array<DesignToolAttribute>, locationGroups: Array<LocationGroup>)
{
	locations.forEach(loc =>
	{
		const choiceAttribute = missingLocations.find(x => x.locationId === loc.id);

		if (choiceAttribute)
		{
			const newLocation = loc as Location;
			const choiceLocationGroup = locationGroups.find(x => x.id === choiceAttribute.locationGroupId);

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
				const newLocationGroup = loc.locationGroups.find(x => x.id === choiceAttribute.locationGroupId);

				if (newLocationGroup)
				{
					newLocationGroup.locations.push(newLocation);
					locationGroups.push(newLocationGroup);
				}
			}
		}
	});
}

// Choice-To-Choice Structural Items
export function hideChoicesByStructuralItems(choiceRules: ChoiceRules[], choices: Choice[], points: DecisionPoint[], hiddenChoiceIds: number[], hiddenPointIds: number[]) 
{
	choiceRules.forEach(cr => 
	{
		const numOrRules = cr.rules.length;
		let numBlocked = 0;
		cr.rules.forEach(r => 
		{
			let numAndBlocked = 0;
			r.choices.forEach(ch => 
			{
				const choice = r.ruleType === 1 ? choices.find(c => c.id === ch && c.quantity === 0) : choices.find(c => c.id === ch && c.quantity > 0);
				if (choice) 
				{
					const dp = points.find(p => p.choices.findIndex(c => c.id === ch) >= 0);
					if (dp.isStructuralItem && hiddenChoiceIds.indexOf(cr.choiceId) < 0) 
					{
						numAndBlocked++;
					}
				}
			})
			if (numAndBlocked > 0) 
			{
				numBlocked++;
			}
		})
		if (numOrRules === numBlocked) 
		{
			hiddenChoiceIds.push(cr.choiceId);
		}
	})
	let hiddenChoicesFound = false;
	while (!hiddenChoicesFound) 
	{
		hiddenChoicesFound = true;
		choiceRules.forEach(cr => 
		{
			let hiddenChoicesCount = 0
			cr.rules.forEach(r => 
			{
				const choice = r.choices.find(ch => hiddenChoiceIds.indexOf(ch) > -1 && hiddenChoiceIds.indexOf(cr.choiceId) < 0);
				if (choice) 
				{
					hiddenChoicesCount++;
				}
			});
			if (hiddenChoicesCount === cr.rules.length) 
			{
				hiddenChoicesFound = false;
				hiddenChoiceIds.push(cr.choiceId);
			}
		});
	}
	// Covers scenario that all choices within a DP are hidden, even if DP is not disabled
	points.forEach(p => 
	{
		let hiddenChoiceQuantity = 0;
		p.choices.forEach(c => 
		{
			if (hiddenChoiceIds.findIndex(hid => hid === c.id) > -1) 
			{
				hiddenChoiceQuantity++;
			}
		})
		if (hiddenChoiceQuantity === p.choices.length) 
		{
			hiddenPointIds.push(p.id);
		}
	})
}

// Point-To-Choice && Point-To-Point Structural Items
export function hidePointsByStructuralItems(pointRules: PointRules[], choices: Choice[], points: DecisionPoint[], hiddenChoiceIds: number[], hiddenPointIds: number[]) 
{
	// cr.choiceId is the affected choice
	// cr.rules = number of rules for choice, these are all ORS
	// r.choices are the affecting choice per rule, if multiple choices, its an AND
	pointRules.forEach(pr => 
	{
		// Must Have Rules
		const dpToChoiceRules = pr.rules.filter(r => r.ruleType === 1 && r.choices.length > 0);
		if(dpToChoiceRules.length > 0) 
		{
			// At least one rule must be dissatisfied for the point to be hidden
			if(hiddenPointIds.indexOf(pr.pointId) < 0 && dpToChoiceRules.reduce((isHiddenPoint, r) => 
			{
				// All choices in the rule must be satisfied for the rule to be considered satisfied
				return isHiddenPoint && r.choices.length ===
          r.choices.filter(ch => 
          {
          	const choice = choices.find(c => c.id === ch && c.quantity === 0);
          	if (choice) 
          	{
          		const dp = points.find(p => p.choices.findIndex(c => c.id === ch) >= 0 && p.isStructuralItem);
          		return !!dp;
          	}
          	else 
          	{
          		return false;
          	}
          }).length
			}, true)) 
			{
				hiddenPointIds.push(pr.pointId);
			};
		}
		const dpToDpRules = pr.rules.filter(r => r.ruleType === 1 && r.points.length > 0);
		if(dpToDpRules.length > 0) 
		{
			// At least one rule must be dissatisfied for the point to be hidden
			if(hiddenPointIds.indexOf(pr.pointId) < 0 && dpToDpRules.reduce((isHiddenPoint, r) => 
			{
				// All points in the rule must be satisfied for the rule to be considered satisfied
				return isHiddenPoint && r.points.length ===
          r.points.filter(po => 
          {
          	const dp = points.find(p => p.id === po && p.isStructuralItem && !p.completed);
          	return dp && dp.choices.reduce((quantity, c) => quantity + c.quantity, 0) === 0;
          }).length
			}, true)) 
			{
				hiddenPointIds.push(pr.pointId);
			};
		}
		// Must Not Have Rules
		pr.rules.filter(r => r.ruleType === 2).forEach(r => 
		{
			// Point to Choice
			if(r.choices.length > 0) 
			{
				// At least one choice must be dissatisfied for the point to be hidden
				if(hiddenPointIds.indexOf(pr.pointId) < 0 && r.choices.reduce((isHiddenPoint, ch) => 
				{
					const choice = choices.find(c => c.id === ch && c.quantity > 0);
					return !!choice
            && isHiddenPoint
            && !!(points.find(p => (p.choices.findIndex(c => c.id === ch) >= 0) && p.isStructuralItem));
				}, true)) 
				{
					hiddenPointIds.push(pr.pointId);
				}
			}
			// Point to Point
			if(r.points.length > 0) 
			{
				// At least one point must be dissatisfied for the point to be hidden
				if(hiddenPointIds.indexOf(pr.pointId) < 0 && r.points.reduce((isHiddenPoint, po) => 
				{
					const dp = points.find(p => p.id === po && p.isStructuralItem && !p.completed);
					return isHiddenPoint
            && dp
            && dp.choices.reduce((quantity, c) => quantity + c.quantity, 0) > 0;
				}, true)) 
				{
					hiddenPointIds.push(pr.pointId);
				}
			}
		});
	});

	// Hide all DPs that are blocked by hidden DPs or Choices
	let hiddenPointsFound = false;
	while (!hiddenPointsFound) 
	{
		hiddenPointsFound = true;
		pointRules.forEach(pr => 
		{
			pr.rules.forEach(r => 
			{
				const choice = r.choices.find(ch => hiddenChoiceIds.indexOf(ch) > -1);
				if (choice && hiddenPointIds.indexOf(pr.pointId) < 0) 
				{
					hiddenPointsFound = false;
					hiddenPointIds.push(pr.pointId);
				}

				const point = r.points.find(p => hiddenPointIds.indexOf(p) > -1);
				if (point && hiddenPointIds.indexOf(pr.pointId) < 0) 
				{
					hiddenPointsFound = false;
					hiddenPointIds.push(pr.pointId);
				}
			});
		});
	}
}

export function getLockedInChoice(choice: JobChoice | ChangeOrderChoice, options: Array<JobPlanOption | ChangeOrderPlanOption>)
	:
	{
		choice: (JobChoice | ChangeOrderChoice),
		optionAttributeGroups: Array<{ optionId: string, attributeGroups: number[], locationGroups: number[] }>
	}
{
	return {
		choice,
		optionAttributeGroups: isJobChoice(choice)
			? choice.jobChoiceJobPlanOptionAssocs.filter(a => a.choiceEnabledOption)
				.map(a => 
				{
					const opt = options.find(o => (o as JobPlanOption).id === a.jobPlanOptionId);
					if (opt)
					{
						return {
							optionId: opt.integrationKey,
							attributeGroups: (opt as JobPlanOption).jobPlanOptionAttributes?.map(att => att.attributeGroupCommunityId),
							locationGroups: (opt as JobPlanOption).jobPlanOptionLocations?.map(loc => loc.locationGroupCommunityId)
						};
					}
					else
					{
						return null;
					}
				})
			: choice.jobChangeOrderChoiceChangeOrderPlanOptionAssocs.filter(a => a.jobChoiceEnabledOption)
				.map(a => 
				{
					const opt = options.find(o => (o as ChangeOrderPlanOption).id === a.jobChangeOrderPlanOptionId);
					if (opt)
					{
						return {
							optionId: opt.integrationKey,
							attributeGroups: (opt as ChangeOrderPlanOption).jobChangeOrderPlanOptionAttributes?.map(att => att.attributeGroupCommunityId),
							locationGroups: (opt as ChangeOrderPlanOption).jobChangeOrderPlanOptionLocations?.map(loc => loc.locationGroupCommunityId)
						};
					}
					else
					{
						return null;
					}
				})
	};
}

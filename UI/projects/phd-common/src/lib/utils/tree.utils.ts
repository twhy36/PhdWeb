import { Observable, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import * as _ from 'lodash';

import
{
	DesignToolAttribute, ChangeOrderGroup, ChangeOrderChoice, ChangeOrderPlanOption, ChangeOrderChoiceAttribute,
	ChangeOrderChoiceLocation, JobChoice, JobPlanOption, JobChoiceAttribute, JobChoiceLocation, PlanOption,
	OptionRule, TreeVersionRules, Scenario, SelectedChoice, Tree, Choice, MappedAttributeGroup, MappedLocationGroup,
	applyRules, MyFavoritesChoice, TreeService
} from 'phd-common';

export function isLocked(changeOrder: ChangeOrderGroup, includeChangedChoice: boolean = false): (choice: JobChoice | ChangeOrderChoice) => boolean
{
	return (choice: JobChoice | ChangeOrderChoice) => 
	{
		const isChangedChoice = _.flatMap(changeOrder?.jobChangeOrders?.map(co => co.jobChangeOrderChoices)).some(coc => coc.action === 'Change' && coc.divChoiceCatalogId === choice.divChoiceCatalogId);
		return isJobChoice(choice) && (includeChangedChoice || !isChangedChoice) || (!!changeOrder && ['Pending', 'Withdrawn'].indexOf(changeOrder.salesStatusDescription) === -1);
	}
}

export function isJobChoice(choice: JobChoice | ChangeOrderChoice): choice is JobChoice
{
	return (<any>choice).action === undefined;
}

export function getOptions(choice: JobChoice | ChangeOrderChoice, options: (JobPlanOption | ChangeOrderPlanOption)[]): (JobPlanOption | ChangeOrderPlanOption)[]
{
	return isJobChoice(choice)
		? choice.jobChoiceJobPlanOptionAssocs.filter(a => a.choiceEnabledOption)?.map(a => options.find(o => isJobPlanOption(o) && o.id === a.jobPlanOptionId))
		: choice.jobChangeOrderChoiceChangeOrderPlanOptionAssocs.filter(a => a.jobChoiceEnabledOption)?.map(a => options.find(o => !isJobPlanOption(o) && o.id === a.jobChangeOrderPlanOptionId));
}

export function isJobPlanOption(option: JobPlanOption | ChangeOrderPlanOption): option is JobPlanOption
{
	return (<any>option).action === undefined;
}

export function isOptionLocked(changeOrder: ChangeOrderGroup): (option: JobPlanOption | ChangeOrderPlanOption) => boolean
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

export function saveLockedInChoices(choices: Array<JobChoice | ChangeOrderChoice>, treeChoices: Choice[], options: Array<JobPlanOption | ChangeOrderPlanOption>, changeOrder?: ChangeOrderGroup)
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

export function isChangeOrderChoice(choice: JobChoice | ChangeOrderChoice | MyFavoritesChoice): choice is ChangeOrderChoice
{
	return (<any>choice).action !== undefined;
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
			return combineLatest([
				source,
				treeService.getTree(scenario.originalTreeVersionId),
				treeService.getRules(scenario.originalTreeVersionId)
			]).pipe(
				map(([data, origTree, origRules]: [T, Tree, TreeVersionRules]) =>
				{
					const newTree = _.cloneDeep(data.tree);
					const newTreeChoices = _.flatMap(newTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
					const origTreeChoices = _.flatMap(origTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));

					scenario.scenarioChoices.forEach(choice =>
					{
						const c1 = newTreeChoices.find(c => c.divChoiceCatalogId === choice.choice.choiceCatalogId);
						const c2 = origTreeChoices.find(c => c.divChoiceCatalogId === choice.choice.choiceCatalogId);

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
					const selectedChoices = scenario.scenarioChoices.filter(c =>
					{
						const nc = newTreeChoices.find(c1 => c1.divChoiceCatalogId === c.choice.choiceCatalogId && c1.quantity > 0);
						const oc = origTreeChoices.find(c2 => c2.divChoiceCatalogId === c.choice.choiceCatalogId && c2.quantity > 0);

						return !!nc && !!oc && (nc.options || []).every(o1 => (oc.options || []).findIndex(o2 => o2.financialOptionIntegrationKey === o1.financialOptionIntegrationKey) !== -1)
							&& (oc.options || []).every(o1 => (nc.options || []).findIndex(o2 => o2.financialOptionIntegrationKey === o1.financialOptionIntegrationKey) !== -1);
					});

					if (selectedChoices.length > 0)
					{
						const newSubGroups = _.flatMap(newTree.treeVersion.groups, g => g.subGroups);
						const newPoints = _.flatMap(newSubGroups, sg => sg.points);
						const newChoices = _.flatMap(newPoints, p => p.choices);

						const oldSubGroups = _.flatMap(origTree.treeVersion.groups, g => g.subGroups);
						const oldPoints = _.flatMap(oldSubGroups, sg => sg.points);
						const oldChoices = _.flatMap(oldPoints, p => p.choices);

						// filter out any rule that didn't have anything to do with attribute reassignment
						const oldOptionRules = origRules.optionRules.filter(or => or.choices.find(c => c.attributeReassignments.length > 0) !== null);
						const oldOptionRuleChoices = _.flatMap(oldOptionRules, r => r.choices);

						const newOptionRules = data.rules.optionRules.filter(or => or.choices.find(c => c.attributeReassignments.length > 0) !== null);
						const newOptionRuleChoices = _.flatMap(newOptionRules, r => r.choices);

						selectedChoices.forEach(selectedChoice =>
						{
							const newChoice = newChoices.find(x => x.id === selectedChoice.choiceId);
							const lostAttributes = selectedChoice.selectedAttributes.filter(sa => newChoice.mappedAttributeGroups.findIndex(ag => ag.id === sa.attributeGroupId) === -1);

							if (lostAttributes.length > 0)
							{
								lostAttributes.forEach(attribute =>
								{
									const oldChoice = oldChoices.find(c => c.divChoiceCatalogId === newChoice.divChoiceCatalogId);

									// if it was a reassignment in its past life
									const oldOptionRuleChoice = oldOptionRuleChoices.find(c => c.attributeReassignments.length > 0 && c.attributeReassignments.findIndex(ar => ar.attributeGroupId === attribute.attributeGroupId && ar.choiceId === oldChoice.id) > -1);

									if (oldOptionRuleChoice != null)
									{
										// get the old choice parent
										const oldParentChoice = oldChoices.find(c => c.id === oldOptionRuleChoice.id);
										// so we can find the new choice parent
										const newParentChoice = newChoices.find(c => c.divChoiceCatalogId === oldParentChoice.divChoiceCatalogId);
										// then we can get the new selected choice
										const newSelectedChoiceParent = selectedChoices.find(c => c.choiceId === newParentChoice.id);

										// Add the selected attribute back to its original location before the reassignment
										newSelectedChoiceParent.selectedAttributes.push(attribute);

										const index = selectedChoice.selectedAttributes.indexOf(attribute);

										// remove the reassigned attribute
										selectedChoice.selectedAttributes.splice(index, 1);
									}
									else
									{
										// if it wasn't a reassignment but now is
										const optionRuleChoice = newOptionRuleChoices.find(c => c.id === newChoice.id && c.attributeReassignments.length > 0 && c.attributeReassignments.findIndex(ar => ar.attributeGroupId === attribute.attributeGroupId) > -1);

										if (optionRuleChoice != null)
										{
											// find the reassignment rule
											const attributeReassignment = optionRuleChoice.attributeReassignments.filter(ar => ar.attributeGroupId === attribute.attributeGroupId);

											if (attributeReassignment.length > 0)
											{
												// should be just the one record but lets loop anyways
												attributeReassignment.forEach(ar =>
												{
													// find the reassigned choice if available
													const newSelectedChoice = selectedChoices.find(c => c.choiceId === ar.choiceId);

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
					const newTreePoints = _.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

					data.selectedChoices = data.selectedChoices.filter(sc =>
					{
						const pt = newTreePoints.find(p => p.choices.some(ch => ch.id === sc.choiceId));

						if (pt)
						{
							return pt.pointPickTypeId >= 3 || pt.choices.every(ch => ch.id === sc.choiceId || !data.selectedChoices.some(c => c.choiceId === ch.id));
						}
						else
						{
							return false; //should never happen
						}
					});
				})
			);
		}
	};
}

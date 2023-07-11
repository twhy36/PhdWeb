import * as _ from 'lodash';
import * as moment from 'moment';

import
{
	LocationGroup, Location, AttributeGroup, Attribute, DesignToolAttribute, AttributeCommunityImageAssoc,
	ChangeOrderChoice, ChangeOrderPlanOption, ChangeOrderChoiceAttribute, ChangeOrderChoiceLocation,
	JobChoice, JobPlanOption, JobChoiceAttribute, JobChoiceLocation, Job, PlanOption, ConstructionStageTypes, OptionRule,
	Tree, Choice, DecisionPoint, MyFavoritesChoice, getMaxSortOrderChoice
} from 'phd-common';

export function isJobChoice(choice: JobChoice | ChangeOrderChoice): choice is JobChoice
{
	return (<any>choice).action === undefined;
}

export function isJobPlanOption(option: JobPlanOption | ChangeOrderPlanOption): option is JobPlanOption
{
	return (<any>option).action === undefined;
}

export function isChangeOrderChoice(choice: JobChoice | ChangeOrderChoice | MyFavoritesChoice): choice is ChangeOrderChoice
{
	return (<any>choice).action !== undefined;
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

export function mergeAttributes(
	attributes: Array<any>,
	missingAttributes: Array<DesignToolAttribute>,
	attributeGroups: Array<AttributeGroup>,
	selectedAttributes: DesignToolAttribute[])
{
	const lastGroup = attributeGroups.length ? _.maxBy(attributeGroups, 'sortOrder') : null;
	let sortOrder = lastGroup ? lastGroup.sortOrder + 1 : 0;

	attributes.forEach(att =>
	{
		const choiceAttribute = missingAttributes.find(x => x.attributeId === att.id);

		if (choiceAttribute)
		{
			const newAttribute = att as Attribute;
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

	// Check if any selected attributes are missing in the attribute groups	
	const allAttributes = _.flatMap(attributeGroups, gp => _.flatMap(gp.attributes)) || [];

	selectedAttributes.forEach(attr =>
	{
		const selectedAttributeGroup = attributeGroups.find(group => group.id === attr.attributeGroupId);

		if (selectedAttributeGroup)
		{
			const selectedAttribute = selectedAttributeGroup.attributes?.find(attribute => attribute.id === attr.attributeId);

			if (!selectedAttribute)
			{
				const missingSelectedAttribute = allAttributes.find(attribute => attribute.id === attr.attributeId);

				if (missingSelectedAttribute)
				{
					// add the missing attribute
					if (!selectedAttributeGroup.attributes)
					{
						selectedAttributeGroup.attributes = [];
					}

					selectedAttributeGroup.attributes.push(missingSelectedAttribute);
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

export function mergeLocations(locations: Array<any>, missingLocations: Array<DesignToolAttribute>, locationGroups: Array<LocationGroup>)
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

export function getJobOptionType(option: PlanOption, elevationDP: DecisionPoint, isDPElevation: boolean, isColorScheme: boolean, tree: Tree, optionRules: OptionRule[])
{
	let optionType = 'Standard';

	if (isColorScheme)
	{
		// DP is ColorScheme
		optionType = 'ColorScheme';
	}
	else if (isDPElevation)
	{
		// DP is Elevation
		optionType = 'Elevation';
	}
	else
	{
		const optionRule = optionRules.find(opt => option.financialOptionIntegrationKey === opt.optionId);

		// Check if this option replaces an elevation choice 
		// If it does then set option type to Elevation
		if (optionRule?.replaceOptions?.length)
		{
			const replaceOption = optionRule.replaceOptions.find(replaceOptionId =>
			{
				const replaceOptionRule = optionRules.find(r => r.optionId === replaceOptionId);
				const replacedChoiceId = getMaxSortOrderChoice(tree, replaceOptionRule.choices.filter(ch => ch.mustHave).map(ch => ch.id));

				return !!elevationDP.choices.find(ch => ch.id === replacedChoiceId);
			});

			if (replaceOption)
			{
				optionType = 'Elevation';
			}
		}
	}

	return optionType;
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

/**
 * Check Elevation and Color Scheme for more than one option and create message to alert user of the issue
 * @param tree
 * @param optionRules
 * @param elevationDP
 * @param colorSchemeDP
 * @returns
 */
export function checkElevationAndColorSelectionOptions(tree: Tree, optionRules: OptionRule[], elevationChoice: Choice, colorSchemeChoice: Choice): string
{
	// find all rules with replace options
	const filteredOptionRules = optionRules?.filter(opt => opt.replaceOptions.length > 0);

	// get all selected choices
	const selectedChoices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)))?.filter(c => c.quantity > 0);

	const replaceOption = (choiceId: number) =>
	{
		const optionList = [];
		const getMaxSortOrderChoiceId = (optionRule: OptionRule) => !!optionRule ? getMaxSortOrderChoice(tree, optionRule.choices.filter(ch => ch.mustHave).map(ch => ch.id)) : null;

		filteredOptionRules.forEach(optionRule =>
		{
			// find the rules main choice
			const parentChoiceId = getMaxSortOrderChoiceId(optionRule);

			// make sure the choice has been selected before checking replace rules
			if (!!selectedChoices.find(c => c.id === parentChoiceId))
			{
				const replacedOptionId = optionRule.replaceOptions.find(replaceOptionId =>
				{
					// find the rule the option getting replaced lives on
					const replaceOptionRule = optionRules.find(r => r.optionId === replaceOptionId);
					// find the replaced choice
					const replacedChoiceId = getMaxSortOrderChoiceId(replaceOptionRule);
					// see if we have a match
					const hasReplacedOption = choiceId === replacedChoiceId;

					return hasReplacedOption ? replaceOptionId : null;
					
				});

				if (!!replacedOptionId)
				{
					optionList.push(replacedOptionId);
				}
			}
		});

		return optionList;
	};

	const getChoiceInfo = (label: string, choice: Choice, addBreak: boolean = false) =>
	{
		let msg = '';

		// find any replace options that are missing from the choice
		const replacedOptions = replaceOption(choice?.id);
		// combine results
		const optionCount = (choice?.options?.length || 0) + (replacedOptions?.length || 0);

		const optionMessage = (integrationKey: string) => `<span class="phd-elevation-color-option">${integrationKey}</span></br>`;

		// if more than one then we have an issue and need to alert the user
		if (optionCount > 1)
		{
			// add break between choices if multiple
			msg += addBreak ? '</br>' : '';

			msg += `<b>${label} - ${choice.label}</b></br>`;

			// list the options associated with each choice
			choice.options.forEach(option => msg += optionMessage(option.financialOptionIntegrationKey));

			// list the replaced options
			replacedOptions.forEach(option => msg += optionMessage(option));
		}

		return msg;
	};

	let message: string;
	let selectedChoiceLabels = getChoiceInfo('Elevation', elevationChoice);

	selectedChoiceLabels += getChoiceInfo('Color Scheme', colorSchemeChoice, selectedChoiceLabels?.length > 0);

	if (selectedChoiceLabels?.length > 0)
	{
		message = `Two or more options are mapped to your <b>Elevation</b> or <b>Color Scheme</b> choice.</br>`;
		message += `Only <b>one</b> option is allowed at the Elevation and Color Scheme decision points.`;
		message += `</br></br>${selectedChoiceLabels} </br>`;
		message += `Please contact your Procurement team.`;
	}

	return message;
}

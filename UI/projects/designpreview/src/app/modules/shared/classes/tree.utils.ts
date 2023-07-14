import * as _ from 'lodash';
import * as moment from 'moment';

import
{
	DesignToolAttribute, JobChoice, JobPlanOption, JobChoiceAttribute, JobChoiceLocation, Job, 
	ChangeOrderChoice, ChangeOrderPlanOption, ChangeOrderChoiceAttribute, ChangeOrderChoiceLocation,
	ConstructionStageTypes, Tree, Choice, DecisionPoint, AttributeGroup, AttributeCommunityImageAssoc, Location,
	LocationGroup, ChoiceRules, PointRules, OptionRule, MyFavoritesChoice
} from 'phd-common';

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

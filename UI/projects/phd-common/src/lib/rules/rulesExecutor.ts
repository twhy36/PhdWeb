import { Tree, DecisionPoint, SubGroup, Group, Choice, PickType, MappedAttributeGroup, MappedLocationGroup } from '../models/tree.model';
import { TreeVersionRules, ChoiceRules, PointRules, OptionRule } from '../models/rule.model';
import { PlanOption } from '../models/option.model';
import { PointStatus } from '../models/point.model';
import { PriceBreakdown } from '../models/scenario.model';
import { JobChoice } from '../models/job.model';
import { ChangeOrderChoice } from '../models/job-change-order.model';
import { isChoiceAttributesComplete } from '../utils/utils.class';

import * as _ from 'lodash';
import { TimeOfSaleOptionPrice } from '../models/time-of-sale-option-price.model';

export function findPoint(tree: Tree, predicate: (point: DecisionPoint) => boolean)
{
	return tree.treeVersion.groups.reduce((pt, grp) =>
	{
		if (pt)
		{
			return pt;
		}
		else
		{
			return grp.subGroups.reduce((pt, sg) =>
			{
				return pt || sg.points.find(p => predicate(p));
			}, <DecisionPoint>null);
		}
	}, <DecisionPoint>null);
}

export function findChoice(tree: Tree, predicate: (choice: Choice) => boolean)
{
	return tree.treeVersion.groups.reduce((ch, grp) =>
	{
		if (ch)
		{
			return ch;
		}
		else
		{
			return grp.subGroups.reduce((ch, sg) =>
			{
				if (ch)
				{
					return ch;
				}
				else
				{
					return sg.points.reduce((ch, pt) =>
					{
						return ch || pt.choices.find(c => predicate(c));
					}, <Choice>null);
				}
			}, <Choice>null);
		}
	}, <Choice>null);
}

export function selectChoice(tree: Tree, selectedChoice: number)
{
	let point = findPoint(tree, (pt) => pt.choices.some(c => c.id === selectedChoice));

	if (point && point.pointPickTypeId <= 2)
	{
		point.choices.filter(c => c.id !== selectedChoice).forEach(c =>
		{
			c.quantity = 0;
			c.selectedAttributes = [];
		});
	}
}

export function applyRules(tree: Tree, rules: TreeVersionRules, options: PlanOption[], lotId: number = 0, timeOfSaleOptionPrices: TimeOfSaleOptionPrice[] = [])
{
	let points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).filter(x => x.treeVersionId === tree.treeVersion.id);
	let choices = _.flatMap(points, p => p.choices).filter(x => x.treeVersionId === tree.treeVersion.id);
	let treeChoices = _.flatMap(points, p => p.choices);

	let find = id => choices.find(ch => ch.id === id);

	choices.forEach(ch =>
	{
		ch.maxQuantity = ch.choiceMaxQuantity || 1;
		ch.price = 0;
		ch.enabled = true;
		ch.options = [];
		ch.disabledBy = [];
		ch.changedDependentChoiceIds = [];
		ch.mappingChanged = false;
		ch.disabledByReplaceRules = [];
		ch.disabledByBadSetup = false;
		ch.disabledByRelocatedMapping = [];

		// Deselect choice requirements when a user deselects/selects a new lot while creating a HC
		// Don't want previous lot choice requirements to show up when a lot is toggled
		ch.disabledByHomesite = false;
		ch.isRequired = false;

		//Check for LotChoiceRules and mark them as enabled/disabled
		let choiceRules = rules.lotChoiceRules?.find(lcr => lcr.divChoiceCatalogId === ch.divChoiceCatalogId);

		// Filter by planID if a plan is selected
		let lcRule = tree.planId ? choiceRules?.rules.find(cr => cr.edhLotId === lotId && cr.planId === tree.planId) : choiceRules?.rules.find(cr => cr.edhLotId === lotId);

		if (lcRule)
		{
			// if required, set choice as required due to homesite
			if (lcRule.mustHave)
			{
				ch.quantity = 1;
				ch.isRequired = true;
			}
			else
			{
				ch.quantity = 0;
				ch.enabled = false;
				ch.isSelectable = false;
				ch.disabledByHomesite = true;
			}
		}

		if (ch.lockedInChoice && ch.lockedInOptions?.length)
		{
			//detect if choice change affects locked in options
			//against all tree choices including the choices that are deleted after selected in the jobs
			if (ch.lockedInOptions.some(o =>
				o.choices.some(c => (c.mustHave && !treeChoices.find(c1 => c1.divChoiceCatalogId === c.id)?.quantity)
					|| (!c.mustHave && treeChoices.find(c1 => c1.divChoiceCatalogId === c.id)?.quantity))))
			{
				ch.lockedInChoice = null;
				ch.lockedInOptions = [];
			}
		}

	});

	points.forEach(pt =>
	{
		pt.enabled = true;
		pt.disabledBy = [];

		let hasRequiredChoice = pt.choices.find(c => c.isRequired)?.isRequired;

		if (hasRequiredChoice && (pt.pointPickTypeId === PickType.Pick1 || pt.pointPickTypeId === PickType.Pick0or1))
		{
			pt.choices.forEach(ch =>
			{
				// Disable choice if the DP has a required choice + the choice itself is not required + the pick type is Pick1 or Pick0or1
				if (ch.enabled && !ch.isRequired)
				{
					ch.enabled = false;
					ch.quantity = 0;
				}
			});
		}
	});

	function executeChoiceRule(cr: ChoiceRules)
	{
		if (cr.executed)
		{
			return;
		}

		let deps = _.intersectionBy(rules.choiceRules, _.flatMap(cr.rules, r => r.choices).map(c => { return { choiceId: c }; }), 'choiceId');

		deps.forEach(rule => executeChoiceRule(rule));

		let choice = find(cr.choiceId);
		choice.enabled = false;

		cr.rules.forEach(r =>
		{
			if (r.ruleType === 1)
			{
				//must have
				if (r.choices.filter(c => { let ch = find(c); return !ch || !ch.quantity; }).length === 0)
				{
					choice.enabled = true;

					return;
				}
			}
			else
			{
				if (r.choices.filter(c => { let ch = find(c); return !ch || ch.quantity; }).length === 0)
				{
					choice.enabled = true;

					return;
				}
			}
		});

		if (!choice.enabled)
		{
			if (choice.lockedInChoice)
			{
				choice.enabled = true;
			}
			else
			{
				choice.quantity = 0;
				choice.isRequired = false;

				choice.disabledBy.push(cr);
			}
		}

		cr.executed = true;
	}

	//make sure each rule gets executed anew
	rules.choiceRules.forEach(cr =>
	{
		cr.executed = false;
	});

	rules.choiceRules.forEach(cr =>
	{
		executeChoiceRule(cr);
	});

	function executePointRule(pr: PointRules)
	{
		if (pr.executed)
		{
			return;
		}

		let deps = _.intersectionBy(rules.pointRules, _.flatMap(pr.rules, r => r.points).map(p => { return { pointId: p }; }), 'pointId');

		deps.forEach(rule => executePointRule(rule));

		let point = points.find(pt => pt.id === pr.pointId);
		let enabled = false;

		pr.rules.forEach(r =>
		{
			if (r.ruleType === 1)
			{
				// must have point rule
				if (r.choices.filter(c => { let ch = findChoice(tree, c1 => c1.id === c); return !ch || !ch.quantity; }).length === 0
					&& r.points.filter(p => { let pt = findPoint(tree, p1 => p1.id === p); return !pt || !pt.completed; }).length === 0)
				{
					enabled = true;
				}
			}
			else
			{
				// must not have point rule
				if (r.choices.filter(c => { let ch = findChoice(tree, c1 => c1.id === c); return !ch || ch.quantity; }).length === 0
					&& r.points.filter(p => { let pt = findPoint(tree, p1 => p1.id === p); return !pt || pt.completed; }).length === 0)
				{
					enabled = true;
				}
			}
		});

		if (!enabled)
		{
			point?.choices.forEach(ch =>
			{
				if (!ch.lockedInChoice) 
				{
					ch.quantity = 0;
					ch.enabled = false;
				}
			});

			if (point?.choices?.some(ch => ch.lockedInChoice))
			{
				enabled = true;
				point.completed = true;
			}
			else
			{
				point.completed = false;
			}

			point.disabledBy.push(pr);
		}

		point.enabled = enabled;
		pr.executed = true;
	}

	points.forEach(point =>
	{
		// set point completion before executing point rules as some rules depend on other points being completed
		point.completed = point && point.choices && point.choices.some(ch => ch.quantity > 0);
	});

	rules.pointRules.forEach(pr =>
	{
		pr.executed = false;
	});

	rules.pointRules.forEach(pr => executePointRule(pr));

	//apply option rules
	let executedOptionRules = new Set<number>();

	function executeOptionRule(optionRule: OptionRule)
	{
		//if there are any replace options, make sure the rules for those options are executed first
		//so we know the calculated price of the replaced option
		if (executedOptionRules.has(optionRule.ruleId))
		{
			return;
		}

		executedOptionRules.add(optionRule.ruleId);

		if (optionRule.replaceOptions && optionRule.replaceOptions.length)
		{
			optionRule.replaceOptions.forEach(replaceOption =>
			{
				//rule could be null (if they haven't mapped the option to any choices).
				//find out how we want to handle this. for now just going to ignore it.
				let rule = rules.optionRules.find(r => r.optionId === replaceOption);

				if (rule && !executedOptionRules.has(rule.ruleId))
				{
					executeOptionRule(rule);
				}
			});
		}

		const option = options.find(o => o.financialOptionIntegrationKey === optionRule.optionId);

		if (!option)
		{
			return;
		}

		option.calculatedPrice = option.listPrice; //copy list price to calculated price so list price can be preserved

		const maxSortOrderChoice = getMaxSortOrderChoice(tree, optionRule.choices.filter(c => c.mustHave).map(c => c.id));
		const choice = find(maxSortOrderChoice);

		if (choice)
		{
			// set maxQuantity
			choice.maxQuantity = getMaxQuantity(option, choice);

			if (optionRule.choices.every(c => c.id === choice.id || (c.mustHave && find(c.id).quantity >= 1) || (!c.mustHave && find(c.id).quantity === 0)))
			{
				// handle quantity options
				if (option.maxOrderQuantity > 1)
				{
					//quantity options shouldn't be able to have replace rules (check this assumption)

					choice.price = option.listPrice;
					choice.options = [...choice.options, option];
				}
				else
				{
					let calculatedPrice = option.calculatedPrice;

					// #352779
					// Determine if this option has been replaced and use the original pricing if necessary
					const replaceRules = rules.optionRules.filter(o => o.replaceOptions.includes(option.financialOptionIntegrationKey));

					if (replaceRules && replaceRules.length)
					{
						// If any rule to replace this option is completely satisfied, use the original pricing
						let useOriginalPricing = replaceRules.some(rr => rr.choices.every(rrc => (rrc.mustHave && find(rrc.id).quantity >= 1) || (!rrc.mustHave && find(rrc.id).quantity === 0)));

						if (useOriginalPricing)
						{
							const originalPriceIdx = timeOfSaleOptionPrices ? timeOfSaleOptionPrices.findIndex(x => x.divChoiceCatalogID === choice.divChoiceCatalogId && option.id === x.edhPlanOptionID) : -1;

							if (originalPriceIdx > -1)
							{
								calculatedPrice = timeOfSaleOptionPrices[originalPriceIdx].listPrice;
							}
						}
					}

					// Handle replace price here. We need to remove the list price of the options that are being removed
					// because the cost of this option is really a delta
					if (optionRule.replaceOptions.length > 0)
					{
						let replaceOptions = optionRule.replaceOptions
							.map(o => options.find(opt => opt.financialOptionIntegrationKey === o))
							.filter(o => !!o);

						// #364540
						// If a TimeOfSale record exists for a replaced option,
						// use the original pricing on this choice that replaces the option
						if (timeOfSaleOptionPrices && timeOfSaleOptionPrices.length)
						{
							replaceOptions.forEach(ro =>
							{
								const existingTimeOfSaleOption = timeOfSaleOptionPrices.find(tos => tos.edhPlanOptionID === ro.id);

								if (existingTimeOfSaleOption)
								{
									ro.calculatedPrice = existingTimeOfSaleOption.listPrice;
								}
							});
						}

						calculatedPrice = replaceOptions.reduce((pv, cv) => pv - cv.calculatedPrice, calculatedPrice);
					}

					// Apply the option price to the max sort order choice, if the rule is satisfied
					choice.price += calculatedPrice;
					choice.options = [...choice.options, option];

					//handle replace
					if (choice.quantity >= 1 && optionRule.replaceOptions.length > 0)
					{
						optionRule.replaceOptions.forEach(opt =>
						{
							let c = choices.find(ch => ch.options.some(o => o.financialOptionIntegrationKey === opt));

							if (c)
							{
								c.options = c.options.filter(o => o.financialOptionIntegrationKey !== opt);
							}
						});
					}
				}
			}
		}
	};

	/**
	 * Map Locations and Attributes GroupIds to their proper place, applying Attribute Reasignments if needed
	 * @param choice
	 */
	function mapLocationAttributes(choice: Choice)
	{
		let mappedAttributeGroups: MappedAttributeGroup[] = [];
		let mappedLocationGroups: MappedLocationGroup[] = [];
		let optionRules = rules.optionRules;

		if (choice.lockedInOptions && choice.lockedInOptions.length > 0 || choice.lockedInChoice)
		{
			let currentAttributeGroupIds: MappedAttributeGroup[] = [];
			let currentLocationGroupIds: MappedLocationGroup[] = [];
			let lockedInChoice;

			// get attributes and locations from the choice before adding in locked in data.
			if (choice.options && choice.options.length > 0)
			{
				let optionAttributeGroupIds = _.flatMap(choice.options, o => o && o.attributeGroups);
				let optionLocationGroupIds = _.flatMap(choice.options, o => o && o.locationGroups);

				// apply option attributes and locations
				currentAttributeGroupIds = [...currentAttributeGroupIds, ...optionAttributeGroupIds.map(x => new MappedAttributeGroup({ id: x }))];
				currentLocationGroupIds = [...currentLocationGroupIds, ...optionLocationGroupIds.map(x => new MappedLocationGroup({ id: x }))];
			}
			else
			{
				// does not have options so we default to the choice for attributes and locations
				currentAttributeGroupIds = [...currentAttributeGroupIds, ...choice.attributeGroups.map(x => new MappedAttributeGroup({ id: x }))];
				currentLocationGroupIds = [...currentLocationGroupIds, ...choice.locationGroups.map(x => new MappedLocationGroup({ id: x }))];
			}

			if (choice.lockedInChoice?.choice?.hasOwnProperty('jobChoiceAttributes'))
			{
				lockedInChoice = choice.lockedInChoice.choice as JobChoice;

				currentAttributeGroupIds = [...currentAttributeGroupIds,
				...lockedInChoice.jobChoiceAttributes
					.filter(jca => !currentAttributeGroupIds.some(cag => cag.id === jca.attributeGroupCommunityId))
					.map(x => new MappedAttributeGroup({ id: x.attributeGroupCommunityId }))
				];
				currentLocationGroupIds = [...currentLocationGroupIds,
				...lockedInChoice.jobChoiceLocations
					.filter(jcl => !currentLocationGroupIds.some(clg => clg.id === jcl.locationGroupCommunityId))
					.map(x => new MappedLocationGroup({ id: x.locationGroupCommunityId }))
				];
			}
			else if (choice.lockedInChoice?.choice?.hasOwnProperty('jobChangeOrderChoiceAttributes'))
			{
				lockedInChoice = choice.lockedInChoice.choice as ChangeOrderChoice;

				currentAttributeGroupIds = [...currentAttributeGroupIds,
				...lockedInChoice.jobChangeOrderChoiceAttributes
					.filter(coca => !currentAttributeGroupIds.some(cag => cag.id === coca.attributeGroupCommunityId))
					.map(x => new MappedAttributeGroup({ id: x.attributeGroupCommunityId }))
				];
				currentLocationGroupIds = [...currentLocationGroupIds,
				...lockedInChoice.jobChangeOrderChoiceLocations
					.filter(cocl => !currentLocationGroupIds.some(clg => clg.id === cocl.locationGroupCommunityId))
					.map(x => new MappedLocationGroup({ id: x.locationGroupCommunityId }))
				];
			}

			if (choice.lockedInOptions && choice.lockedInOptions.length > 0)
			{
				let optionRule = choice.lockedInOptions.find(o => o && o.choices.some(c => c.attributeReassignments.length > 0));

				if (optionRule)
				{
					// find the choice on the rule that matches the current chocie
					let orChoice = optionRule.choices.find(c => c.id === choice.divChoiceCatalogId);

					if (orChoice)
					{
						// see if we need to filter out any attribute reassignments
						if (orChoice.attributeReassignments && orChoice.attributeReassignments.length > 0)
						{
							let reassignmentAttributeGroupIds = orChoice.attributeReassignments.map(ar => ar.attributeGroupId);

							// filter out any attributeGroupIds that are present in attributeReassignment
							currentAttributeGroupIds = currentAttributeGroupIds.filter(x => reassignmentAttributeGroupIds.findIndex(agId => agId === x.id) === -1);
						}
					}
				}
			}

			mappedAttributeGroups = [...mappedAttributeGroups, ...currentAttributeGroupIds];
			mappedLocationGroups = [...mappedLocationGroups, ...currentLocationGroupIds];

			let lockedInChoicesWithReassignments = choices.filter(c => c.lockedInOptions && c.lockedInOptions.length > 0 && c.lockedInOptions.some(lo => lo && lo.choices.some(lc => lc.attributeReassignments.length > 0)));

			lockedInChoicesWithReassignments.forEach(c =>
			{
				let optionRule = c.lockedInOptions.find(o => o.choices.some(c => c.attributeReassignments.length > 0));

				const choicesWithReassignments = optionRule.choices.filter(orChoice => orChoice.attributeReassignments && orChoice.attributeReassignments.length > 0 && orChoice.attributeReassignments.find(ar => ar.choiceId === choice.lockedInChoice.choice.dpChoiceId || ar.divChoiceCatalogId === choice.lockedInChoice.choice.divChoiceCatalogId));

				if (choicesWithReassignments.length > 0)
				{
					// look for choices that have attribute Reassignments, then return only those that match the current choice
					let attributeReassignments: MappedAttributeGroup[] = [];

					choicesWithReassignments.forEach(arChoice =>
					{
						const parentChoice = choices.find(c => c.divChoiceCatalogId === arChoice.id);

						// apply reassignments when the parent has been selected
						if (parentChoice.quantity > 0)
						{
							let reassignments = arChoice.attributeReassignments.filter(ar => ar.choiceId === choice.lockedInChoice.choice.dpChoiceId || ar.divChoiceCatalogId === choice.lockedInChoice.choice.divChoiceCatalogId).map(ar => ar);
							let newAttributeReassignments = reassignments.map(x => new MappedAttributeGroup({ id: x.attributeGroupId, attributeReassignmentFromChoiceId: parentChoice.id }));

							attributeReassignments = [...attributeReassignments, ...newAttributeReassignments];
						}
					});

					if (attributeReassignments.length > 0)
					{
						// Add attribute reassignment attributeGroupIds to the mapped list
						mappedAttributeGroups = [...mappedAttributeGroups, ...attributeReassignments];
					}
				}
			});
		}
		else
		{
			if (choice.options && choice.options.length > 0)
			{
				// run through each option
				choice.options.forEach(o =>
				{
					let currentAttributeGroupIds: MappedAttributeGroup[] = o.attributeGroups.map(x => new MappedAttributeGroup({ id: x }));

					// find the rule for the current option
					const optionRule = optionRules.find(or => or.optionId === o.financialOptionIntegrationKey);

					if (optionRule)
					{
						// find the choice on the rule that matches the current chocie
						let orChoice = optionRule.choices.find(c => c.id === choice.id);

						if (orChoice)
						{
							// see if we need to filter out any attribute reassignments
							if (orChoice.attributeReassignments && orChoice.attributeReassignments.length > 0)
							{
								let reassignmentAttributeGroupIds = orChoice.attributeReassignments.map(ar => ar.attributeGroupId);

								// filter out any attributeGroupIds that are present in attributeReassignment
								currentAttributeGroupIds = currentAttributeGroupIds.filter(x => reassignmentAttributeGroupIds.findIndex(agId => agId === x.id) === -1);
							}
						}
					}

					mappedAttributeGroups = [...mappedAttributeGroups, ...currentAttributeGroupIds];
					mappedLocationGroups = [...mappedLocationGroups, ...o.locationGroups.map(x => new MappedLocationGroup({ id: x }))];
				});
			}
			else
			{
				// does not have options so we default to the choice for attributes and locations
				mappedAttributeGroups = choice.attributeGroups.map(x => new MappedAttributeGroup({ id: x }));
				mappedLocationGroups = choice.locationGroups.map(x => new MappedLocationGroup({ id: x }));
			}

			// check option rules for any attribute reassignments that we need to apply
			optionRules.forEach(optionRule =>
			{
				// return choices with reassignments where the toChoice is the current choice in the main loop
				const choicesWithReassignments = optionRule.choices.filter(orChoice => orChoice.attributeReassignments && orChoice.attributeReassignments.length > 0 && orChoice.attributeReassignments.find(ar => ar.choiceId === choice.id));

				if (choicesWithReassignments.length > 0)
				{
					// look for choices that have attribute Reassignments, then return only those that match the current choice
					let attributeReassignments: MappedAttributeGroup[] = [];

					choicesWithReassignments.forEach(arChoice =>
					{
						const parentChoice = choices.find(c => c.id === arChoice.id);
						let parentHasReassignment = parentChoice.lockedInOptions && parentChoice.lockedInOptions.length > 0 && parentChoice.lockedInOptions.some(o => o.choices && o.choices.some(c => c.attributeReassignments.length > 0 && c.attributeReassignments.findIndex(ar => ar.choiceId === choice.id || ar.divChoiceCatalogId === choice.divChoiceCatalogId) > -1));

						// apply reassignments when the parent has been selected, and isn't locked in via choice, or is locked in from a option rule.
						if (parentChoice.quantity > 0 && (!parentChoice.lockedInChoice && (parentChoice.lockedInOptions || parentChoice.lockedInOptions.length === 0) || parentHasReassignment))
						{
							let reassignments = arChoice.attributeReassignments.filter(ar => ar.choiceId === choice.id || ar.divChoiceCatalogId === choice.divChoiceCatalogId).map(ar => ar);
							let newAttributeReassignments = reassignments.map(x => new MappedAttributeGroup({ id: x.attributeGroupId, attributeReassignmentFromChoiceId: parentChoice.id }));

							attributeReassignments = [...attributeReassignments, ...newAttributeReassignments];
						}
					});

					if (attributeReassignments.length > 0)
					{
						// Add attribute reassignment attributeGroupIds to the mapped list
						mappedAttributeGroups = [...mappedAttributeGroups, ...attributeReassignments];
					}
				}
			});
		}

		choice.mappedAttributeGroups = mappedAttributeGroups;
		choice.mappedLocationGroups = mappedLocationGroups;

		// make sure the selected attributes are available to be selected
		choice.selectedAttributes = choice.selectedAttributes.filter(x =>
		{
			if (choice.mappedLocationGroups && choice.mappedLocationGroups.length)
			{
				// it would really be more accurate to check if these are valid locations, but I don't think
				// that is available here, and this should work for the purposes of attribute reassignment
				return choice.mappedLocationGroups.findIndex(lg => lg.id === x.locationGroupId) !== -1
					&& (!x.attributeGroupId || choice.mappedAttributeGroups.findIndex(ag => ag.id === x.attributeGroupId) !== -1);
			}
			else
			{
				return choice.mappedAttributeGroups.findIndex(ag => ag.id === x.attributeGroupId) !== -1;
			}
		});
	};

	rules.optionRules.forEach(optionRule => executeOptionRule(optionRule));

	choices.forEach(choice =>
	{
		// #364540
		// For any option on this choice that has a corresponding TimeOfSale record,
		// if every set of replace rules for that option is not satisified
		// (i.e., one or more Must Have's not selected and/or one or more Must Not Have's are selected)
		// use the new pricing, which was calculated earlier.
		// Otherwise, use the locked in price which is the time of sale price.
		let useLockedInPrice = true;

		for (const opt of choice.options)
		{
			if (timeOfSaleOptionPrices?.find(tos => tos.divChoiceCatalogID === choice.divChoiceCatalogId && tos.edhPlanOptionID === opt.id))
			{
				const replaceRules = rules.optionRules.filter(o => o.replaceOptions.includes(opt.financialOptionIntegrationKey));

				if (replaceRules && replaceRules.length && replaceRules.every(rr => rr.choices.some(rrc => (!rrc.mustHave && find(rrc.id).quantity >= 1) || (rrc.mustHave && find(rrc.id).quantity === 0))))
				{
					useLockedInPrice = false;
					break;
				}
			}
		}

		// #366542
		// Check if this choice contains any options that have been replaced but no longer exist on the current tree
		const hasRemovedOption = timeOfSaleOptionPrices?.filter(tos => tos.divChoiceCatalogID === choice.divChoiceCatalogId)
			.map(tos => tos.edhPlanOptionID)
			.some(optionId =>
			{
				const financialOptionIntegrationKey = options.find(o => o.id === optionId)?.financialOptionIntegrationKey;

				if (financialOptionIntegrationKey)
				{
					// Find any active rules that replace this option
					const replaceRules = rules.optionRules.filter(o => o.replaceOptions.includes(financialOptionIntegrationKey));

					// Find any choices with locked in options that still replace this option
					const existingChoices = choices.filter(ch => ch.id !== choice.id && _.flatMap(ch.lockedInOptions, lio => lio.replaceOptions).includes(financialOptionIntegrationKey));

					// If no rules currently replace this option, and no locked in options replace this option, then this choice has a removed option
					return !replaceRules.length && !existingChoices.length;
				}

				return false;
			});

		// Determine if any choices that currently affect this choice via replace rules are properly selected, etc.
		const optionRuleChoices = rules.optionRules
			.filter(o => o.replaceOptions.some(ro => choice.options.map(opt => opt.financialOptionIntegrationKey).includes(ro)))
			.map(o => o.choices);

		const hasActiveValidChoices = optionRuleChoices
			.some(choices => choices.every(ch => (find(ch.id).quantity && ch.mustHave) || (!find(ch.id).quantity && !ch.mustHave)));

		//lock in prices
		if (choice.lockedInChoice && useLockedInPrice && (!hasRemovedOption || (!hasActiveValidChoices && optionRuleChoices?.length > 0)))
		{
			choice.price = choice.lockedInChoice.choice.dpChoiceCalculatedPrice;
		}

		// #332687
		// Check every selected choice for replace rules to prevent re-introducing replaced options
		if (choice.lockedInOptions && choice.lockedInOptions.length)
		{
			for (let i = choice.lockedInOptions.length - 1; i >= 0; i--)
			{
				const filteredOptRules = rules.optionRules.filter(optRule => optRule.replaceOptions && optRule.replaceOptions.length
					&& optRule.replaceOptions.includes(choice.lockedInOptions[i].optionId)
					&& optRule.choices.every(c => (c.mustHave && choices.find(ch => ch.id === c.id && ch.quantity) || (!c.mustHave && choices.find(ch => ch.id === c.id && !ch.quantity)))));

				// If the entire option rule is satisfied (Must Have's are all selected, Must Not Have's are all deselected), then remove the lockedInOption
				if (filteredOptRules && filteredOptRules.length) 
				{
					const removedMapping = choice.lockedInOptions.splice(i, 1);

					//remove attribute groups from choice if they belong to the replaced option
					if (choice.lockedInChoice && choice.lockedInChoice.choice.hasOwnProperty('jobChoiceAttributes'))
					{
						let lockedInChoice = choice.lockedInChoice.choice as JobChoice;
						let j = choice.lockedInChoice.optionAttributeGroups.findIndex(oa => oa.optionId === removedMapping[0].optionId);
						let removedOption = choice.lockedInChoice.optionAttributeGroups.splice(j, 1);
						lockedInChoice.jobChoiceAttributes = lockedInChoice.jobChoiceAttributes.filter(jca =>
							removedOption[0].attributeGroups.indexOf(jca.attributeGroupCommunityId) === -1
							|| choice.lockedInChoice.optionAttributeGroups.some(o => o.attributeGroups.indexOf(jca.attributeGroupCommunityId) !== -1));
						lockedInChoice.jobChoiceLocations = lockedInChoice.jobChoiceLocations.filter(jcl =>
							removedOption[0].locationGroups.indexOf(jcl.locationGroupCommunityId) === -1
							|| choice.lockedInChoice.optionAttributeGroups.some(o => o.locationGroups.indexOf(jcl.locationGroupCommunityId) !== -1));
					}
				}
			}
		}

		//find choices that are locked in, with option mappings changed
		if (choice.options && choice.lockedInChoice && (choice.lockedInOptions && choice.lockedInOptions.length && choice.lockedInOptions.some(o => !choice.options.some(co => o && co.financialOptionIntegrationKey === o.optionId))
			|| choice.options.some(co => !choice.lockedInOptions.some(o => o.optionId === co.financialOptionIntegrationKey))))
		{
			choice.options = choice.lockedInOptions.map(o => options.find(po => o && po.financialOptionIntegrationKey === o.optionId));
			choice.mappingChanged = true;

			//since the option mapping is changed, flag each dependency
			choice.lockedInOptions.forEach(o =>
			{
				if (o)
				{
					o.choices.forEach(c =>
					{
						let pt = points.find(p => p.choices.some(ch => ch.divChoiceCatalogId === c.id));

						if (pt && pt.pointPickTypeId <= 2)
						{
							//Pick 1 or Pick 0-1
							pt.choices.filter(ch => ch.divChoiceCatalogId !== c.id).forEach(depChoice =>
							{
								depChoice.changedDependentChoiceIds = _.uniq([...depChoice.changedDependentChoiceIds, c.id]);
							})
						}
						else
						{
							let depChoice = choices.find(ch => ch.divChoiceCatalogId === c.id);

							if (depChoice && depChoice.divChoiceCatalogId !== c.id)
							{
								depChoice.changedDependentChoiceIds = _.uniq([...depChoice.changedDependentChoiceIds, c.id]);
							}
						}
					});
				}
			});
		}

		// #368758
		// If this choice has an option that replaces another,
		// and that option is not currently on the configuration,
		// this choice must be disabled

		// Find mapped options on this choice
		const optionRules = rules.optionRules.filter(o => o.choices.map(c => c.id).includes(choice.id));
		const choiceOptionNumbers = choice.options?.map(o => o.financialOptionIntegrationKey) || [];
		const mappedOptionRules = optionRules.filter(o => choiceOptionNumbers.includes(o.optionId));

		// Find all other choices which must have this choice, and exclude those from affecting whether this choice is disabled
		const excludedChoiceRules = _.flatMap(rules.choiceRules.filter(cr => _.flatMap(cr.rules.filter(r => r.ruleType === 1), r => r.choices).includes(choice.id)), cr => cr.choiceId);

		const pointChoices = points.find(pt => pt.choices.some(c => c.id === choice.id)).choices.map(c => c.id);

		// Find replaced options on the mapped options
		const replacedOptions = _.flatMap(mappedOptionRules, r => r.replaceOptions);

		// In the case of multiple replaced options, if any one option is already on the configuration, disregard this
		if (!replacedOptions.some(ro =>
		{
			const mappedChoices = _.flatMap(rules.optionRules.filter(o => o.optionId === ro), r => r.choices).filter(c => !excludedChoiceRules.includes(c.id));

			// Determine if this option has been replaced by another selection/rule (issue 380127)
			const replacedByOther = _.flatMap(rules.optionRules.filter(o => o.replaceOptions.includes(ro)), r => r.choices)
				.filter(ch => choice.id !== ch.id && !mappedChoices.map(mc => mc.id).includes(ch.id))
				.some(ch => (ch.mustHave && find(ch.id).quantity) || (!ch.mustHave && !find(ch.id).quantity));

			return !mappedChoices.filter(mc => (pointChoices.includes(mc.id) && ((mc.mustHave && find(mc.id).quantity) || (!mc.mustHave && !find(mc.id).quantity)))
				|| ((!mc.mustHave && find(mc.id).quantity) || (mc.mustHave && !find(mc.id).quantity))).length
				&& !replacedByOther;
		}))
		{
			replacedOptions.forEach(ro =>
			{
				const mappedChoices = _.flatMap(rules.optionRules.filter(o => o.optionId === ro), r => r.choices).filter(c => !excludedChoiceRules.includes(c.id));

				const otherChoices = _.flatMap(rules.optionRules.filter(o => o.replaceOptions.includes(ro)), r => r.choices)
					.filter(ch => choice.id !== ch.id
						&& !mappedChoices.map(mc => mc.id).includes(ch.id)
						&& ((ch.mustHave && find(ch.id).quantity)
							|| (!ch.mustHave && !find(ch.id).quantity)));

				choice.disabledByReplaceRules = mappedChoices.filter(mc => (pointChoices.includes(mc.id) && ((mc.mustHave && find(mc.id).quantity) || (!mc.mustHave && !find(mc.id).quantity)))
					|| ((!mc.mustHave && find(mc.id).quantity) || (mc.mustHave && !find(mc.id).quantity))).map(mc => mc.id)
					.concat(otherChoices.map(ch => ch.id));

				// If this choice becomes disabled, deselect it, but only if the choice is not already locked in
				if (choice.disabledByReplaceRules?.length && !choice.lockedInChoice)
				{
					choice.quantity = 0;

					// If any choices with options being replaced exist within the same DP or elsewhere, there is a setup issue (user error)
					if (otherChoices.length || points.find(pt => pt.choices.some(c => c.id === choice.id) && pt.choices.some(c => choice.disabledByReplaceRules.includes(c.id))))
					{
						choice.disabledByBadSetup = true;
					}
				}
			});
		}

		// #367382
		// If this choice has an option that is already on the config,
		// as part of another choice, this choice needs to be disabled
		choice.options.forEach(opt =>
		{
			if (opt)
			{
				const choicesWithLockedInOpt = choices.filter(ch => ch.lockedInOptions.find(lio => lio.optionId === opt.financialOptionIntegrationKey) && ch.id !== choice.id).map(ch => ch.id);

				if (choicesWithLockedInOpt)
				{
					choice.disabledByRelocatedMapping = choice.disabledByRelocatedMapping.concat(choicesWithLockedInOpt);
				}
			}
		});

		mapLocationAttributes(choice);
	});
}

function getMaxQuantity(option: PlanOption, choice: Choice): number
{
	let maxQuantity = option.maxOrderQuantity;
	let choiceMaxQuantity = choice ? choice.choiceMaxQuantity as number : null;

	if (choiceMaxQuantity != null)
	{
		//If there is an option tied to a default choice and Choice Admin set - up a max quantity in the slide out panel, then the minimum quantity of the two will be used.
		maxQuantity = Math.min(choiceMaxQuantity, maxQuantity);
	}

	return maxQuantity;
}

/**
 * Get the Max sort Order Choice meaning, the choice lowest on the tree.  chocies can be either choiceId or divChoiceCatalogId
 * @param tree
 * @param choices
 */
export function getMaxSortOrderChoice(tree: Tree, choices: number[]): number
{
	const sortedChoices = choices.sort((a, b) =>
	{
		let [ga, gb] = [
			tree.treeVersion.groups.find(g => g.subGroups.some(sg => sg.points.some(p => p.choices.some(c => c.id === a || c.divChoiceCatalogId === a)))),
			tree.treeVersion.groups.find(g => g.subGroups.some(sg => sg.points.some(p => p.choices.some(c => c.id === b || c.divChoiceCatalogId === b))))
		];

		if (ga.sortOrder !== gb.sortOrder)
		{
			return ga.sortOrder - gb.sortOrder;
		}

		let [sga, sgb] = [
			ga.subGroups.find(sg => sg.points.some(p => p.choices.some(c => c.id === a || c.divChoiceCatalogId === a))),
			gb.subGroups.find(sg => sg.points.some(p => p.choices.some(c => c.id === b || c.divChoiceCatalogId === b)))
		];

		if (sga.sortOrder !== sgb.sortOrder)
		{
			return sga.sortOrder - sgb.sortOrder;
		}

		let [dpa, dpb] = [
			sga.points.find(p => p.choices.some(c => c.id === a || c.divChoiceCatalogId === a)),
			sgb.points.find(p => p.choices.some(c => c.id === b || c.divChoiceCatalogId === b))
		];

		if (dpa.sortOrder !== dpb.sortOrder)
		{
			return dpa.sortOrder - dpb.sortOrder;
		}

		return dpa.choices.find(c => c.id === a || c.divChoiceCatalogId === a).sortOrder - dpb.choices.find(c => c.id === b || c.divChoiceCatalogId === b).sortOrder;
	});

	return sortedChoices[sortedChoices.length - 1];
}

export function setPriceBreakdown(priceBreakdown: PriceBreakdown, tree: Tree, options: PlanOption[], homesite: number, originalPrice: number, planPrice: number): PriceBreakdown
{
	let base = options ? options.find(o => o.isBaseHouse) : null;

	if (base && tree)
	{
		let choicePrices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, p => p.choices)))
			.reduce((acc, ch) => acc + (ch.quantity * ch.price), 0);

		priceBreakdown = { ...priceBreakdown, baseHouse: planPrice, selections: choicePrices };
	}

	priceBreakdown.homesite = homesite;
	priceBreakdown.totalPrice = getTotalPrice(priceBreakdown);
	priceBreakdown.changePrice = priceBreakdown.totalPrice - originalPrice;

	return priceBreakdown;
}

export function getTotalPrice(priceBreakdown: PriceBreakdown): number
{
	let total = priceBreakdown.baseHouse || 0;

	total += priceBreakdown.homesite || 0;
	total += priceBreakdown.homesiteEstimate || 0;
	total += priceBreakdown.selections || 0;
	total += priceBreakdown.designEstimate || 0;
	total -= priceBreakdown.salesProgram || 0;
	total += priceBreakdown.nonStandardSelections || 0;
	total += priceBreakdown.priceAdjustments || 0;

	return total;
}

export function setPointStatus(point: DecisionPoint)
{
	if (!point.choices.some(c => c.enabled) || !point.enabled)
	{
		point.status = PointStatus.CONFLICTED;
	}
	else if (point.choices.some(c => c.quantity > 0 && !isChoiceAttributesComplete(c)))
	{
		point.status = PointStatus.PARTIALLY_COMPLETED;
	}
	else if (point.completed)
	{
		point.status = PointStatus.COMPLETED;
	}
	else if ([PickType.Pick1, PickType.Pick1ormore].indexOf(point.pointPickTypeId) !== -1 && !point.choices.some(c => c.quantity > 0))
	{
		point.status = PointStatus.REQUIRED;
	}
	else if (point.viewed)
	{
		point.status = PointStatus.VIEWED;
	}
	else
	{
		point.status = PointStatus.UNVIEWED;
	}
}

export function setSubgroupStatus(subGroup: SubGroup)
{
	if (!subGroup.points || subGroup.points.every(p => !p.enabled))
	{
		subGroup.status = PointStatus.CONFLICTED;
	}
	else if (subGroup.points.some(p => p.status === PointStatus.REQUIRED))
	{
		subGroup.status = PointStatus.REQUIRED;
	}
	else if (subGroup.points.some(p => p.status === PointStatus.PARTIALLY_COMPLETED))
	{
		subGroup.status = PointStatus.PARTIALLY_COMPLETED;
	}
	else if (subGroup.points.every(p => p.status === (PointStatus.COMPLETED) || p.status === (PointStatus.CONFLICTED)))
	{
		subGroup.status = PointStatus.COMPLETED;
	}
	else if (subGroup.points.every(p => p.viewed || p.status === (PointStatus.CONFLICTED)))
	{
		subGroup.status = PointStatus.VIEWED;
	}
	else
	{
		subGroup.status = PointStatus.UNVIEWED;
	}
}

export function setGroupStatus(group: Group)
{
	if (group.subGroups.some(sg => sg.status === PointStatus.REQUIRED))
	{
		group.status = PointStatus.REQUIRED;
	}
	else if (group.subGroups.some(sg => sg.status === PointStatus.UNVIEWED))
	{
		group.status = PointStatus.UNVIEWED;
	}
	else if (group.subGroups.some(sg => sg.status === PointStatus.VIEWED))
	{
		group.status = PointStatus.VIEWED;
	}
	else if (group.subGroups.some(sg => sg.status === PointStatus.PARTIALLY_COMPLETED))
	{
		group.status = PointStatus.PARTIALLY_COMPLETED;
	}
	else if (group.subGroups.some(sg => sg.status === PointStatus.COMPLETED))
	{
		group.status = PointStatus.COMPLETED;
	}
	else
	{
		group.status = PointStatus.CONFLICTED;
	}
}

export function getChoiceToDeselect(tree: Tree, toggledChoice: Choice): Choice 
{
	if (toggledChoice.quantity)
	{
		return toggledChoice;
	}

	const point = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points))
		.find(p => p.id === toggledChoice.treePointId);

	return point.pointPickTypeId === PickType.Pick0or1 || point.pointPickTypeId === PickType.Pick1
		? point.choices.find(c => !!c.quantity)
		: null;
}

function exludeConflictedRules(rules: TreeVersionRules, tree: Tree): TreeVersionRules
{
	return {
		optionRules: rules.optionRules,
		choiceRules: rules.choiceRules.filter(cr =>
		{
			let choice = findChoice(tree, ch => ch.id === cr.choiceId);
			if (!choice.quantity)
			{
				//choice not selected, so irrelevant
				return true;
			}

			return cr.rules.some(r => r.ruleType === 1
				? r.choices.every(c => findChoice(tree, ch => ch.id === c)?.quantity > 0)
				: r.choices.every(c => findChoice(tree, ch => ch.id === c)?.quantity == 0))
		}),
		pointRules: rules.pointRules.filter(pr =>
		{
			let point = findPoint(tree, pt => pt.id === pr.pointId);
			if (!point.completed)
			{
				//point not completed, so irrelevant
				return true;
			}

			return pr.rules.some(r => r.ruleType === 1
				? (r.choices && r.choices.length
					? r.choices.every(c => findChoice(tree, ch => ch.id === c)?.quantity > 0)
					: r.points.every(p => findPoint(tree, pt => pt.id === p)?.completed))
				: (r.choices && r.choices.length
					? r.choices.every(c => findChoice(tree, ch => ch.id === c)?.quantity == 0)
					: r.points.every(p => !findPoint(tree, pt => pt.id === p)?.completed))
			);
		}),
		lotChoiceRules: [] //not going to worry about this here as it doesn't involve tree changes
	}
}

export function getDependentChoices(tree: Tree, rules: TreeVersionRules, options: PlanOption[], choice: Choice): Array<Choice>
{
	let newTree = _.cloneDeep(tree);

	//deselecting choice
	if (choice.quantity)
	{
		findChoice(newTree, ch => ch.id === choice.id).quantity = 0;
	}
	else 
	{
		selectChoice(newTree, choice.id); //this checks pick type and clears other choices if necessary
		findChoice(newTree, ch => ch.id === choice.id).quantity = 1;
	}

	const newRules = exludeConflictedRules(rules, tree);

	//clear locked in data on the cloned tree so we can see which choices "should"
	//be disabled
	_.flatMap(newTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, p => p.choices)))
		.forEach(ch =>
		{
			ch.lockedInChoice = null;
			ch.lockedInOptions = [];
		});

	//apply rules to cloned tree
	applyRules(newTree, newRules, options);

	//return any choices that are locked in (i.e. previously sold), but are disabled on the new tree
	return _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, p => p.choices)))
		.filter(ch => !!ch.lockedInChoice && !findChoice(newTree, ch1 => ch1.id === ch.id).enabled);
}

export function checkReplacedOption(deselectedChoice: Choice, rules: TreeVersionRules, choices: Choice[], options: PlanOption[], tree: Tree)
{
	// #332687
	// If deselecting a choice that had replaced a previous choice,
	// we need to retrieve that previous choice and restore its options
	if (deselectedChoice.options && deselectedChoice.options.length)
	{
		const optionRules = rules.optionRules.filter(opt => deselectedChoice.options.map(o => o.financialOptionIntegrationKey).includes(opt.optionId) && opt.replaceOptions && opt.replaceOptions.length);

		optionRules.forEach(optRule =>
		{
			optRule.replaceOptions.forEach(replaceOptionId =>
			{
				let replaceOptionRule = rules.optionRules.find(r => r.optionId === replaceOptionId);
				const maxSortOrderChoice = getMaxSortOrderChoice(tree, replaceOptionRule.choices.filter(ch => ch.mustHave).map(ch => ch.id));
				const prevChoice = choices.find(ch => ch.id === maxSortOrderChoice);

				if (prevChoice && prevChoice.lockedInChoice)
				{
					// lockedInOptions uses divChoiceCatalogID instead of dpChoiceId.
					// fetch divChoiceCatalogID from the tree
					replaceOptionRule = {
						...replaceOptionRule,
						choices: replaceOptionRule.choices.map(c => (
							{ ...c, id: findChoice(tree, tc => tc.id === c.id)?.divChoiceCatalogId || c.id }
						))
					};

					if (prevChoice.lockedInOptions)
					{
						prevChoice.lockedInOptions.push(replaceOptionRule);
					}
					else
					{
						prevChoice.lockedInOptions = [replaceOptionRule];
					}
				}
			});
		});
	}
}

export function getChoicesWithNewPricing(tree: Tree, rules: TreeVersionRules, options: PlanOption[], selectedChoice: Choice, deselectedChoice: Choice)
{
	let newTree = _.cloneDeep(tree);

	let affectedChoices = [];

	if (deselectedChoice && deselectedChoice.id !== selectedChoice.id && deselectedChoice.lockedInOptions)
	{
		affectedChoices = _.flatMap(deselectedChoice.lockedInOptions.map(lio => lio.choices)).map(c => c.id);

		findChoice(newTree, ch => ch.id === deselectedChoice.id).quantity = 0;
	}

	// When selecting a choice, set the quantity to apply rules
	if (selectedChoice.id !== deselectedChoice?.id)
	{
		findChoice(newTree, ch => ch.id === selectedChoice.id).quantity = 1;
	}

	const newRules = exludeConflictedRules(rules, tree);

	//clear locked in data on the cloned tree so we can see which choices "should"
	//be disabled
	_.flatMap(newTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, p => p.choices)))
		.forEach(ch =>
		{
			ch.lockedInChoice = null;
			ch.lockedInOptions = [];
		});

	//apply rules to cloned tree
	applyRules(newTree, newRules, options);

	// Re-check the tree in the case of selecting a choice
	if (selectedChoice.id !== deselectedChoice?.id)
	{
		// Get the options mapped to this selected choice
		const selectedOpts = selectedChoice.options.map(o => o.financialOptionIntegrationKey);

		// Find what options are being replaced
		const replacedOpts = _.flatMap(newRules.optionRules.filter(r => selectedOpts.includes(r.optionId)), r => r.replaceOptions);

		// Find what choices are associated with these replaced options
		const divChoiceCatalogIds = _.flatMap(newRules.optionRules.filter(r => replacedOpts.includes(r.optionId)), r => r.choices.map(c => c.id))
			.map(c => findChoice(newTree, ch => ch.id === c)?.divChoiceCatalogId);

		// Add them to the affected list
		affectedChoices = affectedChoices.concat(divChoiceCatalogIds);
	}

	return _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, p => p.choices)))
		.filter(ch => affectedChoices.includes(ch.divChoiceCatalogId) && ch.price !== findChoice(newTree, ch1 => ch1.id === ch.id)?.price);
}
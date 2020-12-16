import { Tree, DecisionPoint, Choice, MappedAttributeGroup, MappedLocationGroup } from '../models/tree.model';
import { TreeVersionRules, ChoiceRules, PointRules, OptionRule } from '../models/rule.model';
import { PlanOption } from '../models/option.model';
import { PriceBreakdown } from '../models/scenario.model';
import { JobChoice } from '../models/job.model';
import { ChangeOrderChoice } from '../models/job-change-order.model';

import * as _ from 'lodash';

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

	if (point.pointPickTypeId <= 2)
	{
		point.choices.filter(c => c.id !== selectedChoice).forEach(c => {
			c.quantity = 0;
			c.selectedAttributes = [];
		});
	}
}

export function applyRules(tree: Tree, rules: TreeVersionRules, options: PlanOption[])
{
	let points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).filter(x => x.treeVersionId === tree.treeVersion.id);
	let choices = _.flatMap(points, p => p.choices).filter(x => x.treeVersionId === tree.treeVersion.id);

	choices.forEach(ch =>
	{
		ch.maxQuantity = ch.choiceMaxQuantity || 1;
		ch.price = 0;
		ch.enabled = true;
		ch.options = [];
		ch.disabledBy = [];
		ch.changedDependentChoiceIds = [];
		ch.mappingChanged = false;
	});

	points.forEach(pt =>
	{
		pt.enabled = true;
		pt.disabledBy = [];
	});

	let find = id => choices.find(ch => ch.id === id);

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
			choice.quantity = 0;
			choice.disabledBy.push(cr);
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
				if (r.choices.filter(c => { let ch = findChoice(tree, c1 => c1.id === c); return !ch || !ch.quantity; }).length === 0
					&& r.points.filter(p => { let pt = findPoint(tree, p1 => p1.id === p); return !pt || !pt.completed; }).length === 0)
				{
					enabled = true;
				}
			}
			else
			{
				if (r.choices.filter(c => { let ch = findChoice(tree, c1 => c1.id === c); return !ch || ch.quantity; }).length === 0
					&& r.points.filter(p => { let pt = findPoint(tree, p1 => p1.id === p); return !pt || pt.completed; }).length === 0)
				{
					enabled = true;
				}
			}
		});

		if (!enabled)
		{
			point.choices.forEach(ch => { ch.quantity = 0; ch.enabled = false; });
			point.completed = false;
			point.disabledBy.push(pr);
		}

		point.enabled = enabled;
		pr.executed = true;
	}

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

		if (option.maxOrderQuantity > 1)
		{
			const choice = choices.find(c => c.id === optionRule.choices[0].id); //TODO: check if quantity options can be mapped to multiple choices

			if (!choice)
			{
				return;
			}
			else
			{
				//quantity options shouldn't be able to have replace rules (check this assumption)
				choice.maxQuantity = getMaxQuantity(option, choice);
				choice.price = option.listPrice;
				choice.options = [...choice.options, option];
			}
		}
		else
		{
			let calculatedPrice = option.calculatedPrice;

			// Handle replace price here. We need to remove the list price of the options that are being removed
			// because the cost of this option is really a delta
			if (optionRule.replaceOptions.length > 0)
			{
				const replaceOptions = optionRule.replaceOptions
					.map(o => options.find(opt => opt.financialOptionIntegrationKey === o))
					.filter(o => !!o);

				calculatedPrice = replaceOptions.reduce((pv, cv) => pv - cv.calculatedPrice, calculatedPrice);
			}

			const maxSortOrderChoice = getMaxSortOrderChoice(tree, optionRule.choices.filter(c => c.mustHave).map(c => c.id));
			const choice = find(maxSortOrderChoice);

			if (choice)
			{
				choice.maxQuantity = getMaxQuantity(option, choice);
			}

			// Apply the option price to the max sort order choice, if the rule is satisfied
			if (choice && optionRule.choices.every(c => c.id === choice.id || (c.mustHave && find(c.id).quantity >= 1) || (!c.mustHave && find(c.id).quantity === 0)))
			{
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
				let optionAttributeGroupIds = _.flatMap(choice.options, o => o.attributeGroups);
				let optionLocationGroupIds = _.flatMap(choice.options, o => o.locationGroups);

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

			if (choice.lockedInChoice.hasOwnProperty('jobChoiceAttributes'))
			{
				lockedInChoice = choice.lockedInChoice as JobChoice;

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
			else if (choice.lockedInChoice.hasOwnProperty('jobChangeOrderChoiceAttributes'))
			{
				lockedInChoice = choice.lockedInChoice as ChangeOrderChoice;

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
				let optionRule = choice.lockedInOptions.find(o => o.choices.some(c => c.attributeReassignments.length > 0));

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

			let lockedInChoicesWithReassignments = choices.filter(c => c.lockedInOptions && c.lockedInOptions.length > 0 && c.lockedInOptions.some(lo => lo.choices.some(lc => lc.attributeReassignments.length > 0)));

			lockedInChoicesWithReassignments.forEach(c =>
			{
				let optionRule = c.lockedInOptions.find(o => o.choices.some(c => c.attributeReassignments.length > 0));

				const choicesWithReassignments = optionRule.choices.filter(orChoice => orChoice.attributeReassignments && orChoice.attributeReassignments.length > 0 && orChoice.attributeReassignments.find(ar => ar.choiceId === choice.lockedInChoice.dpChoiceId));

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
							let reassignments = arChoice.attributeReassignments.filter(ar => ar.choiceId === choice.lockedInChoice.dpChoiceId).map(ar => ar);
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
						let parentHasReassignment = parentChoice.lockedInOptions && parentChoice.lockedInOptions.length > 0 && parentChoice.lockedInOptions.some(o => o.choices && o.choices.some(c => c.attributeReassignments.length > 0 && c.attributeReassignments.findIndex(ar => ar.choiceId === choice.id) > -1));

						// apply reassignments when the parent has been selected, and isn't locked in via choice, or is locked in from a option rule.
						if (parentChoice.quantity > 0 && (!parentChoice.lockedInChoice && (parentChoice.lockedInOptions || parentChoice.lockedInOptions.length === 0) || parentHasReassignment))
						{
							let reassignments = arChoice.attributeReassignments.filter(ar => ar.choiceId === choice.id).map(ar => ar);
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
		//lock in prices
		if (choice.lockedInChoice)
		{
			choice.price = choice.lockedInChoice.dpChoiceCalculatedPrice;
		}

		//find choices that are locked in, with option mappings changed
		if (choice.options && choice.lockedInOptions && choice.lockedInOptions.length && (choice.lockedInOptions.some(o => !choice.options.some(co => co.financialOptionIntegrationKey === o.optionId))
			|| choice.options.some(co => !choice.lockedInOptions.some(o => o.optionId === co.financialOptionIntegrationKey))))
		{
			choice.options = choice.lockedInOptions.map(o => options.find(po => po.financialOptionIntegrationKey === o.optionId));
			choice.mappingChanged = true;

			//since the option mapping is changed, flag each dependency 
			choice.lockedInOptions.forEach(o =>
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
			});
		}

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

export function getMaxSortOrderChoice(tree: Tree, choices: number[]): number
{
	const sortedChoices = choices.sort((a, b) =>
	{
		let [ga, gb] = [
			tree.treeVersion.groups.find(g => g.subGroups.some(sg => sg.points.some(p => p.choices.some(c => c.id === a)))),
			tree.treeVersion.groups.find(g => g.subGroups.some(sg => sg.points.some(p => p.choices.some(c => c.id === b))))
		];

		if (ga.sortOrder !== gb.sortOrder)
		{
			return ga.sortOrder - gb.sortOrder;
		}

		let [sga, sgb] = [
			ga.subGroups.find(sg => sg.points.some(p => p.choices.some(c => c.id === a))),
			gb.subGroups.find(sg => sg.points.some(p => p.choices.some(c => c.id === b)))
		];

		if (sga.sortOrder !== sgb.sortOrder)
		{
			return sga.sortOrder - sgb.sortOrder;
		}

		let [dpa, dpb] = [
			sga.points.find(p => p.choices.some(c => c.id === a)),
			sgb.points.find(p => p.choices.some(c => c.id === b))
		];

		if (dpa.sortOrder !== dpb.sortOrder)
		{
			return dpa.sortOrder - dpb.sortOrder;
		}

		return dpa.choices.find(c => c.id === a).sortOrder - dpb.choices.find(c => c.id === b).sortOrder;
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


export function getDependentChoices(tree: Tree, rules: TreeVersionRules, choice: Choice): Array<Choice>
{
	const treePoints = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
	const treeChoices = _.flatMap(treePoints, p => p.choices);

	//add dependencies from sold/locked options
	let dependencyChoiceIds = choice.changedDependentChoiceIds && choice.changedDependentChoiceIds.length
		? _.flatMap(choice.changedDependentChoiceIds.map(choiceId =>
		{
			let ch = treeChoices.find(c => c.divChoiceCatalogId === choiceId);

			if (ch)
			{
				return _.flatMap(ch.lockedInOptions.map(or =>
				{
					//if the deselected choice is on the option rule's path, remove that choice plus any subsequent choices.
					//otherwise, just remove the dependent choice plus any subsequent mapped choices.
					//this may need to recursively look at the impact of that choice being removed.
					let choiceIndex = or.choices.findIndex(c => c.id === choice.divChoiceCatalogId);
					return or.choices.slice(choiceIndex !== -1 ? choiceIndex + 1 : or.choices.findIndex(c => c.id === choiceId)).filter(c => c.mustHave).map(c => c.id);
				}));
			}
			else
			{
				return []; //shouldn't happen
			}
		}))
		: [];

	return _.uniqBy(
		[
			...(choice.quantity ? runRulesForDependentChoices(treePoints, treeChoices, rules, [choice]) : []),
			...dependencyChoiceIds.map(ch => treeChoices.find(c => c.divChoiceCatalogId === ch))
		],
		ch => ch.divChoiceCatalogId);
}

function runRulesForDependentChoices(treePoints: Array<DecisionPoint>, treeChoices: Array<Choice>, rules: TreeVersionRules, choices: Array<Choice>): Array<Choice>
{
	let ruleChoiceIds = [];
	let rulePointIds = [];

	choices.forEach(choice =>
	{
		if (rules.choiceRules)
		{
			rules.choiceRules.forEach(cr =>
			{
				const choiceRuleChoice = cr.rules ? cr.rules.find(r => r.ruleType === 1 && r.choices.some(c => c === choice.id)) : null;

				if (choiceRuleChoice && !ruleChoiceIds.find(x => x === cr.choiceId))
				{
					ruleChoiceIds.push(cr.choiceId);
				}
			});
		}

		if (rules.pointRules)
		{
			rules.pointRules.forEach(pr =>
			{
				const pointRuleChoice = pr.rules ? pr.rules.find(r => r.ruleType === 1 && r.choices.some(c => c === choice.id)) : null;
				const pointRulePoint = pr.rules ? pr.rules.find(r => r.ruleType === 1 && r.points.some(p => p === choice.treePointId)) : null;

				if ((pointRuleChoice || pointRulePoint) && !rulePointIds.find(x => x === pr.pointId))
				{
					rulePointIds.push(pr.pointId);
				}
			});
		}
	});

	let dependentChoices = treeChoices.filter(x => x.quantity > 0 && ruleChoiceIds.some(c => c === x.id)) || [];
	const dependentPoints = treePoints.filter(x => rulePointIds.some(p => p === x.id)) || [];

	dependentPoints.forEach(pt =>
	{
		const selectedChoice = pt.choices.find(x => x.quantity > 0);
		if (selectedChoice && !dependentChoices.find(x => x.id === selectedChoice.id))
		{
			dependentChoices.push(selectedChoice);
		}
	});

	if (dependentChoices.length)
	{
		const childDepChoices = runRulesForDependentChoices(treePoints, treeChoices, rules, dependentChoices);
		const newChildDepChoices = childDepChoices.filter(x => !dependentChoices.find(c => c.id === x.id));

		dependentChoices = [...dependentChoices, ...newChildDepChoices];
	}

	return dependentChoices;
}

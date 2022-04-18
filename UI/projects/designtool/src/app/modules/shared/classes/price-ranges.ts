import * as _ from 'lodash';
import { cloneDeep, flatMap, flatten, uniq } from 'lodash';

import { PlanOption, TreeVersionRules, PickType, Tree, getMaxSortOrderChoice, findChoice, findPoint, applyRules } from '../../../../../../phd-common/src/public-api';

export function getChoicePriceRanges(state: { options: PlanOption[], rules: TreeVersionRules, tree: Tree })
{
	if (!state.options || !state.rules || !state.tree)
	{
		return;
	}

	let staticTree = cloneDeep(state.tree);
	let rules = cloneDeep(state.rules);
	let options = cloneDeep(state.options);
	let points = flatMap(staticTree.treeVersion.groups, g => flatMap(g.subGroups, sg => sg.points));
	let choices = flatMap(points, p => p.choices);

	let maxSortOrderChoices = state.rules.optionRules.map(opt =>
	{
		let maxSortOrderChoices = [];
		let choiceIds = [];

		opt.optionMappings.forEach(om =>
		{
			// get all mustHave choices for the current optionMapping
			let currentChoiceIds = om.choices.filter(c => c.mustHave).map(c => c.id);

			// combine lists
			choiceIds = _.union(choiceIds, currentChoiceIds);

			// find the maxSortOrderChoice for each optionMapping / combine list
			maxSortOrderChoices = _.union(maxSortOrderChoices, [getMaxSortOrderChoice(staticTree, currentChoiceIds)]);
		});

		return {
			rule: opt,
			maxSortOrderChoices: maxSortOrderChoices,
			allChoices: choiceIds
		};
	});

	//find all the choices this one depends on
	//currently an issue getting the nested dependencies
	let getRelevantChoices = (ch: number, existing: number[] = []) =>
	{
		if (existing.indexOf(ch) !== -1)
		{
			return [];
		}

		var previousChoices = [
			...flatten(maxSortOrderChoices.filter(c => c.maxSortOrderChoices.findIndex(m => m === ch) > -1).map(c => c.allChoices.filter(c1 => c1 !== ch)))
		];

		return uniq(previousChoices);
	};

	type choiceSelection = { choiceId: number, selected: boolean };

	function* pointPermutations(points: number[], choices: number[] = []): IterableIterator<number[]>
	{
		//iterates through every possible combination of selections for the given DP
		const pt = findPoint(staticTree, p => p.id === points[0]);

		for (let choice of pt.choices)
		{
			if (points.length === 1)
			{
				yield [choice.id, ...choices];
			}
			else
			{
				yield* pointPermutations(points.slice(1), [choice.id]);
			}
		}
	}

	function* getPointRuleSelections(choice: choiceSelection, selections: choiceSelection[]): IterableIterator<choiceSelection[]>
	{
		//iterates through every minimal combination of choices that satisfy
		//any DP rules for the given choice
		const ch = findChoice(staticTree, c => c.id === choice.choiceId);
		const pointRules = rules.pointRules?.find(pr => pr.pointId === ch?.treePointId);

		if (pointRules && pointRules.rules.length)
		{
			//if point rules are already satisfied, yield the current selections
			if (pointRules.rules.some(r => r.ruleType === 1
				//must have
				? (r.choices && r.choices.length
					//point-to-choice rule - every choice must be selected
					? r.choices.every(c => selections.some(s => s.selected && s.choiceId === c))
					//point-to-point rule - every point must be completed (i.e. some choice in each point is selected)
					: r.points.every(p => selections.some(s => s.selected && findChoice(staticTree, c => c.id === s.choiceId)?.treePointId === p)))
				//must not have
				: (r.choices && r.choices.length
					//point-to-choice rule - no choice can be selected
					? r.choices.every(c => !selections.some(s => s.selected && s.choiceId === c))
					//point-to-point rule - no point can be completed
					: r.points.every(p => !selections.some(s => s.selected && findChoice(staticTree, c => c.id === s.choiceId)?.treePointId === p)))))
			{
				yield [...selections, choice];

				return;
			}

			//yield each possible way to satisfy point rules
			for (let rule of pointRules.rules)
			{
				if (rule.ruleType === 1)
				{
					if (rule.choices && rule.choices.length)
					{
						if (rule.choices.some(c => selections.some(s => s.choiceId === c && !s.selected)))
						{
							//no way to satisfy this point-to-choice rule, so yield nothing
							continue;
						}

						let newSelections = rule.choices.filter(c => !selections.some(s => s.choiceId === c && s.selected));

						if (newSelections.length)
						{
							//yield every way to satisfy the rules for new new choices
							yield* getSelections(newSelections.map(s => ({ choiceId: s, selected: true })), [...selections, choice]);
						}
					}
					else
					{
						if (rule.points.some(p =>
						{
							let pt = findPoint(staticTree, pt => pt.id === p);
							return pt && pt.choices.every(c => selections.some(s => s.choiceId === c.id && !s.selected));
						}))
						{
							//no way to satisfy this point-to-point rule, so yield nothing
							continue;
						}

						let newSelections = rule.points.filter(p => !selections.some(s => s.selected && findChoice(staticTree, c => c.id === s.choiceId)?.treePointId === p));

						if (newSelections.length)
						{
							//get each possible combination of choices that can complete the required DPs
							for (let pointPermutation of pointPermutations(newSelections))
							{
								//yield every way to satisfy the rules for the given choices
								yield* getSelections(pointPermutation.map(s => ({ choiceId: s, selected: true })), [...selections, choice]);
							}
						}
					}
				}
				else
				{
					//must not have
					if (rule.choices && rule.choices.length)
					{
						if (rule.choices.some(c => selections.some(s => s.choiceId === c && s.selected)))
						{
							//no way to satisfy the point-to-choice rule, so yield nothing
							continue;
						}

						let newSelections = rule.choices.filter(c => !selections.some(s => s.choiceId === c && !s.selected));

						if (newSelections.length)
						{
							//yield the current selections, with the rule's choices added
							//as deselected
							yield [...selections, ...newSelections.map(s => ({ choiceId: s, selected: false })), choice];
						}
					}
					else
					{
						if (rule.points.some(p => selections.some(s => s.selected && findChoice(staticTree, c => c.id === s.choiceId)?.treePointId === p)))
						{
							//no way to satisfy the point-to-point rule, so yield nothing
							continue;
						}

						let newSelections = rule.points.filter(p => !selections.some(s => s.selected && findChoice(staticTree, c => c.id === s.choiceId)?.treePointId === p));

						if (newSelections.length)
						{
							//yield the current selections, but add all choices within
							//the required DPs as deselected
							yield [...selections, choice, ..._.flatMap(newSelections, p => findPoint(staticTree, pt => pt.id === p)?.choices.map(c => ({ choiceId: c.id, selected: false })))];
						}
					}
				}
			}
		}
		else
		{
			//no DP rules exist, so go ahead and yield the current selections
			yield [...selections, choice];
		}
	}

	function* getChoiceRuleSelections(choice: choiceSelection, selections: choiceSelection[]): IterableIterator<choiceSelection[]>
	{
		//iterates through every minimal combination of choices that statisfies
		//all choice-to-choice rules for the given choice
		const choiceRules = rules.choiceRules?.find(cr => cr.choiceId === choice.choiceId);

		if (choiceRules && choiceRules.rules.length)
		{
			if (choiceRules.rules.some(r => r.ruleType === 1
				//must have - every choice has to be selected
				? r.choices.every(c => selections.some(s => s.selected && s.choiceId === c))
				//must not have - no choice can be selected
				: r.choices.every(c => !selections.some(s => s.selected && s.choiceId === c))))
			{
				//choice-to-choice rules are already satisfied with current selections,
				//so yield every possible combination of choices that satisfies
				//DP rules
				yield* getPointRuleSelections(choice, selections);

				return;
			}

			for (let rule of choiceRules.rules)
			{
				if (rule.ruleType === 1)
				{
					if (rule.choices.some(c => selections.some(s => s.choiceId === c && !s.selected)))
					{
						//no possible way to satisfy choice-to-choice rules, so yield nothing
						continue;
					}

					let newSelections = rule.choices.filter(c => !selections.some(s => s.choiceId === c && s.selected));

					if (newSelections.length)
					{
						//loop through every combination of choices that satisfy the 
						//rules for choices required by this rule
						for (let selection of getSelections(newSelections.map(s => ({ choiceId: s, selected: true })), [...selections, choice]))
						{
							//yield every minimal combination of selections that satisfy
							//point-to-point rules for the choice
							yield* getPointRuleSelections(choice, [...selections, ...selection]);
						}
					}
				}
				else 
				{
					if (rule.choices.some(c => selections.some(s => s.choiceId === c && s.selected)))
					{
						//no possible way to satisfy the choice-to-choice rule, so yield nothing
						continue;
					}

					let newSelections = rule.choices.filter(c => !selections.some(s => s.choiceId === c && !s.selected));

					if (newSelections.length)
					{
						//yield every minimal combination of selections that satisfy point rules
						//for this choice, but specify choices for this rule are deselected
						yield* getPointRuleSelections(choice, [...selections, ...newSelections.map(s => ({ choiceId: s, selected: false }))]);
					}
				}
			}
		}
		else
		{
			//no choice-to-choice rules, so go ahead and yield all the combinations
			//that satisfy point rules
			yield* getPointRuleSelections(choice, selections);
		}
	}

	function* getSelections(choices: choiceSelection[], selections: choiceSelection[] = []): IterableIterator<choiceSelection[]> 
	{
		if (choices.length === 0)
		{
			//no new choice, so yield the current selections
			yield selections;
		}
		else if (choices.length === 1)
		{
			//down to one choice. if this combination of selections does not violate
			//pick type rules, yield every combination that satisfied choice rules
			//for this choice
			let point = findPoint(staticTree, pt => pt.choices.some(ch => ch.id === choices[0].choiceId));

			if (point && (point.pointPickTypeId === PickType.Pick0ormore || point.pointPickTypeId === PickType.Pick1ormore
				|| point.choices.every(ch => !selections.some(s => s.selected && s.choiceId === ch.id))))
			{
				yield* getChoiceRuleSelections(choices[0], selections);
			}
		}
		else
		{
			//recursive step to reduce the problem to one choice at a time
			for (let selection of getSelections([choices[0]], selections))
			{
				yield* getSelections(choices.slice(1), selection);
			}
		}
	}

	//make an iterable with each possible choice selection
	function* choicePermutations(choices: number[], selections: { choiceId: number, selected: boolean }[] = []): IterableIterator<{ choiceId: number, selected: boolean }[]>
	{
		if (choices.length === 0)
		{
			//throw out combinations that violate pick types
			if (points.some(p => (p.pointPickTypeId === PickType.Pick0or1 || p.pointPickTypeId === PickType.Pick1) && selections.filter(s => p.choices.some(c => c.id === s.choiceId && s.selected)).length > 1))
			{
				return;
			}

			yield selections;
		}
		else
		{
			yield* choicePermutations(choices.slice(1), [{ choiceId: choices[0], selected: false }, ...selections]);
			yield* choicePermutations(choices.slice(1), [{ choiceId: choices[0], selected: true }, ...selections]);
		}
	}

	return choices.map(choice =>
	{
		var previousChoices = getRelevantChoices(choice.id);
		let min: number = null, max: number = null;

		if (previousChoices.length)
		{
			for (let perm of choicePermutations(previousChoices))
			{
				//try each way to satisfy point and choice rules for the given choices,
				//and add in the choice we're currently pricing
				for (let selections of getSelections([...perm.filter(p => p.selected), { choiceId: choice.id, selected: true }], perm.filter(p => !p.selected)))
				{
					choices.forEach(c =>
					{
						c.quantity = 0;
						c.enabled = true;
					});

					points.forEach(p =>
					{
						p.enabled = true;
						p.completed = false;
					});

					for (let p of [...selections])
					{
						let ch = findChoice(staticTree, c => c.id === p.choiceId);

						if (p.selected)
						{
							ch.quantity = 1;
						}
					}

					applyRules(staticTree, rules, options);

					let clonedChoice = findChoice(staticTree, c => c.id === choice.id);
					if (!clonedChoice.enabled)
					{
						//if the choice we're evaluating is not actually enabled, 
						//try the next combination. theoretically shouldn't get here,
						//but including this as a safety measure.
						continue;
					}

					if (clonedChoice.enabled && findPoint(staticTree, p => p.id === choice.treePointId).enabled)
					{
						if (min === null || min > clonedChoice.price)
						{
							min = clonedChoice.price;
						}

						if (max === null || max < clonedChoice.price)
						{
							max = clonedChoice.price;
						}
					}

					//since we've found a valid combination of choices, we can stop
					//iterating through the possibilities. this is the key to this 
					//function scaling reasonably.
					break;
				}
			}
		}
		else
		{
			//may not have to apply rules in this case; could possible look at just the option mappings. But this should be a smaller part of the overall
			//computation so I'll leave it as-is for now.
			choices.forEach(c =>
			{
				c.quantity = 0;
				c.enabled = true;
			});

			applyRules(staticTree, rules, options);

			let clonedChoice = choices.find(ch => ch.id === choice.id);

			if (min === null || min > clonedChoice.price)
			{
				min = clonedChoice.price;
			}

			if (max === null || max < clonedChoice.price)
			{
				max = clonedChoice.price;
			}
		}

		return {
			choiceId: choice.id,
			min,
			max
		};
	});
}

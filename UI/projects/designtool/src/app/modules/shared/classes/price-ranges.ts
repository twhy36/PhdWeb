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
		return {
			rule: opt,
			maxSortOrderChoice: getMaxSortOrderChoice(staticTree, opt.choices.filter(c => c.mustHave).map(c => c.id)),
			allChoices: opt.choices.filter(c => c.mustHave).map(c => c.id)
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

		var currentChoice = choices.find(c => c.id === ch);
		var previousChoices = [
			...flatten(state.rules.choiceRules.filter(r => r.choiceId === ch).map(r => flatMap(r.rules, r1 => r1.choices))),
			...flatten(state.rules.pointRules.filter(r => currentChoice.treePointId === r.pointId).map(r => flatMap(r.rules, r1 => r1.choices && r1.choices.length ? r1.choices : flatMap(points.filter(pt => r1.points.some(p => p === pt.id)), p => p.choices[0].id)))),
			...flatten(maxSortOrderChoices.filter(c => c.maxSortOrderChoice === ch).map(c => c.allChoices.filter(c1 => c1 !== ch)))
		];

		previousChoices.push(...flatten(previousChoices.map(c => getRelevantChoices(c, [ch, ...existing]))));

		return uniq(previousChoices);
	};

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

			//throw out combinations that violate choice rule
			if (state.rules.choiceRules.some(r =>
			{
				let ch = selections.find(s => s.choiceId === r.choiceId);

				if (ch && ch.selected)
				{
					return !r.rules.some(rule => (rule.ruleType === 1 && rule.choices.every(c1 =>
					{
						//must have rule satisfied if all choices are selected
						let c2 = selections.find(s => s.choiceId === c1);

						return c2 && c2.selected;
					})) || (rule.ruleType === 2 && rule.choices.every(c1 =>
					{
						//must not have satisfied if no choices are selected
						let c2 = selections.find(s => s.choiceId === c1);

						return !c2 || !c2.selected;
					})));
				}
				else
				{
					return false; //rule doesn't apply
				}
			}))
			{
				return;
			}

			//throw out combinations that violate point rule
			if (state.rules.pointRules.some(r =>
			{
				let point = points.find(p => r.pointId === p.id);
				let ch = selections.find(s => s.selected && point && point.choices.some(c => c.id === s.choiceId));

				if (ch && point)
				{
					return !r.rules.some(rule => (rule.ruleType === 1 && rule.choices.length && rule.choices.every(c1 =>
					{
						//must have rule satisfied if all choices are selected
						let c2 = selections.find(s => s.choiceId === c1);

						return c2 && c2.selected;
					})) || (rule.ruleType === 2 && rule.choices.length && rule.choices.every(c1 =>
					{
						//must not have satisfied if no choices are selected
						let c2 = selections.find(s => s.choiceId === c1);

						return !c2 || !c2.selected;
					})) || (rule.ruleType === 1 && rule.points.length && rule.points.every(p1 =>
					{
						//must have rule satisfied if all points are selected
						let c2 = selections.find(s =>
						{
							let p2 = points.find(p3 => p3.id === p1);

							return p2 && p2.choices.some(c => c.id === s.choiceId) && s.selected;
						});

						return !!c2;
					})) || (rule.ruleType === 2 && rule.points.length && rule.points.every(p1 =>
					{
						//must not have rule satisfied if no points are selected
						let c2 = selections.find(s =>
						{
							let p2 = points.find(p3 => p3.id === p1);

							return p2 && p2.choices.some(c => c.id === s.choiceId) && s.selected;
						});

						return !c2;
					})));
				}
				else
				{
					return false; //rule doesn't apply
				}
			}))
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

				for (let p of [...perm])
				{
					let ch = findChoice(staticTree, c => c.id === p.choiceId);

					if (p.selected)
					{
						ch.quantity = 1;
					}
				}

				applyRules(staticTree, rules, options);

				let clonedChoice = findChoice(staticTree, c => c.id === choice.id);

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

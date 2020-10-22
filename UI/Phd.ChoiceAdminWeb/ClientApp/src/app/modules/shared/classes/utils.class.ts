import { DTree } from '../models/tree.model';

export function getMaxSortOrderChoice(tree: DTree, choices: number[]): number
{
	const sortedChoices = choices.sort((a, b) =>
	{
		let [ga, gb] = [
			tree.version.groups.find(g => g.subGroups.some(sg => sg.points.some(p => p.choices.some(c => c.id === a)))),
			tree.version.groups.find(g => g.subGroups.some(sg => sg.points.some(p => p.choices.some(c => c.id === b))))
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

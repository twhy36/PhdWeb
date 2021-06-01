import {
	ChangeOrderChoice, SDGroup, SDSubGroup, SDPoint, SDChoice, Group
} from "phd-common";

import * as _ from 'lodash';

export function getCurrentHouseSelections(groups: Array<Group>)
{
	const selectionSummary = groups.map(g =>
	{
		let group = new SDGroup(g);

		group.subGroups = g.subGroups.map(sg =>
		{
			let subGroup = new SDSubGroup(sg);

			subGroup.points = sg.points.map(p =>
			{
				let point = new SDPoint(p);

				point.choices = p.choices.map(c =>
				{
					let choice = new SDChoice(c);

					return choice;
				}).filter(c => c.quantity > 0);

				return point;
			}).filter(dp => !!dp.choices.length)

			return subGroup;
		}).filter(sg => !!sg.points.length);

		return group;
	}).filter(g => !!g.subGroups.length);

	return selectionSummary;
}

export function getChangeOrderGroupSelections(groups: Array<Group>, jobChangeOrderChoices: Array<ChangeOrderChoice>)
{
	return _.flatMap(groups, g =>
	{
		return _.flatMap(g.subGroups, sg =>
		{
			return sg.points.map(dp =>
			{
				let point = new SDPoint(dp);
				point.groupName = g.label;
				point.subGroupName = sg.label;

				point.choices = dp.choices.map<SDChoice>(ch =>
				{
					let c = jobChangeOrderChoices.find(c => c.divChoiceCatalogId === ch.divChoiceCatalogId);
					if (!!c)
					{
						let choice = new SDChoice(ch);
						choice.quantity = c.quantity;
						if (dp.dPointTypeId === 1)
						{
							choice.isElevationChoice = true;
						}
						return choice;
					} else
					{
						return null;
					}
				}).filter(ch => !!ch);

				return point;
			}).filter(dp => dp.choices.length);
		});
	});
}

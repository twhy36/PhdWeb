import { Group } from 'phd-common';
import { SubGroupExt } from './subgroup-ext.model';

export class GroupExt extends Group
{
	price: number;
	subGroupsExt: SubGroupExt[];

	constructor(dto: Group) 
	{
		super(dto);
		this.subGroupsExt = dto.subGroups.map(sg => new SubGroupExt(sg));
		this.price = this.subGroupsExt.reduce((acc, sg) => acc + (sg.price || 0), 0);
	}
}
import { SubGroup } from "phd-common";

export class SubGroupExt extends SubGroup
{
    price: number;

	constructor(dto: SubGroup) {
        super(dto);
        this.price = dto.points.reduce((acc, pt) => acc + (pt.price || 0), 0);
    }
}
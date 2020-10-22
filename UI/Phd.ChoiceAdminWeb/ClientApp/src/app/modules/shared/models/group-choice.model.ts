export class GroupChoice {
	id: number;
	choiceLabel: string;
	pointLabel: string;
	subGroupLabel: string;
	groupLabel: string;

	constructor(gc?: GroupChoice) {
		if (gc) {
			Object.assign(this, gc);
		}
	}
}

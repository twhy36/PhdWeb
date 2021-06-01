import { Component, Input, EventEmitter, Output } from '@angular/core';

import { DivDGroup } from '../../models/group.model';

@Component({
	selector: 'tree-toggle',
	templateUrl: './tree-toggle.component.html',
	styleUrls: ['./tree-toggle.component.scss']
})
export class TreeToggleComponent
{
	@Input() groups: DivDGroup[] = [];
	@Input() showPoints: boolean = true;
	@Input() disableButtons: boolean = false;

	@Output() onToggle = new EventEmitter<{ openGroups: boolean, openSubGroups: boolean, openPoints: boolean }>();

	openGroups: boolean = true;
	openSubGroups: boolean = true;
	openPoints: boolean = true;

	constructor() { }

	emitToggle()
	{
		this.onToggle.emit({ openGroups: this.openGroups, openSubGroups: this.openSubGroups, openPoints: this.openPoints });
	}

	toggleGroups()
	{
		this.openGroups = !this.openGroups;

		// change subgroup chevron if openGroups is false
		if (!this.openGroups && this.openSubGroups)
		{
			this.openSubGroups = false;
		}

		// change point chevron if openGroups is false
		if (!this.openGroups && this.openPoints)
		{
			this.openPoints = false;
		}

		// open all groups
		this.groups.forEach(g =>
		{
			g.open = this.openGroups;

			// collapse all subgroups if openGroups is false
			if (!this.openGroups)
			{
				g.subGroups.forEach(sg =>
				{
					// only change if necessary
					if (sg.open)
					{
						sg.open = false;
					}

					sg.points.forEach(p =>
					{
						// only change if necessary
						if (p.open)
						{
							p.open = false;
						}
					})
				});
			}
		});

		this.emitToggle();
	}

	toggleSubGroups()
	{
		this.openSubGroups = !this.openSubGroups;

		// change group chevron if openSubGroups is true
		if (this.openSubGroups && !this.openGroups)
		{
			this.openGroups = true;
		}

		// change point chevron if openSubGroups is false
		if (!this.openSubGroups && this.openPoints)
		{
			this.openPoints = false;
		}

		this.groups.forEach(g =>
		{
			// make sure all groups are open if openSubGroups is true
			if (this.openSubGroups && !g.open)
			{
				g.open = true;
			}

			// collapse all points if openSubGroups is false
			if (!this.openSubGroups)
			{
				g.subGroups.forEach(sg =>
				{
					sg.points.forEach(p =>
					{
						// only change if necessary
						if (p.open)
						{
							p.open = false;
						}
					})
				});
			}

			// open all subgroups
			g.subGroups.forEach(sg => sg.open = this.openSubGroups);
		});

		this.emitToggle();
	}

	togglePoints()
	{
		this.openPoints = !this.openPoints;

		// change subgroup chevron if openPoints is true
		if (this.openPoints && !this.openSubGroups)
		{
			this.openSubGroups = true;
		}

		// change group chevron if openPoints is true
		if (this.openPoints && !this.openGroups)
		{
			this.openGroups = true;
		}

		this.groups.forEach(g =>
		{
			// make sure all groups and subgroups are open if openPoints is true
			if (this.openPoints)
			{
				// only open if necessary
				if (!g.open)
				{
					g.open = true;
				}

				g.subGroups.forEach(sg =>
				{
					// only open if necessary
					if (!sg.open)
					{
						sg.open = true;
					}
				});
			}

			// open all points
			g.subGroups.forEach(sg => sg.points.forEach(p => p.open = this.openPoints));
		});

		this.emitToggle();
	}
}

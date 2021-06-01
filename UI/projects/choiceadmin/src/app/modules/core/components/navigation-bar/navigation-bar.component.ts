import { TreeService } from '../../services/tree.service';
import { Component, OnInit } from '@angular/core';
import { Permission, UnsubscribeOnDestroy } from 'phd-common';

@Component({
	selector: 'navigation-bar',
	templateUrl: './navigation-bar.component.html',
	styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	Permission = Permission;

	isCollapsed = true;
	currentTreeVersionId: number;

	toggleCollapsed(): void
	{
		this.isCollapsed = !this.isCollapsed;
	}

	constructor(private _treeService: TreeService)
	{
		super();
	}

	ngOnInit()
	{
		this._treeService.currentTreeVersionId$.pipe(
			this.takeUntilDestroyed()
		).subscribe((treeVersionId: number) => this.currentTreeVersionId = treeVersionId);
	}
}

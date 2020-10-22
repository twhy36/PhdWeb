import { DTree } from './../../../shared/models/tree.model';
import { TreeService } from '../../services/tree.service';
import { Component, OnInit } from '@angular/core';
import { Permission } from 'phd-common/models';
import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';

@Component({
	selector: 'navigation-bar',
	templateUrl: './navigation-bar.component.html',
	styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	Permission = Permission;

	isCollapsed = true;
	currentTree: DTree;

	toggleCollapsed(): void
	{
		this.isCollapsed = !this.isCollapsed;
	}

	constructor(private _treeService: TreeService ) { super(); }

	ngOnInit() {
		this._treeService.currentTree.pipe(
			this.takeUntilDestroyed()
			).subscribe((tree: DTree) => this.currentTree = tree);
	}
}

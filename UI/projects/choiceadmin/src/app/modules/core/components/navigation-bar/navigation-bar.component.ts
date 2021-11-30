import { TreeService } from '../../services/tree.service';
import { Component, OnInit } from '@angular/core';
import { Permission, UnsubscribeOnDestroy, IdentityService } from 'phd-common';
import { environment } from '../../../../../environments/environment';

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
	environment = environment;
	canAccessColorManagment: boolean = false;

	toggleCollapsed(): void
	{
		this.isCollapsed = !this.isCollapsed;
	}

	constructor(private _treeService: TreeService, private _identityService: IdentityService)
	{
		super();
	}

	ngOnInit()
	{
		this._treeService.currentTreeVersionId$.pipe(
			this.takeUntilDestroyed()
		).subscribe((treeVersionId: number) => this.currentTreeVersionId = treeVersionId);

		this._identityService.hasClaimWithPermission('ColorManagement', Permission.Edit).pipe(
			this.takeUntilDestroyed(),
		).subscribe((hasClaim) =>
		{
			this.canAccessColorManagment = hasClaim;
		});
	}

	onColorManagementClicked()
	{
		const url = `${environment.colorManagementUrl}`;

		window.open(url, '_blank');
	}
}

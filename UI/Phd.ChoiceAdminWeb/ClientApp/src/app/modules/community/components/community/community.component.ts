import { Component, OnDestroy } from '@angular/core';

import { TreeService } from '../../../core/services/tree.service';

@Component({
	selector: 'community',
	templateUrl: './community.component.html',
	styleUrls: ['./community.component.scss']
})
export class CommunityComponent implements OnDestroy
{
	constructor(private _treeService: TreeService) { }

	ngOnDestroy()
	{
		this._treeService.clearCurrentTree();
	}
}

import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store, select } from '@ngrx/store';

import { Group, UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';

@Component({
	selector: 'group-list',
	templateUrl: './group-list.component.html',
	styleUrls: ['./group-list.component.scss']
// eslint-disable-next-line indent
})
export class GroupListComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() selectedSubGroupId: number;

	groups: Group[];

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	ngOnInit(): void
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree),
		).subscribe((tree) =>
		{
			this.groups = tree?.groups;
		});
	}

	isGroupActive(g: Group): boolean
	{
		return g.subGroups.flatMap(sg => sg.id).includes(this.selectedSubGroupId);
	}
}

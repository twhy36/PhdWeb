import { AfterViewInit, Component, ElementRef, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { Group, UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';

@Component({
	selector: 'group-list',
	templateUrl: './group-list.component.html',
	styleUrls: ['./group-list.component.scss']
// eslint-disable-next-line indent
})
export class GroupListComponent extends UnsubscribeOnDestroy implements OnInit, AfterViewInit
{
	@Input() selectedSubGroupId: number;
	@ViewChildren('groups', { read: ElementRef }) groupElements: QueryList<ElementRef>;

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

	ngAfterViewInit(): void
	{
		// Scrolls the currently selected group into view on initial load
		const selectedGroup = this.groups.find(g => g.subGroups.flatMap(sg => sg.id).includes(this.selectedSubGroupId));
		const element = this.groupElements.find(ge => ge.nativeElement.id === selectedGroup?.label);
		// Must be in a timeout or the scroll does not work, there is not a perfect lifecycle hook to put it in
		if (element)
		{
			setTimeout(() =>
			{
				element.nativeElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
			}, 15);
		}
	}

	isGroupActive(g: Group): boolean
	{
		return g.subGroups.flatMap(sg => sg.id).includes(this.selectedSubGroupId);
	}
}

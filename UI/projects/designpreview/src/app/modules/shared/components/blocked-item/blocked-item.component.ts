import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { Choice, SubGroup, TreeVersion, UnsubscribeOnDestroy } from 'phd-common';
import { BlockedByItem } from '../../models/blocked-by.model';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import { withLatestFrom } from 'rxjs/operators';
import _ from 'lodash';
import * as NavActions from '../../../ngrx-store/nav/actions';

@Component({
  selector: 'blocked-item',
  templateUrl: './blocked-item.component.html',
  styleUrls: ['./blocked-item.component.scss']
})
export class BlockedItemComponent  extends UnsubscribeOnDestroy implements OnInit {
	@Input() disabledByItem: BlockedByItem;
	@Input() isChoiceItem: boolean;
	@Input() conjunction: string;
	@Input() hiddenChoices: Choice[];
	@Output() blockedItemClick = new EventEmitter();

	isHiddenChoiceItem: boolean = false;
	myFavoriteId: number;
	filteredTree: TreeVersion;
	subGroups: SubGroup[];


	constructor(private store: Store<fromRoot.State>, private router: Router) { super() }

	ngOnInit(): void {
		this.isHiddenChoiceItem = this.hiddenChoices.some(choice => choice.id === this.disabledByItem.choiceId);
		
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree)))
			).subscribe(([fav, tree]) => {
				this.myFavoriteId = fav && fav.id;
				this.filteredTree = tree;
				this.subGroups = _.flatMap(tree.groups, g => _.flatMap(g.subGroups)) || [];
		});
	}

	onBlockedItemClick(pointId: number) {
		this.blockedItemClick.emit();
		const subGroup = this.subGroups.find(sg => !!sg.points.find(p => p.id === pointId))

		this.store.dispatch(new NavActions.SetSelectedSubgroup(subGroup.id, pointId, null));
		this.router.navigateByUrl(`/favorites/my-favorites/${this.myFavoriteId}/${subGroup.subGroupCatalogId}`);
	}

	displayBlockedItems() {
		return (this.isHiddenChoiceItem || this.disabledByItem.pointId === null) ? 'phd-hidden-item' : 'phd-clickable phd-blocked-link'
	}

}

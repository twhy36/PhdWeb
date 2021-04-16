import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from "@angular/router";
import { Store, select } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { UnsubscribeOnDestroy, ConfirmModalComponent } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as CommonActions from '../../../ngrx-store/actions';
import { FavoriteService } from '../../../core/services/favorite.service';
import { MyFavorite } from '../../../shared/models/my-favorite.model';

@Component({
	selector: 'manage-favorites',
	templateUrl: 'manage-favorites.component.html',
	styleUrls: ['manage-favorites.component.scss']
})
export class ManageFavoritesComponent extends UnsubscribeOnDestroy implements OnInit
{
	favoriteForm: FormGroup;
	favoriteNameInput: string = "";
	favoriteList: MyFavorite[];
	isDuplicateName: boolean = false;
	salesAgreementId: number = 0;

	constructor(
		private store: Store<fromRoot.State>,
		private router: Router,
		private toastr: ToastrService,
		private modalService: NgbModal,
		private favoriteService: FavoriteService)
    {
		super();
	}

	ngOnInit() {
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromSalesAgreement.salesAgreementState)
		).subscribe(sag => {
			this.salesAgreementId = sag ? sag.id : 0;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(fav => {
			this.favoriteList = fav.myFavorites;
		});

		this.createForm();
		this.store.dispatch(new CommonActions.ResetFavorites());
	}

	createForm() {
		this.favoriteForm = new FormGroup({
			'favoriteName': new FormControl(this.favoriteNameInput,
				[Validators.maxLength(50), Validators.required])
		});
	}

	createFavorite() {
		const favoriteName = this.favoriteForm.get('favoriteName').value.trim();

		if (favoriteName && favoriteName.length > 0) {
			if (this.favoriteList?.findIndex(x => x.name.toLowerCase() === favoriteName.toLowerCase()) > -1) {
				this.isDuplicateName = true;
			} else {
				this.favoriteService.saveMyFavorite(0, favoriteName, this.salesAgreementId)
					.subscribe(favorite => {
						if (favorite) {
							this.favoriteForm.reset();
							this.store.dispatch(new FavoriteActions.MyFavoriteCreated(favorite));
							this.router.navigateByUrl(`/favorites/my-favorites/${favorite.id}`);
						}
					},
					error => {
						this.toastr.error('Failed to create favorites list!', 'Error');
					});
			}
		}
	}

	onKeyup() {
		this.isDuplicateName = false;
	}

	get saveDisabled(): boolean {
		return this.favoriteList && this.favoriteList.length >= 3;
	}

	onMyFavorites(fav: MyFavorite)
	{
		this.store.dispatch(new FavoriteActions.SetCurrentFavorites(fav.id));
		this.router.navigateByUrl('/favorites/summary');
	}

	deleteFavorite(fav: MyFavorite)
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = 'This will permanently delete your list.';

		let confirm = this.modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'WARNING';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this.store.dispatch(new FavoriteActions.DeleteMyFavorite(fav));
			}
		}, (reason) =>
			{

			});
	}

}

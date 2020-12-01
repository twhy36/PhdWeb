import { Component, OnInit } from '@angular/core';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
	selector: 'manage-favorites',
	templateUrl: 'manage-favorites.component.html',
	styleUrls: ['manage-favorites.component.scss']
})
export class ManageFavoritesComponent extends UnsubscribeOnDestroy implements OnInit
{
	favoriteForm: FormGroup;
	favoriteNameInput: string = "";
	favoriteList = [];
	isDuplicateName: boolean = false;

	constructor()
    {
		super();
	}

	ngOnInit() {
		this.createForm();
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
			if (this.favoriteList.includes(favoriteName)) {
				this.isDuplicateName = true;
			} else {
				this.favoriteList.push(favoriteName);
				this.favoriteForm.reset();
			}
		}
	}

	onKeyup() {
		this.isDuplicateName = false;
	}

	get saveDisabled(): boolean {
		return this.favoriteList.length >= 3;
	}
}

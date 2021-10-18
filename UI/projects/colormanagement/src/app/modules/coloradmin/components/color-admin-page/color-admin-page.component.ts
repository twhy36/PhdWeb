import {Component, OnInit} from '@angular/core';
import { IdentityService } from 'phd-common';
import {ColorAdminService} from '../../../core/services/color-admin.service';

@Component({
	selector: 'color-admin',
	templateUrl: './color-admin-page.component.html',
	styleUrls: ['./color-admin-page.component.scss']
})

export class ColorAdminPageComponent implements OnInit
{
	user;
	editingColor = false;

	constructor(private _identityService: IdentityService,
				private _colorAdminService: ColorAdminService)
	{
		this._colorAdminService.editingColor$.subscribe(isEditing => {
			//'changed after checked' error was occurring; detectChanges doesn't fix;
			//using setTimeout is one of the recommended fixes - https://angular.io/errors/NG0100
			setTimeout(() => {
				this.editingColor = isEditing;
			}, 0);
		});
	}

	ngOnInit()
	{
		this._identityService.getRoles().subscribe(roles => {
			console.log("Roles: " + roles);
		});

		this._identityService.user.subscribe(user=>this.user=user);
	}
}

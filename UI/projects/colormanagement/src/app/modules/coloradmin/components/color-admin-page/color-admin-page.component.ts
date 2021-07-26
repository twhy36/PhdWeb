import { Component, OnInit } from '@angular/core';
import { Permission, Claims, ClaimTypes, IdentityService } from 'phd-common';

import { Observable } from 'rxjs';

@Component({
	selector: 'color-admin',
	templateUrl: './color-admin-page.component.html',
	styleUrls: ['./color-admin-page.component.scss']
})

export class ColorAdminPageComponent implements OnInit
{
	user;

	constructor(private _identityService: IdentityService) { }

	ngOnInit()
	{
		this._identityService.getRoles().subscribe(roles => {
			console.log("Roles: " + roles);
		});

		this._identityService.user.subscribe(user=>this.user=user);
	}
}

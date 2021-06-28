import { Component, OnInit } from '@angular/core';
import { Permission, Claims, ClaimTypes, IdentityService } from 'phd-common';

import { Observable } from 'rxjs';

@Component({
	selector: 'main.app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit
{
	constructor(private _identityService: IdentityService) { }

	ngOnInit()
	{
		this._identityService.getRoles().subscribe(roles => {
			console.log("Roles: " + roles);
		});
	}
}

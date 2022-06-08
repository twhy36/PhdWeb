import { Component, OnInit } from '@angular/core';
import { IdentityService, loadScript } from 'phd-common';

import { environment } from '../environments/environment';
import { default as build } from './build.json';

@Component({
	selector: 'div.app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit
{
	user;

	environment = environment;

	get branch(): string
	{
		return build.branch.split('/').slice(2).join('/');
	}

	get version(): string
	{
		return build.version;
	}

	constructor(private _idService: IdentityService)
	{
		loadScript(environment.whatFix.scriptUrl).subscribe();
	}

	ngOnInit()
	{
		this._idService.user.subscribe(user =>
		{
			this.user = user;
		});
	}
}

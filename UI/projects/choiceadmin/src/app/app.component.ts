import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { filter } from 'rxjs/operators';

import { loadScript } from 'phd-common';
import { environment } from '../environments/environment';
import { default as build } from './build.json';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent
{
	environment = environment;

	title = 'app';

	get branch(): string
	{
		return build.branch.split('/').slice(2).join('/');
	}

	get version(): string
	{
		return build.version;
	}

	constructor(private router: Router)
	{
		this.router.events.pipe(
			filter(evt => evt instanceof NavigationEnd)
		).subscribe(() =>
		{
			if (typeof (<any>window)._wfx_refresh === 'function')
			{
				(<any>window)._wfx_refresh();
			}
		});

		loadScript(environment.whatFix.scriptUrl).subscribe();
	}
}

import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterEvent } from '@angular/router';
import { IdentityService } from 'phd-common';
import { filter } from 'rxjs/operators';
import { ColorAdminService } from '../../services/color-admin.service';

@Component({
  selector: 'navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
	user;
	editingColor = false;
	currentRoute;

	constructor(
		private _identityService: IdentityService,
		private _colorAdminService: ColorAdminService,
		private router: Router
	)
	{
		this._colorAdminService.editingColor$.subscribe(isEditing => {
			//'changed after checked' error was occurring; detectChanges doesn't fix;
			//using setTimeout is one of the recommended fixes - https://angular.io/errors/NG0100
			setTimeout(() => {
				this.editingColor = isEditing;
			}, 0);
		});

		this.router.events.pipe(filter(event => event instanceof NavigationEnd))
		.subscribe((event: RouterEvent) => 
		{
			if (event.url.includes('optionpackage'))
			{
				this.currentRoute = 'optionpackage';
			}
			else if (event.url.includes('coloritem'))
			{
				this.currentRoute = 'coloritem';
			}
			else if (event.url.includes('color'))
			{
				this.currentRoute = 'color';
			}
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

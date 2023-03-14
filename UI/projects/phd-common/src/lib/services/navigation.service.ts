import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, pairwise } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class NavigationService
{

	private previousUrl: string;
	private currentUrl: string;

	constructor(private router: Router)
	{
		this.router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				pairwise()
			)
			.subscribe(([previousEvent, currentEvent]: [NavigationEnd, NavigationEnd]) =>
			{
				this.previousUrl = previousEvent.urlAfterRedirects;
				this.currentUrl = currentEvent.urlAfterRedirects;
			});
	}

	getPreviousUrl()
	{
		return this.previousUrl;
	}

	getCurrentUrl()
	{
		return this.currentUrl;
	}
}

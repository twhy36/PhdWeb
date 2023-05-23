import { Component } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
	selector: 'auto-open-menu',
	templateUrl: 'auto-open-menu.component.html',
	styleUrls: ['auto-open-menu.component.scss']
	})
export class AutoOpenMenuComponent
{
	menuTimeout: NodeJS.Timeout;

	mouseEnter(trigger: MatMenuTrigger)
	{
		if (this.menuTimeout)
		{
			clearTimeout(this.menuTimeout);
		}
		trigger.openMenu();
	}

	mouseLeave(trigger: MatMenuTrigger)
	{
		this.menuTimeout = setTimeout(() => 
		{
			trigger.closeMenu();
		}, 50);
	}
}
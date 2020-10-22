import { HostListener } from "@angular/core";
import { UnsubscribeOnDestroy } from "./unsubscribe-on-destroy";

export abstract class ComponentCanNavAway extends UnsubscribeOnDestroy
{
	abstract canNavAway(): boolean;

	@HostListener('window:beforeunload', ['$event'])
	unloadNotification($event: any)
	{
		if (!this.canNavAway())
		{
			$event.returnValue = "Navigating away will lose any unsaved work. Are you sure?";
		}
	}
}

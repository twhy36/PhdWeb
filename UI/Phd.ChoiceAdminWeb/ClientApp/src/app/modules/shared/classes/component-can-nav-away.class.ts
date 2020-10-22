import { HostListener } from "@angular/core";

export abstract class ComponentCanNavAway
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

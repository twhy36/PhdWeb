import { Component } from '@angular/core';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

@Component({
	selector: 'home',
    templateUrl: 'home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent extends UnsubscribeOnDestroy
{
	// Place holder data
	salesCommunityName: string = "FoxTail";
	planName: string = "Gardengate Plan";
	planImageUrl: string = "https://pultegroup.picturepark.com/Go/iZPIn4Vh/V/255142/15";

	constructor()
    {
        super();
    }

}
